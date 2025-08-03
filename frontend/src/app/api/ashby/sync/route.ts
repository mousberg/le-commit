// Ashby Sync API - Unified endpoint for Ashby integration
// GET: Fetch and cache candidates from Ashby
// POST: Push verification results to Ashby
// PUT: Batch sync completed verifications

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { AshbyCandidateListResponse, AshbyCandidate } from '@/lib/ashby/types';
import { createClient } from '@/lib/supabase/server';
import { withATSAuth } from '@/lib/auth/api-middleware';

// GET - Fetch and cache candidates from Ashby (replaces /candidates and /pull)
export async function GET(request: NextRequest) {
  try {
    // Check ATS authorization
    const authResult = await withATSAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const supabase = await createClient();

    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const cursor = url.searchParams.get('cursor') || undefined;

    console.log(`🔄 Syncing candidates from Ashby (force=${force}, limit=${limit})`);

    // Check if we should auto-sync
    const cachedResult = await supabase
      .from('ashby_candidates')
      .select('*')
      .eq('user_id', user.id)
      .order('ashby_created_at', { ascending: false, nullsFirst: false });

    if (cachedResult.error) {
      throw cachedResult.error;
    }

    const cachedCandidates = cachedResult.data || [];
    
    // Auto-sync conditions: force=true, no candidates, or last sync > 1 hour ago
    const shouldSync = force || cachedCandidates.length === 0 || 
      cachedCandidates.some(c => {
        const lastSync = new Date(c.last_synced_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return lastSync < oneHourAgo;
      });

    let syncResults = null;
    let candidates = cachedCandidates;

    if (shouldSync) {
      if (force) {
        syncResults = await refreshAllCandidates(user.id, supabase);
      } else {
        syncResults = await syncNewCandidates(user.id, supabase, limit, cursor);
      }
      
      // Refetch after sync
      const updatedResult = await supabase
        .from('ashby_candidates')
        .select('*')
        .eq('user_id', user.id)
        .order('ashby_created_at', { ascending: false, nullsFirst: false });
      
      if (!updatedResult.error) {
        candidates = updatedResult.data || [];
      }
    }

    // Transform for frontend
    const transformedCandidates = candidates.map(candidate => ({
      ashby_id: candidate.ashby_id,
      name: candidate.name,
      email: candidate.email,
      linkedin_url: candidate.linkedin_url,
      has_resume: candidate.has_resume,
      resume_url: candidate.resume_url,
      created_at: candidate.ashby_created_at,
      tags: candidate.tags || [],
      last_synced_at: candidate.last_synced_at
    }));

    return NextResponse.json({
      success: true,
      candidates: transformedCandidates,
      cached_count: candidates.length,
      auto_synced: !!syncResults,
      sync_results: syncResults,
      last_sync: candidates.length > 0 ? Math.max(...candidates.map(c => new Date(c.last_synced_at).getTime())) : null
    });

  } catch (error) {
    console.error('Error syncing Ashby candidates:', error);
    return NextResponse.json(
      { error: 'Failed to sync candidates', success: false },
      { status: 500 }
    );
  }
}

// POST - Push verification results to Ashby (existing functionality)
export async function POST(request: NextRequest) {
  try {
    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { applicantId, action } = body;

    if (!applicantId) {
      return NextResponse.json(
        { error: 'Applicant ID required', success: false },
        { status: 400 }
      );
    }

    // Get applicant data
    const applicantResult = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicantId)
      .single();

    if (applicantResult.error || !applicantResult.data) {
      return NextResponse.json(
        { error: 'Applicant not found', success: false },
        { status: 404 }
      );
    }

    const applicant = applicantResult.data;

    if (!applicant.ashby_candidate_id) {
      return NextResponse.json(
        { error: 'Applicant not linked to Ashby candidate', success: false },
        { status: 400 }
      );
    }

    // Initialize Ashby client
    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY
    });

    let result;

    switch (action) {
      case 'sync_results':
        result = await syncVerificationResults(ashbyClient, applicant);
        break;
      
      case 'sync_status':
        result = await syncVerificationStatus(ashbyClient, applicant);
        break;
      
      case 'sync_flags':
        result = await syncVerificationFlags(ashbyClient, applicant);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action', success: false },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Sync failed', success: false },
        { status: 500 }
      );
    }

    // Update sync status in database
    await supabase
      .from('applicants')
      .update({
        ashby_sync_status: 'synced',
        ashby_last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicantId);

    return NextResponse.json({
      success: true,
      message: 'Successfully synced to Ashby'
    });

  } catch (error) {
    console.error('Error syncing to Ashby:', error);
    return NextResponse.json(
      { error: 'Sync failed', success: false },
      { status: 500 }
    );
  }
}

interface Applicant {
  id: string;
  ashby_candidate_id: string;
  status: string;
  analysis_result?: {
    credibilityScore?: number;
    flags?: Array<{ type: string; message: string }>;
  };
}

