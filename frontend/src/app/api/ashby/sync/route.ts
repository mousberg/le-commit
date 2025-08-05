
import { NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { getAshbyApiKey, isAshbyConfigured } from '@/lib/ashby/config';

// GET - Sync candidates FROM Ashby TO our system (used by cron)
async function syncFromAshby(context: ApiHandlerContext) {
  const { request } = context;
  const supabase = await createClient();

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Note: Force refresh functionality removed with sync cursor

    // Get user's Ashby API key
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Failed to get user data', success: false },
        { status: 500 }
      );
    }

    // Get API key (prioritizes environment variable in development)
    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    
    if (!isAshbyConfigured(userData?.ashby_api_key)) {
      return NextResponse.json(
        { error: 'Ashby API key not configured', success: false },
        { status: 400 }
      );
    }

    // Initialize Ashby client
    const ashbyClient = new AshbyClient({
      apiKey: apiKey!
    });

    // Get cursor from query params for pagination (not stored in database)
    const searchParams = new URL(request.url).searchParams;
    const cursor = searchParams.get('cursor') || undefined;
    const forceRefresh = searchParams.get('force') === 'true';
    
    // Fetch candidates from Ashby with cursor support
    const candidatesResponse = await ashbyClient.listCandidates({
      limit: 100,
      cursor: forceRefresh ? undefined : cursor
    });

    if (!candidatesResponse.success) {
      return NextResponse.json(
        { 
          error: candidatesResponse.error?.message || 'Failed to fetch candidates from Ashby', 
          success: false 
        },
        { status: 500 }
      );
    }

    const candidates = candidatesResponse.results?.candidates || [];
    const nextCursor = candidatesResponse.results?.cursor;

    // Process and store candidates
    const syncResults = {
      new_candidates: 0,
      updated_candidates: 0,
      errors: [] as Array<{ candidateId: string; error: string }>
    };

    for (const candidate of candidates) {
      try {
        // Extract social links
        const linkedinUrl = candidate.socialLinks?.find(link => 
          link.type === 'LinkedIn' || link.url?.includes('linkedin.com')
        )?.url;
        
        const githubUrl = candidate.socialLinks?.find(link => 
          link.type === 'GitHub' || link.url?.includes('github.com')
        )?.url;
        
        const websiteUrl = candidate.socialLinks?.find(link => 
          link.type === 'Website' || link.type === 'PersonalWebsite'
        )?.url;

        // Check if candidate already exists
        const { data: existing } = await supabase
          .from('ashby_candidates')
          .select('id, updated_at')
          .eq('ashby_id', candidate.id)
          .eq('user_id', user.id)
          .single();

        // Prepare candidate data
        const candidateData = {
          user_id: user.id,
          ashby_id: candidate.id,
          name: candidate.name || 'Unknown',
          email: candidate.primaryEmailAddress?.value || null,
          phone: candidate.primaryPhoneNumber?.value || null,
          position: candidate.position || null,
          company: candidate.company || null,
          school: candidate.school || null,
          location_summary: candidate.locationSummary || null,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          website_url: websiteUrl || null,
          
          // Resume info
          resume_file_handle: candidate.resumeFileHandle || null,
          has_resume: !!candidate.resumeFileHandle,
          
          // Timestamps
          ashby_created_at: candidate.createdAt ? new Date(candidate.createdAt).toISOString() : null,
          ashby_updated_at: candidate.updatedAt ? new Date(candidate.updatedAt).toISOString() : null,
          
          // Arrays
          emails: candidate.emailAddresses || [],
          phone_numbers: candidate.phoneNumbers || [],
          social_links: candidate.socialLinks || [],
          tags: candidate.tags || [],
          application_ids: candidate.applicationIds || [],
          all_file_handles: candidate.fileHandles || [],
          
          // Source info
          source: candidate.source || null,
          source_title: candidate.source?.title || null,
          credited_to_user: candidate.creditedToUser || null,
          credited_to_name: candidate.creditedToUser ? 
            `${candidate.creditedToUser.firstName || ''} ${candidate.creditedToUser.lastName || ''}`.trim() : null,
          
          // Additional fields
          custom_fields: candidate.customFields || {},
          location_details: candidate.location || null,
          timezone: candidate.timezone || null,
          profile_url: candidate.profileUrl || null,
          
          // Update timestamp
          last_synced_at: new Date().toISOString()
        };

        // Upsert candidate
        const { error: upsertError } = await supabase
          .from('ashby_candidates')
          .upsert(candidateData, {
            onConflict: 'ashby_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          syncResults.errors.push({
            candidateId: candidate.id,
            error: upsertError.message
          });
        } else {
          if (existing) {
            syncResults.updated_candidates++;
          } else {
            syncResults.new_candidates++;
          }
        }
      } catch (error) {
        syncResults.errors.push({
          candidateId: candidate.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Note: nextCursor is already declared above, using it for pagination

    return NextResponse.json({
      success: true,
      sync_results: syncResults,
      total_candidates: candidates.length,
      has_more: !!nextCursor,
      cursor: nextCursor
    });

  } catch (error) {
    console.error('Error in Ashby sync:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

async function syncSingleApplicant(context: ApiHandlerContext) {
  const { request } = context;
  const supabase = await createClient();

  try {
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

    // Get user data for API key
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', applicant.user_id)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Failed to get user data', success: false },
        { status: 500 }
      );
    }

    // Get API key (prioritizes environment variable in development)
    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    
    if (!isAshbyConfigured(userData?.ashby_api_key)) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: apiKey!
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
    score?: number;
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
      score: analysisResult.score || 0,
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

// Batch sync endpoint - separate function
async function syncBatchApplicants(context: ApiHandlerContext) {
  const { } = context;
  const supabase = await createClient();

  try {
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

    // For batch operations, we need at least one user's API key
    // In development, use environment variable if available
    const envApiKey = process.env.NODE_ENV === 'development' ? process.env.ASHBY_API_KEY : null;
    
    if (!envApiKey && applicants.length > 0) {
      // Get API key from first applicant's user
      const { data: userData } = await supabase
        .from('users')
        .select('ashby_api_key')
        .eq('id', applicants[0].user_id)
        .single();
      
      const apiKey = getAshbyApiKey(userData?.ashby_api_key);
      if (!apiKey) {
        return NextResponse.json(
          { error: 'Ashby integration not configured', success: false },
          { status: 500 }
        );
      }
    }

    const ashbyClient = new AshbyClient({
      apiKey: envApiKey || getAshbyApiKey(null)!
    });

    // Batch sync results
    const batchResults = await ashbyClient.batchSyncCandidates(
      applicants.map(app => ({
        ashbyId: app.ashby_candidate_id,
        unmaskId: app.id,
        score: app.analysis_result?.score || 0,
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




// Export handlers with middleware
export const GET = withApiMiddleware(syncFromAshby, {
  requireAuth: true,
  enableCors: true,
  rateLimit: { maxRequests: 10, windowMs: 60000 } // 10 requests per minute for GET sync
});

export const POST = withApiMiddleware(syncSingleApplicant, {
  requireAuth: true,
  enableCors: true,
  rateLimit: { maxRequests: 5, windowMs: 60000 } // 5 requests per minute (sync is intensive)
});

export const PUT = withApiMiddleware(syncBatchApplicants, {
  requireAuth: true,
  enableCors: true,
  rateLimit: { maxRequests: 2, windowMs: 60000 } // 2 requests per minute (batch sync is very intensive)
});
