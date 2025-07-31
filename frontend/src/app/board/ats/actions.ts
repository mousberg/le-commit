'use server';

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

    // Call the existing API endpoint for now (can be refactored later)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ashby/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();
    
    if (result.success) {
      // Revalidate the page to show updated data
      revalidatePath('/board/ats');
      return { success: true, data: result };
    } else {
      return { success: false, error: result.error || 'Failed to refresh candidates' };
    }
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

    // Call the existing API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ashby/candidates`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();
    
    if (result.success) {
      // Revalidate the page to show updated data
      revalidatePath('/board/ats');
      return { success: true, data: result };
    } else {
      return { success: false, error: result.error || 'Failed to sync candidates' };
    }
  } catch (error) {
    console.error('Server action error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
}

// Server action to process a candidate (future feature)
export async function processCandidate(ashbyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    if (!isAuthorizedForATS(user.email)) {
      return { success: false, error: 'Access denied' };
    }

    // TODO: Implement candidate processing logic
    console.log('Processing candidate:', ashbyId);
    
    // Revalidate the page to show updated data
    revalidatePath('/board/ats');
    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
} 