async function syncVerificationResults(ashbyClient: AshbyClient, applicant: Applicant) {
  const analysisResult = applicant.analysis_result;
  
  if (!analysisResult) {
    return {
      success: false,
      error: { message: 'No analysis results to sync' }
    };
  }

  // Determine verification status
  let verificationStatus: 'verified' | 'flagged' | 'pending' = 'pending';
  
  if (applicant.status === 'completed') {
    const redFlags = analysisResult.flags?.filter((f) => f.type === 'red') || [];
    verificationStatus = redFlags.length > 0 ? 'flagged' : 'verified';
  }

  // Create report URL (you might want to generate a public link to the verification report)
  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/board/applicants?id=${applicant.id}`;

  return await ashbyClient.syncUnmaskResults(
    applicant.ashby_candidate_id,
    {
      credibilityScore: analysisResult.credibilityScore || 0,
      verificationStatus,
      flags: analysisResult.flags || [],
      reportUrl
    }
  );
}

async function syncVerificationStatus(ashbyClient: AshbyClient, applicant: Applicant) {
  // Map Unmask status to Ashby custom field
  const statusMapping: Record<string, string> = {
    'pending': 'Verification Pending',
    'processing': 'Verification In Progress',
    'analyzing': 'Analysis In Progress',
    'completed': 'Verification Complete',
    'failed': 'Verification Failed'
  };

  return await ashbyClient.updateCandidate({
    candidateId: applicant.ashby_candidate_id,
    customFields: {
      unmask_verification_status: statusMapping[applicant.status] || applicant.status,
      unmask_last_updated: new Date().toISOString()
    }
  });
}

async function syncVerificationFlags(ashbyClient: AshbyClient, applicant: Applicant) {
  const analysisResult = applicant.analysis_result;
  
  if (!analysisResult?.flags) {
    return {
      success: false,
      error: { message: 'No flags to sync' }
    };
  }

  // Categorize flags
  const redFlags = analysisResult.flags.filter((f) => f.type === 'red');
  const yellowFlags = analysisResult.flags.filter((f) => f.type === 'yellow');
  const greenFlags = analysisResult.flags.filter((f) => f.type === 'green');

  const tags: { add?: string[]; remove?: string[] } = { add: [], remove: [] };

  // Add appropriate tags
  if (redFlags.length > 0) {
    tags.add?.push('unmask-red-flags');
  } else {
    tags.remove?.push('unmask-red-flags');
  }

  if (yellowFlags.length > 0) {
    tags.add?.push('unmask-yellow-flags');
  } else {
    tags.remove?.push('unmask-yellow-flags');
  }

  if (greenFlags.length > 0) {
    tags.add?.push('unmask-verified-aspects');
  }

  return await ashbyClient.updateCandidate({
    candidateId: applicant.ashby_candidate_id,
    customFields: {
      unmask_red_flags: redFlags.length,
      unmask_yellow_flags: yellowFlags.length,
      unmask_green_flags: greenFlags.length,
      unmask_flag_summary: analysisResult.flags
        .map((f) => `${f.type.toUpperCase()}: ${f.message}`)
        .join('; ')
        .substring(0, 1000) // Limit length for Ashby field
    },
    tags
  });
}

// Batch sync endpoint
export async function PUT() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Get all completed applicants that need syncing to Ashby
    const applicantsResult = await supabase
      .from('applicants')
      .select('*')
      .eq('status', 'completed')
      .not('ashby_candidate_id', 'is', null)
      .neq('ashby_sync_status', 'synced');

    if (applicantsResult.error) {
      throw new Error(`Failed to fetch applicants: ${applicantsResult.error.message}`);
    }

    const applicants = applicantsResult.data || [];

    if (applicants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No applicants to sync',
        synced: 0
      });
    }

    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY!
    });

    // Batch sync results
    const batchResults = await ashbyClient.batchSyncCandidates(
      applicants.map(app => ({
        ashbyId: app.ashby_candidate_id,
        unmaskId: app.id,
        credibilityScore: app.analysis_result?.credibilityScore || 0,
        verificationStatus: determineVerificationStatus(app)
      }))
    );

    // Update sync status for successful syncs
    const successfulSyncs = batchResults.filter(r => r.success);
    
    if (successfulSyncs.length > 0) {
      await supabase
        .from('applicants')
        .update({
          ashby_sync_status: 'synced',
          ashby_last_synced_at: new Date().toISOString()
        })
        .in('ashby_candidate_id', successfulSyncs.map(s => s.ashbyId));
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${successfulSyncs.length} of ${applicants.length} applicants`,
      synced: successfulSyncs.length,
      errors: batchResults.filter(r => !r.success)
    });

  } catch (error) {
    console.error('Error in batch sync:', error);
    return NextResponse.json(
      { error: 'Batch sync failed', success: false },
      { status: 500 }
    );
  }
}

function determineVerificationStatus(applicant: Applicant): 'verified' | 'flagged' | 'pending' {
  if (applicant.status !== 'completed') {
    return 'pending';
  }

  const redFlags = applicant.analysis_result?.flags?.filter((f) => f.type === 'red') || [];
  return redFlags.length > 0 ? 'flagged' : 'verified';
}

