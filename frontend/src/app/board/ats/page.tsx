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
  analysis?: any; // GPT analysis data
  processed?: boolean; // Whether GPT analysis is complete
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
  availableForImport?: number;
  importedCount?: number;
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
    
    // Get applicants that were imported from Ashby - with their processed analysis data
    const applicantsResult = await supabase
      .from('applicants')
      .select('*')
      .eq('user_id', userId)
      .not('ashby_candidate_id', 'is', null)
      .order('created_at', { ascending: false });

    if (applicantsResult.error) {
      console.error('Database error:', applicantsResult.error);
      throw new Error('Failed to fetch applicants');
    }

    const applicants = applicantsResult.data || [];
    
    // Transform applicants data for frontend (show processed GPT analysis data)
    const processedCandidates = applicants.map(applicant => {
      // Parse analysis data from GPT processing
      const analysisData = applicant.analysis as any;
      const hasAnalysis = !!analysisData;
      
      return {
        ashby_id: applicant.ashby_candidate_id || '',
        name: applicant.name,
        email: applicant.email,
        linkedin_url: applicant.linkedin_url,
        has_resume: false, // Will be determined by files table query
        resume_url: null,
        cv_storage_path: null,
        created_at: applicant.created_at,
        tags: [
          'imported',
          ...(hasAnalysis ? ['analyzed'] : ['pending_analysis']),
          ...(analysisData?.cvData ? ['cv_analyzed'] : []),
          ...(analysisData?.linkedInData ? ['linkedin'] : []),
          ...(analysisData?.gitHubData ? ['github'] : [])
        ],
        unmask_applicant_id: applicant.id,
        unmask_status: applicant.status,
        action: 'created' as const,
        ready_for_processing: true,
        fraud_likelihood: analysisData?.riskAssessment?.riskLevel?.toLowerCase() as 'low' | 'medium' | 'high' | undefined,
        fraud_reason: analysisData?.riskAssessment?.explanation,
        analysis: analysisData, // Include full analysis data
        processed: hasAnalysis,
        phone_number: applicant.phone,
        ashby_sync_status: applicant.ashby_sync_status || 'pending',
        ashby_last_synced_at: applicant.ashby_last_synced_at || null
      };
    });

    return {
      candidates: processedCandidates,
      cached_count: processedCandidates.length,
      auto_synced: false,
      last_sync: applicants.length > 0 ? Math.max(...applicants.map(a => new Date(a.created_at).getTime())) : null
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