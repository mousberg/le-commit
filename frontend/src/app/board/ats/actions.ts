'use server';

import { createClient } from '@/lib/supabase/server';
import { getAshbyApiKey, isAshbyConfigured } from '@/lib/ashby/config';
import { AshbyClient } from '@/lib/ashby/client';
import { ATSPageData } from '@/lib/ashby/interfaces';
import { AnalysisResult } from '@/lib/interfaces/analysis';
import { revalidatePath } from 'next/cache';

// Fetch candidates from cache with auto-sync if empty
export async function fetchCandidatesServer(userId: string): Promise<ATSPageData> {
  try {
    const supabase = await createClient();
    
    // Get Ashby candidates with their linked applicant data (if any)
    const ashbyCandidatesResult = await supabase
      .from('ashby_candidates')
      .select(`
        *,
        applicant:unmask_applicant_id (
          *
        )
      `)
      .eq('user_id', userId)
      .order('ashby_updated_at', { ascending: false });

    if (ashbyCandidatesResult.error) {
      console.error('Database error:', ashbyCandidatesResult.error);
      throw new Error('Failed to fetch Ashby candidates');
    }

    const ashbyCandidates = ashbyCandidatesResult.data || [];
    
    console.log(`Found ${ashbyCandidates.length} existing Ashby candidates for user ${userId}`);
    
    // If no candidates found, trigger initial sync from Ashby
    let autoSyncTriggered = false;
    let syncResults = undefined;
    
    if (ashbyCandidates.length === 0) {
      try {
        console.log('No Ashby candidates found, triggering initial sync...');
        
        // Get user data for API key
        const { data: userData } = await supabase
          .from('users')
          .select('ashby_api_key')
          .eq('id', userId)
          .single();

        console.log('User data:', { 
          hasUser: !!userData, 
          hasApiKey: !!userData?.ashby_api_key,
          apiKeyLength: userData?.ashby_api_key?.length || 0
        });

        const apiKey = getAshbyApiKey(userData?.ashby_api_key);
        const isConfigured = isAshbyConfigured(userData?.ashby_api_key);
        
        console.log('API key validation:', { 
          hasApiKey: !!apiKey, 
          isConfigured,
          isDev: process.env.NODE_ENV === 'development',
          hasEnvKey: !!process.env.ASHBY_API_KEY
        });
        
        if (isConfigured && apiKey) {
          console.log('Triggering direct Ashby sync...');
          
          const ashbyClient = new AshbyClient({ apiKey });
          
          // Fetch candidates from Ashby
          const candidatesResponse = await ashbyClient.listCandidates({ limit: 100 });
          
          console.log('Ashby API response:', JSON.stringify({
            success: candidatesResponse.success,
            hasResults: !!candidatesResponse.results,
            candidateCount: candidatesResponse.results?.candidates?.length || 0,
            error: candidatesResponse.error
          }, null, 2));
          
          if (candidatesResponse.success) {
            const candidates = candidatesResponse.results?.candidates || [];
            let syncedCount = 0;
            
            console.log(`Processing ${candidates.length} candidates from Ashby...`);
            
            // If API returns 0 candidates, don't enter the loop and mark as synced
            if (candidates.length === 0) {
              autoSyncTriggered = true;
              syncResults = {
                new_candidates: 0,
                message: 'No candidates found in Ashby - sync completed'
              };
            } else {
              // Process and store candidates
              for (const candidate of candidates) {
              try {
                const linkedinUrl = candidate.socialLinks?.find(link => 
                  link.type === 'LinkedIn' || link.url?.includes('linkedin.com')
                )?.url;
                
                const githubUrl = candidate.socialLinks?.find(link => 
                  link.type === 'GitHub' || link.url?.includes('github.com')
                )?.url;

                // Upsert candidate
                const { error: upsertError } = await supabase
                  .from('ashby_candidates')
                  .upsert({
                    user_id: userId,
                    ashby_id: candidate.id,
                    name: candidate.name || 'Unknown',
                    email: candidate.primaryEmailAddress?.value || null,
                    phone: candidate.primaryPhoneNumber?.value || null,
                    linkedin_url: linkedinUrl || null,
                    github_url: githubUrl || null,
                    resume_file_handle: candidate.resumeFileHandle || null,
                    ashby_created_at: candidate.createdAt ? new Date(candidate.createdAt).toISOString() : null,
                    ashby_updated_at: candidate.updatedAt ? new Date(candidate.updatedAt).toISOString() : null,
                    emails: candidate.emailAddresses || [],
                    phone_numbers: candidate.phoneNumbers || [],
                    social_links: candidate.socialLinks || [],
                    tags: candidate.tags || [],
                    source: candidate.source || null,
                    source_title: candidate.source?.title || null,
                    last_synced_at: new Date().toISOString()
                  }, {
                    onConflict: 'unique_user_ashby_candidate',
                    ignoreDuplicates: false
                  });

                if (upsertError) {
                  console.error(`Error upserting candidate ${candidate.id}:`, upsertError);
                } else {
                  console.log(`Successfully synced candidate ${candidate.id}: ${candidate.name}`);
                  syncedCount++;
                }
              } catch (error) {
                console.error(`Error syncing candidate ${candidate.id}:`, error);
              }
            }
            
            autoSyncTriggered = true;
            syncResults = {
              new_candidates: syncedCount,
              message: `Successfully synced ${syncedCount} candidates from Ashby`
            };
            
            console.log(`Sync completed: ${syncedCount} candidates synced`);
            
            // Refetch candidates after sync
            const refreshedResult = await supabase
              .from('ashby_candidates')
              .select(`
                *,
                applicant:unmask_applicant_id (
                  *
                )
              `)
              .eq('user_id', userId)
              .order('ashby_updated_at', { ascending: false });
              
            console.log('Refetch result:', {
              error: refreshedResult.error,
              count: refreshedResult.data?.length || 0
            });
              
            if (refreshedResult.data) {
              ashbyCandidates.push(...refreshedResult.data);
              console.log(`Total candidates after refetch: ${ashbyCandidates.length}`);
            }
            }
          } else {
            console.error('Failed to fetch candidates from Ashby:', candidatesResponse.error);
          }
        } else {
          console.log('Ashby API key not configured, skipping sync');
          syncResults = {
            new_candidates: 0,
            message: 'Ashby API key not configured - please add it in settings'
          };
        }
      } catch (error) {
        console.error('Error triggering Ashby sync:', error);
      }
    }
    
    // Transform Ashby candidates data for frontend 
    const processedCandidates = ashbyCandidates
      .filter(candidate => {
        // Safety check: if applicant exists, ensure it's from Ashby source
        const applicant = candidate.applicant;
        return !applicant || applicant.source === 'ashby';
      })
      .map(candidate => {
        const applicant = candidate.applicant;
        
        // Parse analysis data from GPT processing (if applicant exists and has been processed)
        const analysisData = applicant?.ai_data as AnalysisResult | null;
        const hasAnalysis = !!analysisData;
      
      return {
        ashby_id: candidate.ashby_id,
        name: candidate.name,
        email: candidate.email,
        linkedin_url: candidate.linkedin_url,
        has_resume: !!candidate.resume_file_handle,
        resume_url: undefined, // TODO: Generate download URL from file handle
        created_at: candidate.ashby_created_at || candidate.cached_at,
        tags: [
          'imported',
          ...(hasAnalysis ? ['analyzed'] : ['pending_analysis']),
          ...(analysisData?.sources?.some(s => s.type === 'cv' && s.available) ? ['cv_analyzed'] : []),
          ...(analysisData?.sources?.some(s => s.type === 'linkedin' && s.available) ? ['linkedin'] : []),
          ...(analysisData?.sources?.some(s => s.type === 'github' && s.available) ? ['github'] : []),
          ...(candidate.tags || [])
        ],
        unmask_applicant_id: applicant?.id || undefined,
        unmask_status: applicant?.status || 'not_created',
        action: (applicant ? 'created' : 'not_created') as 'created' | 'not_created',
        ready_for_processing: !applicant, // Ready if not yet imported
        fraud_likelihood: analysisData ? determineFraudLikelihood(analysisData) : undefined,
        fraud_reason: analysisData ? getFraudReason(analysisData) : undefined,
        analysis: analysisData || undefined,
        processed: hasAnalysis,
        phone_number: candidate.phone,
      };
    });

    const result = {
      candidates: processedCandidates,
      cached_count: processedCandidates.length,
      auto_synced: autoSyncTriggered,
      sync_results: syncResults,
      last_sync: ashbyCandidates.length > 0 ? Math.max(...ashbyCandidates.map(c => new Date(c.last_synced_at).getTime())) : null
    };

    console.log('fetchCandidatesServer returning:', {
      candidatesCount: result.candidates.length,
      cachedCount: result.cached_count,
      autoSynced: result.auto_synced,
      syncResults: result.sync_results,
      lastSync: result.last_sync
    });

    return result;
  } catch (error) {
    console.error('Error in fetchCandidatesServer:', error);
    // Return empty data if server-side fetching fails
    return {
      candidates: [],
      cached_count: 0,
      auto_synced: false,
      last_sync: null
    };
  }
}