// Helper functions for candidate syncing
async function syncNewCandidates(userId: string, supabase: Awaited<ReturnType<typeof createClient>>, limit: number, cursor?: string) {
  const ashbyClient = new AshbyClient({
    apiKey: process.env.ASHBY_API_KEY!
  });

  // Get existing candidate IDs to avoid duplicates
  const existingResult = await supabase
    .from('ashby_candidates')
    .select('ashby_id')
    .eq('user_id', userId);

  const existingIds = new Set(existingResult.data?.map((c: { ashby_id: string }) => c.ashby_id) || []);

  // Fetch recent candidates from Ashby
  const candidatesResponse = await ashbyClient.listCandidates({
    limit,
    cursor,
    includeArchived: false
  });

  if (!candidatesResponse.success) {
    throw new Error(`Failed to fetch candidates: ${candidatesResponse.error?.message}`);
  }

  const candidateListResponse = candidatesResponse.results as AshbyCandidateListResponse;
  const allCandidates = candidateListResponse?.results || [];
  
  const newCandidates = allCandidates.filter(c => !existingIds.has(c.id));

  if (newCandidates.length === 0) {
    return { new_candidates: 0, message: 'No new candidates found' };
  }

  // Process and cache new candidates
  const insertData = newCandidates.map(candidate => processCandidateForDB(candidate, userId));

  // Bulk insert new candidates
  const insertResult = await supabase
    .from('ashby_candidates')
    .insert(insertData);

  if (insertResult.error) {
    throw insertResult.error;
  }

  return {
    new_candidates: newCandidates.length,
    message: `Synced ${newCandidates.length} new candidates`
  };
}

async function refreshAllCandidates(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const ashbyClient = new AshbyClient({
    apiKey: process.env.ASHBY_API_KEY!
  });

  const allCandidates: AshbyCandidate[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  // Fetch all candidates with pagination
  while (hasMore) {
    const response = await ashbyClient.listCandidates({
      limit: 100,
      cursor,
      includeArchived: false
    });

    if (!response.success) {
      throw new Error(`Failed to fetch candidates: ${response.error?.message}`);
    }

    const candidateListResponse = response.results as AshbyCandidateListResponse;
    const candidates = candidateListResponse?.results || [];
    allCandidates.push(...candidates);

    cursor = candidateListResponse?.nextCursor;
    hasMore = candidateListResponse?.moreDataAvailable || false;
  }

  // Clear existing cache for this user
  await supabase
    .from('ashby_candidates')
    .delete()
    .eq('user_id', userId);

  // Process and insert all candidates
  const insertData = allCandidates.map(candidate => processCandidateForDB(candidate, userId));

  // Bulk insert all candidates
  const insertResult = await supabase
    .from('ashby_candidates')
    .insert(insertData);

  if (insertResult.error) {
    throw insertResult.error;
  }

  return {
    total_candidates: allCandidates.length,
    refreshed_at: new Date().toISOString(),
    message: `Refreshed ${allCandidates.length} candidates`
  };
}

function processCandidateForDB(candidate: AshbyCandidate, userId: string) {
  const resumeFileHandle = candidate.resumeFileHandle || null;
  const linkedinLink = candidate.socialLinks?.find((link: { type: string; url?: string }) => link.type === 'LinkedIn');
  const githubLink = candidate.socialLinks?.find((link: { type: string; url?: string }) => link.type === 'GitHub');
  const sourceTitle = candidate.source?.title || null;
  const creditedToName = candidate.creditedToUser 
    ? `${candidate.creditedToUser.firstName || ''} ${candidate.creditedToUser.lastName || ''}`.trim()
    : null;

  return {
    user_id: userId,
    ashby_id: candidate.id,
    name: candidate.name || 'Unknown',
    email: candidate.primaryEmailAddress?.value || candidate.emailAddresses?.[0]?.value,
    phone: candidate.primaryPhoneNumber?.value || candidate.phoneNumbers?.[0]?.value,
    position: candidate.position,
    company: candidate.company,
    school: candidate.school,
    location_summary: candidate.location?.locationSummary,
    linkedin_url: linkedinLink?.url,
    github_url: githubLink?.url,
    website_url: candidate.socialLinks?.find((link: { type: string; url?: string }) => link.type === 'Website')?.url,
    resume_file_handle: resumeFileHandle,
    has_resume: !!resumeFileHandle,
    source: candidate.source,
    source_title: sourceTitle,
    credited_to_user: candidate.creditedToUser,
    credited_to_name: creditedToName,
    ashby_created_at: candidate.createdAt,
    ashby_updated_at: candidate.updatedAt,
    emails: candidate.emailAddresses || [],
    phone_numbers: candidate.phoneNumbers || [],
    social_links: candidate.socialLinks || [],
    tags: candidate.tags || [],
    application_ids: candidate.applicationIds || [],
    all_file_handles: candidate.fileHandles || [],
    custom_fields: candidate.customFields || {},
    location_details: candidate.location,
    timezone: candidate.timezone,
    profile_url: candidate.profileUrl,
    last_synced_at: new Date().toISOString()
  };
}