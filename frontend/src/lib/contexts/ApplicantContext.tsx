'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Applicant, CreateApplicantRequest } from '@/lib/interfaces/applicant';

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
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/applicants');
      const data = await response.json();

      if (data.success) {
        setApplicants(data.applicants);
      } else {
        setError(data.error || 'Failed to fetch applicants');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectApplicant = useCallback(async (id: string | null) => {
    if (!id) {
      setSelectedApplicant(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/applicants/${id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedApplicant(data.applicant);
      } else {
        setError(data.error || 'Failed to fetch applicant');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createApplicant = useCallback(async (request: CreateApplicantRequest): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('cvFile', request.cvFile);

      if (request.linkedinFile) {
        formData.append('linkedinFile', request.linkedinFile);
      }

      if (request.githubUrl) {
        // Send GitHub URL as a string
        formData.append('githubUrl', request.githubUrl);
      }

      const response = await fetch('/api/applicants', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Add the new applicant to local state immediately for optimistic UI
        setApplicants(prev => [data.applicant, ...prev]);

        // Return the ID immediately - don't wait for full refresh
        return data.applicant.id;
      } else {
        setError(data.error || 'Failed to create applicant');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshApplicant = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/applicants/${id}`);
      const data = await response.json();

      if (data.success) {
        // Update in list
        setApplicants(prev => prev.map(a =>
          a.id === id ? data.applicant : a
        ));

        // Update selected if it matches
        if (selectedApplicant?.id === id) {
          setSelectedApplicant(data.applicant);
        }
      }
    } catch (err) {
      console.error('Failed to refresh applicant:', err);
    }
  }, [selectedApplicant]);

  const deleteApplicant = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/applicants/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setApplicants(prev => prev.filter(a => a.id !== id));
        if (selectedApplicant?.id === id) {
          setSelectedApplicant(null);
        }
      } else {
        setError(data.error || 'Failed to delete applicant');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedApplicant]);

  return (
    <ApplicantContext.Provider value={{
      applicants,
      selectedApplicant,
      isLoading,
      error,
      fetchApplicants,
      selectApplicant,
      createApplicant,
      refreshApplicant,
      deleteApplicant
    }}>
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