// Helper functions
function determineFraudLikelihood(analysis: AnalysisResult): 'low' | 'medium' | 'high' {
  const redFlags = analysis.flags?.filter((f) => f.type === 'red') || [];
  const yellowFlags = analysis.flags?.filter((f) => f.type === 'yellow') || [];
  
  if (redFlags.length >= 2) return 'high';
  if (redFlags.length === 1 || yellowFlags.length >= 3) return 'medium';
  return 'low';
}

function getFraudReason(analysis: AnalysisResult): string {
  const redFlags = analysis.flags?.filter((f) => f.type === 'red') || [];
  const yellowFlags = analysis.flags?.filter((f) => f.type === 'yellow') || [];
  
  if (redFlags.length > 0) {
    return `Red flags: ${redFlags.map(f => f.message).join(', ')}`;
  }
  if (yellowFlags.length > 0) {
    return `Yellow flags: ${yellowFlags.map(f => f.message).join(', ')}`;
  }
  return 'No significant concerns detected';
}

// Server action to refresh all candidates from Ashby
export async function refreshCandidates(): Promise<{ success: boolean; data?: ATSPageData; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if Ashby is configured
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', user.id)
      .single();

    if (!isAshbyConfigured(userData?.ashby_api_key)) {
      return { success: false, error: 'Ashby API key not configured' };
    }

    const data = await fetchCandidatesServer(user.id);
    revalidatePath('/board/ats');
    
    return { success: true, data };
  } catch (error) {
    console.error('Server action error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
}

// Server action to auto-sync new candidates (same as refresh for now)
export async function autoSyncCandidates(): Promise<{ success: boolean; data?: ATSPageData; error?: string }> {
  return refreshCandidates();
}