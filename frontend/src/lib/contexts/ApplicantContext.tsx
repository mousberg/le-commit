'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Applicant, CreateApplicantRequest } from '@/lib/interfaces/applicant';
import { simpleDatabaseService } from '@/lib/services/database';

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
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      
      if (request.cvFile) {
        formData.append('cvFile', request.cvFile);
      }
      
      if (request.linkedinUrl) {
        formData.append('linkedinUrl', request.linkedinUrl);
      }
      
      if (request.githubUrl) {
        formData.append('githubUrl', request.githubUrl);
      }

      const response = await fetch('/api/applicants', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create applicant');
      }

      const { applicant } = await response.json();
      
      // Add to local state
      setApplicants(prev => [applicant, ...prev]);
      
      return applicant.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create applicant';
      setError(errorMessage);
      console.error('Error creating applicant:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshApplicant = useCallback(async (id: string) => {
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
    try {
      setError(null);
      await simpleDatabaseService.deleteApplicant(id);
      
      setApplicants(prev => prev.filter(applicant => applicant.id !== id));
      
      if (selectedApplicant?.id === id) {
        setSelectedApplicant(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete applicant';
      setError(errorMessage);
      console.error('Error deleting applicant:', err);
      throw err;
    }
  }, [selectedApplicant?.id]);

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