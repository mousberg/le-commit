'use server';

// ATS Actions - DISABLED FOR NEW ARCHITECTURE
// TODO: Re-implement ATS integration with new event-driven architecture

/* eslint-disable @typescript-eslint/no-unused-vars */
import { createClient } from '@/lib/supabase/server';
import { isAuthorizedForATS } from '@/lib/auth/ats-access';
import { revalidatePath } from 'next/cache';

interface ATSCandidate {
  ashby_id: string;
  name: string;
  email: string;
  linkedin_url?: string;
  has_resume: boolean;
  resume_url?: string;
  created_at: string;
  tags: string[];
  unmask_applicant_id?: string;
  unmask_status?: string;
  action: 'existing' | 'created' | 'not_created' | 'error';
  ready_for_processing?: boolean;
  fraud_likelihood?: 'low' | 'medium' | 'high';
  fraud_reason?: string;
}

interface ATSPageData {
  candidates: ATSCandidate[];
  cached_count: number;
  auto_synced: boolean;
  sync_results?: {
    new_candidates?: number;
    message?: string;
  };
  last_sync: number | null;
}

// Server action to refresh all candidates from Ashby
export async function refreshCandidates(): Promise<{ success: boolean; data?: ATSPageData; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    if (!isAuthorizedForATS(user.email)) {
      return { success: false, error: 'Access denied' };
    }

    return { 
      success: false, 
      error: 'ATS integration disabled - TODO: Re-implement with new architecture' 
    };
  } catch (error) {
    console.error('Server action error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
}

// Server action to auto-sync new candidates
export async function autoSyncCandidates(): Promise<{ success: boolean; data?: ATSPageData; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    if (!isAuthorizedForATS(user.email)) {
      return { success: false, error: 'Access denied' };
    }

    return { 
      success: false, 
      error: 'ATS integration disabled - TODO: Re-implement with new architecture' 
    };
  } catch (error) {
    console.error('Server action error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
}

// Server action to import Ashby candidates to applicants table
export async function importAshbyCandidate(ashbyId: string): Promise<{ success: boolean; applicantId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    if (!isAuthorizedForATS(user.email)) {
      return { success: false, error: 'Access denied' };
    }

    return { 
      success: false, 
      error: 'ATS integration disabled - TODO: Re-implement with new architecture' 
    };
  } catch (error) {
    console.error('Import candidate error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Import failed' 
    };
  }
}

// Server action to bulk import multiple Ashby candidates
export async function importAshbyCandidates(ashbyIds: string[]): Promise<{ 
  success: boolean; 
  summary?: { created: number; updated: number; skipped: number; errors: number };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    if (!isAuthorizedForATS(user.email)) {
      return { success: false, error: 'Access denied' };
    }

    return { 
      success: false, 
      error: 'ATS integration disabled - TODO: Re-implement with new architecture' 
    };
  } catch (error) {
    console.error('Bulk import error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Bulk import failed' 
    };
  }
}