/**
 * ApplicantContext - Manages manual applicant uploads and processing
 * 
 * Updated: August 23, 2025 - Henry Allen
 * - Added automatic processing for manual uploads (replaces database triggers)
 * - Manual uploads now trigger CV/LinkedIn/GitHub/AI processing directly
 * - Separated from ATS candidate processing flow
 */
'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Applicant, CreateApplicantRequest } from '@/lib/interfaces/applicant';
import { simpleDatabaseService } from '@/lib/services/database';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';

interface ApplicantContextType {
  applicants: Applicant[];
  selectedApplicant: Applicant | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchApplicants: () => Promise<void>;
  selectApplicant: (id: string | null) => Promise<void>;
  createApplicant: (request: CreateApplicantRequest) => Promise<string | null>;
  refreshApplicant: (id: string) => Promise<void>;
  deleteApplicant: (id: string) => Promise<void>;
}

const ApplicantContext = createContext<ApplicantContextType | undefined>(undefined);

export function ApplicantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription to applicants table
  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    // Subscribe to applicants table changes for current user
    const channel = supabase
      .channel('applicants-realtime')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'applicants',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {

        if (payload.eventType === 'INSERT') {
          const newApplicant = payload.new as Applicant;
          setApplicants(prev => {
            // Avoid duplicates
            if (prev.some(app => app.id === newApplicant.id)) return prev;
            return [newApplicant, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedApplicant = payload.new as Applicant;
          setApplicants(prev => prev.map(app =>
            app.id === updatedApplicant.id ? updatedApplicant : app
          ));
          // Update selected applicant if it's the one being updated
          if (selectedApplicant?.id === updatedApplicant.id) {
            setSelectedApplicant(updatedApplicant);
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setApplicants(prev => prev.filter(app => app.id !== deletedId));
          if (selectedApplicant?.id === deletedId) {
            setSelectedApplicant(null);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedApplicant?.id]);

  const fetchApplicants = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const applicants = await simpleDatabaseService.listUserApplicants();
      setApplicants(applicants || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applicants';
      setError(errorMessage);
      console.error('Error fetching applicants:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectApplicant = useCallback(async (id: string | null) => {
    if (!id) {
      setSelectedApplicant(null);
      return;
    }

    try {
      setError(null);
      const applicant = await simpleDatabaseService.getApplicant(id);
      setSelectedApplicant(applicant);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select applicant';
      setError(errorMessage);
      console.error('Error selecting applicant:', err);
    }
  }, []);

  const createApplicant = useCallback(async (request: CreateApplicantRequest): Promise<string | null> => {
    if (!user?.id) {
      setError('User must be authenticated');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      let cv_file_id: string | null = null;

      // Handle CV file upload if provided
      if (request.cvFile) {
        console.log(`📁 Uploading CV file for user ${user.id}`);

        // Upload file to Supabase Storage
        const storagePath = `${user.id}/${Date.now()}_${request.cvFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('candidate-cvs')
          .upload(storagePath, request.cvFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        // Create file record
        const { data: fileRecord, error: fileError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            file_type: 'cv',
            original_filename: request.cvFile.name,
            storage_path: storagePath,
            storage_bucket: 'candidate-cvs',
            file_size: request.cvFile.size,
            mime_type: request.cvFile.type
          })
          .select()
          .single();

        if (fileError) {
          // Clean up uploaded file if database insert fails
          await supabase.storage.from('candidate-cvs').remove([storagePath]);
          throw new Error(`Failed to create file record: ${fileError.message}`);
        }

        cv_file_id = fileRecord.id;
      }

      // Create applicant record - triggers will handle automatic processing
      console.log(`👤 Creating applicant record for user ${user.id}`);
      const { data: applicant, error: applicantError } = await supabase
        .from('applicants')
        .insert({
          user_id: user.id,
          name: 'Processing...',
          email: null,
          phone: null,
          linkedin_url: request.linkedinUrl || null,
          github_url: request.githubUrl || null,
          cv_file_id,
          // Status columns will be set based on what data we have
          cv_status: cv_file_id ? 'pending' : 'ready',
          li_status: request.linkedinUrl ? 'pending' : 'not_provided',
          gh_status: request.githubUrl ? 'pending' : 'not_provided',
          ai_status: 'pending'
          // Note: status is now a generated column - automatically derived from sub-statuses
        })
        .select()
        .single();

      if (applicantError) {
        // Clean up file if applicant creation fails
        if (cv_file_id) {
          await supabase.from('files').delete().eq('id', cv_file_id);
          if (request.cvFile) {
            const storagePath = `${user.id}/${Date.now()}_${request.cvFile.name}`;
            await supabase.storage.from('candidate-cvs').remove([storagePath]);
          }
        }
        throw new Error(`Failed to create applicant: ${applicantError.message}`);
      }

      console.log(`✅ Created applicant ${applicant.id} - real-time will handle UI updates`);

      // Automatically start processing for manual uploads
      // Note: This replaces database triggers that were causing net.http_post errors
      // Manual uploads now trigger processing directly in the client context
      // ATS candidates use separate manual "Process Selected" flow
      if (cv_file_id || request.linkedinUrl || request.githubUrl) {
        console.log(`🚀 Starting automatic processing for applicant ${applicant.id}`);
        
        // Start CV processing if we have a CV
        if (cv_file_id) {
          fetch('/api/cv-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicant_id: applicant.id,
              file_id: cv_file_id
            })
          }).then(response => {
            if (response.ok) {
              console.log(`✅ CV processing started for ${applicant.id}`);
            } else {
              console.error(`❌ CV processing failed for ${applicant.id}`);
            }
          }).catch(error => {
            console.error(`❌ CV processing error for ${applicant.id}:`, error);
          });
        }
        
        // Start LinkedIn processing if we have LinkedIn URL
        if (request.linkedinUrl) {
          fetch('/api/linkedin-fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicant_id: applicant.id,
              linkedin_url: request.linkedinUrl
            })
          }).then(response => {
            if (response.ok) {
              console.log(`✅ LinkedIn processing started for ${applicant.id}`);
            } else {
              console.error(`❌ LinkedIn processing failed for ${applicant.id}`);
            }
          }).catch(error => {
            console.error(`❌ LinkedIn processing error for ${applicant.id}:`, error);
          });
        }
        
        // Start GitHub processing if we have GitHub URL
        if (request.githubUrl) {
          fetch('/api/github-fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicant_id: applicant.id,
              github_url: request.githubUrl
            })
          }).then(response => {
            if (response.ok) {
              console.log(`✅ GitHub processing started for ${applicant.id}`);
            } else {
              console.error(`❌ GitHub processing failed for ${applicant.id}`);
            }
          }).catch(error => {
            console.error(`❌ GitHub processing error for ${applicant.id}:`, error);
          });
        }
        
        // Start AI analysis after a delay to let other processing complete
        setTimeout(() => {
          fetch('/api/analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicant_id: applicant.id
            })
          }).then(response => {
            if (response.ok) {
              console.log(`✅ AI analysis started for ${applicant.id}`);
            } else {
              console.error(`❌ AI analysis failed for ${applicant.id}`);
            }
          }).catch(error => {
            console.error(`❌ AI analysis error for ${applicant.id}:`, error);
          });
        }, 3000); // Wait 3 seconds for other processing to complete
      }

      // Don't manually update state - real-time subscription will handle it
      return applicant.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create applicant';
      setError(errorMessage);
      console.error('Error creating applicant:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const refreshApplicant = useCallback(async (id: string) => {
    // Note: With real-time subscriptions, manual refresh is rarely needed
    // This method is kept for compatibility but real-time updates handle most cases
    try {
      setError(null);
      const updatedApplicant = await simpleDatabaseService.getApplicant(id);

      if (updatedApplicant) {
        setApplicants(prev =>
          prev.map(applicant =>
            applicant.id === id ? updatedApplicant : applicant
          )
        );

        if (selectedApplicant?.id === id) {
          setSelectedApplicant(updatedApplicant);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh applicant';
      setError(errorMessage);
      console.error('Error refreshing applicant:', err);
    }
  }, [selectedApplicant?.id]);

  const deleteApplicant = useCallback(async (id: string) => {
    if (!user?.id) {
      setError('User must be authenticated');
      return;
    }

    try {
      setError(null);
      const supabase = createClient();

      // Delete from database - real-time subscription will handle UI updates
      const { error } = await supabase
        .from('applicants')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own applicants

      if (error) {
        throw new Error(`Failed to delete applicant: ${error.message}`);
      }

      // Real-time subscription will handle state updates automatically
      console.log(`🗑️ Deleted applicant ${id} - real-time will handle UI updates`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete applicant';
      setError(errorMessage);
      console.error('Error deleting applicant:', err);
      throw err;
    }
  }, [user?.id]);

  const contextValue: ApplicantContextType = {
    applicants,
    selectedApplicant,
    isLoading,
    error,
    fetchApplicants,
    selectApplicant,
    createApplicant,
    refreshApplicant,
    deleteApplicant,
  };

  return (
    <ApplicantContext.Provider value={contextValue}>
      {children}
    </ApplicantContext.Provider>
  );
}

export function useApplicants() {
  const context = useContext(ApplicantContext);
  if (context === undefined) {
    throw new Error('useApplicants must be used within an ApplicantProvider');
  }
  return context;
}
