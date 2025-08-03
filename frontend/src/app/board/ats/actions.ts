'use server';

import { createClient } from '@/lib/supabase/server';
import { isAuthorizedForATS } from '@/lib/auth/ats-access';
import { revalidatePath } from 'next/cache';
import { 
  importAshbyCandidateToApplicants,
  bulkImportAshbyCandidates,
  getUnimportedAshbyCandidates 
} from '@/lib/services/ashby-applicant-mapper';

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

    // Get auth token for API call
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    // Call the consolidated sync endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ashby/sync?force=true`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
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

    // Get auth token for API call
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    // Call the consolidated sync endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ashby/sync`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
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

    // Get Ashby candidate
    const { data: ashbyCandidate, error: fetchError } = await supabase
      .from('ashby_candidates')
      .select('*')
      .eq('ashby_id', ashbyId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !ashbyCandidate) {
      return { success: false, error: 'Ashby candidate not found' };
    }

    // Import to applicants table
    const result = await importAshbyCandidateToApplicants(ashbyCandidate, user.id, {
      updateExisting: true,
      skipIfExists: false
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Revalidate the page to show updated data
    revalidatePath('/board/ats');
    revalidatePath('/board/dashboard');
    
    return { 
      success: true, 
      applicantId: result.applicantId 
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

    // Bulk import candidates
    const result = await bulkImportAshbyCandidates(ashbyIds, user.id, {
      updateExisting: true,
      skipIfExists: false
    });

    // Revalidate the page to show updated data
    revalidatePath('/board/ats');
    revalidatePath('/board/dashboard');
    
    return { 
      success: result.success, 
      summary: result.summary,
      error: result.success ? undefined : 'Bulk import failed'
    };
  } catch (error) {
    console.error('Bulk import error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Bulk import failed' 
    };
  }
}

// Server action to get unimported Ashby candidates
export async function getUnimportedCandidates() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    if (!isAuthorizedForATS(user.email)) {
      return { success: false, error: 'Access denied' };
    }

    const candidates = await getUnimportedAshbyCandidates(user.id);
    
    return { 
      success: true, 
      candidates 
    };
  } catch (error) {
    console.error('Get unimported candidates error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch candidates' 
    };
  }
} 