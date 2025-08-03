// Ashby Sync API - Push Unmask verification results back to Ashby

import { NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';

async function syncSingleApplicant(context: ApiHandlerContext) {
  const { user, request } = context;
  const supabase = await createClient();

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

// Batch sync endpoint - separate function
async function syncBatchApplicants(context: ApiHandlerContext) {
  const { user } = context;
  const supabase = await createClient();

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

// Export handlers with middleware
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