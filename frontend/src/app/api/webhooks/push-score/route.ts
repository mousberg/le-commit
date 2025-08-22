// Webhook Push Score API - Internal service for webhook queue processor
// POST: Push analysis score to Ashby (service role authentication only)

import { NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { withServiceRoleOnly, type ServiceRoleContext } from '@/lib/middleware/serviceRoleAuth';
import { getAshbyApiKey } from '@/lib/ashby/server';
import { getAshbyIdFromApplicantId } from '@/lib/ashby/utils';

async function webhookPushScoreHandler(context: ServiceRoleContext) {
  const { body: requestBody } = context;

  try {
    const body = requestBody as Record<string, unknown>;
    const { 
      applicantId, 
      userId,
      customFieldId = '1a3a3e4d-5455-437e-8f75-4aa547222814', // UnmaskScore field UUID
    } = body;

    if (!applicantId || !userId) {
      return NextResponse.json(
        { error: 'applicantId and userId are required', success: false },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get user's API key
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', userId)
      .single();

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ashby integration not configured for user', success: false },
        { status: 500 }
      );
    }

    // Get applicant data
    const applicantResult = await supabase
      .from('applicants')
      .select('score, source')
      .eq('id', applicantId)
      .eq('user_id', userId)
      .single();

    if (applicantResult.error || !applicantResult.data) {
      return NextResponse.json(
        { error: 'Applicant not found', success: false },
        { status: 404 }
      );
    }

    const { score: applicantScore, source } = applicantResult.data;
    
    // Check if this applicant came from Ashby
    if (source !== 'ashby') {
      return NextResponse.json(
        { error: 'This applicant is not linked to an Ashby candidate', success: false },
        { status: 400 }
      );
    }

    // Get ashby_id using utility function
    const ashbyLookup = await getAshbyIdFromApplicantId(supabase, applicantId as string, userId as string);
    if (!ashbyLookup.success) {
      return NextResponse.json(
        { error: ashbyLookup.error, success: false },
        { status: 400 }
      );
    }

    // Extract and validate score
    if (typeof applicantScore !== 'number') {
      return NextResponse.json(
        { error: 'No score available for this applicant', success: false },
        { status: 400 }
      );
    }

    // Validate score is in expected range (0-100)
    if (applicantScore < 0 || applicantScore > 100) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 100', success: false },
        { status: 400 }
      );
    }

    const ashbyClient = new AshbyClient({ apiKey });

    // Send score to Ashby
    const requestPayload = {
      objectType: 'Candidate' as const,
      objectId: ashbyLookup.ashbyId!,
      fieldId: customFieldId as string,
      fieldValue: applicantScore
    };

    const ashbyResponse = await ashbyClient.setCustomFieldValue(requestPayload);

    // Check both outer success and inner results.success
    const isActuallySuccessful = ashbyResponse.success && ashbyResponse.results?.success !== false;
    
    if (!isActuallySuccessful) {
      const errorMessage = ashbyResponse.error?.message || 'Failed to set custom field in Ashby';
      
      return NextResponse.json(
        { 
          error: `Ashby API error: ${errorMessage}`,
          success: false,
          ashbyError: ashbyResponse.error
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Score successfully pushed to Ashby via webhook',
      data: {
        applicantId,
        ashbyObjectId: ashbyLookup.ashbyId!,
        customFieldId,
        score: applicantScore,
        ashbyResponse: ashbyResponse.results
      }
    });

  } catch (error) {
    console.error('Error in webhook push score:', error);
    return NextResponse.json(
      { 
        error: 'Failed to push score to Ashby', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Push score to Ashby (service role only - for webhook queue processor)
export const POST = withServiceRoleOnly(webhookPushScoreHandler);