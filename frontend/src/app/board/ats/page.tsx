// Remove 'use client' - this becomes a server component
import { createClient } from '@/lib/supabase/server';
import { isAuthorizedForATS } from '@/lib/auth/ats-access';
import { ATSPageContent } from './ATSPageContent';
import { redirect } from 'next/navigation';

// Mark as dynamic since we use authentication
export const dynamic = 'force-dynamic';

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

// Server component that handles everything server-side
export default async function ATSPage() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Handle unauthenticated users - redirect instead of showing loading
    if (authError || !user) {
      redirect('/login');
    }

    // Check authorization - redirect instead of showing loading
    if (!isAuthorizedForATS(user.email)) {
      redirect('/board/dashboard');
    }

    // Fetch data on server - no loading states needed
    const candidatesData = await fetchCandidatesServer(user.id);

    // Return content immediately - no loading screens
    return <ATSPageContent initialData={candidatesData} user={user} />;
  } catch (error) {
    console.error('Error in ATSPage server component:', error);
    // Fallback to client-side rendering if server-side fails
    return <ATSPageContent initialData={{
      candidates: [],
      cached_count: 0,
      auto_synced: false,
      last_sync: null
    }} user={{ id: '', email: '' }} />;
  }
}

// Server-side data fetching - happens before page renders
async function fetchCandidatesServer(userId: string): Promise<ATSPageData> {
  try {
    const supabase = await createClient();
    
    // Get cached candidates
    const cachedResult = await supabase
      .from('ashby_candidates')
      .select('*')
      .eq('user_id', userId)
      .order('ashby_created_at', { ascending: false, nullsFirst: false });

    if (cachedResult.error) {
      console.error('Database error:', cachedResult.error);
      throw new Error('Failed to fetch candidates');
    }

    const candidates = cachedResult.data || [];
    
    // Transform data for frontend
    return {
      candidates: candidates.map(candidate => ({
        ashby_id: candidate.ashby_id,
        name: candidate.name,
        email: candidate.email,
        linkedin_url: candidate.linkedin_url,
        has_resume: candidate.has_resume,
        resume_url: candidate.resume_url,
        created_at: candidate.ashby_created_at,
        tags: candidate.tags || [],
        unmask_applicant_id: candidate.unmask_applicant_id,
        unmask_status: candidate.unmask_applicant_id ? 'linked' : 'not_linked',
        action: candidate.unmask_applicant_id ? 'existing' : 'not_created',
        ready_for_processing: !!(candidate.linkedin_url || candidate.has_resume),
        fraud_likelihood: candidate.fraud_likelihood,
        fraud_reason: candidate.fraud_reason,
      })),
      cached_count: candidates.length,
      auto_synced: false, // Will be handled client-side if needed
      last_sync: candidates.length > 0 ? Math.max(...candidates.map(c => new Date(c.last_synced_at).getTime())) : null
    };
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