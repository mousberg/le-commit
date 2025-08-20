// Ashby Batch Score API - Process multiple score updates to Ashby
// POST: Push analysis scores for multiple candidates to Ashby using customField.setValue

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { getAshbyApiKey } from '@/lib/ashby/server';
import { getAshbyIdFromApplicantId } from '@/lib/ashby/utils';

async function processBatchScores(
  supabase: Awaited<ReturnType<typeof createClient>>,
  applicantIds: string[],
  customFieldId: string,
  userId: string
) {
  try {
    // Get user's API key
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', userId)
      .single();

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const ashbyClient = new AshbyClient({ apiKey });
    const results = [];

    // Process each applicant
    for (const applicantId of applicantIds) {
      try {
        // Get applicant data
        const applicantResult = await supabase
          .from('applicants')
          .select(`
            id,
            score,
            source
          `)
          .eq('id', applicantId)
          .eq('user_id', userId)
          .single();

        if (applicantResult.error || !applicantResult.data) {
          results.push({
            applicantId,
            success: false,
            error: 'Applicant not found'
          });
          continue;
        }

        const { score: applicantScore, source } = applicantResult.data;
        
        // Check if this applicant came from Ashby
        if (source !== 'ashby') {
          results.push({
            applicantId,
            success: false,
            error: 'Not linked to Ashby candidate'
          });
          continue;
        }

        // Get ashby_id using utility function
        const ashbyLookup = await getAshbyIdFromApplicantId(supabase, applicantId, userId);
        if (!ashbyLookup.success) {
          results.push({
            applicantId,
            success: false,
            error: ashbyLookup.error
          });
          continue;
        }

        // Extract and validate score
        if (typeof applicantScore !== 'number') {
          results.push({
            applicantId,
            success: false,
            error: 'No score available'
          });
          continue;
        }
        const ashbyObjectId = ashbyLookup.ashbyId!;

        // Validate score is in expected range (0-100)
        if (applicantScore < 0 || applicantScore > 100) {
          results.push({
            applicantId,
            success: false,
            error: 'Score must be between 0 and 100'
          });
          continue;
        }

        // Send score to Ashby
        const batchPayload = {
          objectType: 'Candidate',
          objectId: ashbyObjectId,
          fieldId: customFieldId,
          fieldValue: applicantScore
        };

        console.log(`🚀 BATCH: Sending score for ${applicantId}:`, {
          ...batchPayload,
          environmentFieldId: process.env.ASHBY_SCORE_FIELD_ID || 'NOT_SET (using default)',
          timestamp: new Date().toISOString()
        });

        const ashbyResponse = await ashbyClient.setCustomFieldValue(batchPayload);

        // Check both outer success and inner results.success
        const isActuallySuccessful = ashbyResponse.success && ashbyResponse.results?.success !== false;
        const errorMessage = ashbyResponse.results?.errorInfo?.code || ashbyResponse.error?.message;

        results.push({
          applicantId,
          ashbyId: ashbyObjectId,
          score: applicantScore,
          success: isActuallySuccessful,
          error: isActuallySuccessful ? undefined : errorMessage,
          errorCode: ashbyResponse.results?.errorInfo?.code,
          ashbyResponse: ashbyResponse.results
        });

      } catch (error) {
        results.push({
          applicantId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    // Transform results array to object keyed by applicant ID for frontend consistency
    const resultsObject = results.reduce((acc, result) => {
      acc[result.applicantId] = result;
      return acc;
    }, {} as Record<string, typeof results[0]>);
    
    return NextResponse.json({
      success: true,
      message: `Batch processing completed: ${successCount}/${applicantIds.length} successful`,
      results: resultsObject,
      summary: {
        total: applicantIds.length,
        successful: successCount,
        failed: applicantIds.length - successCount
      }
    });

  } catch (error) {
    console.error('Error in batch score processing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process batch scores', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function batchScoreHandler(context: ApiHandlerContext) {
  const { body: requestBody } = context;
  const supabase = await createClient();

  try {
    const body = requestBody as Record<string, unknown>;
    const { 
      applicantIds,
      customFieldId = process.env.ASHBY_SCORE_FIELD_ID || '1a3a3e4d-5455-437e-8f75-4aa547222814'
    } = body;

    if (!applicantIds || !Array.isArray(applicantIds) || applicantIds.length === 0) {
      return NextResponse.json(
        { error: 'Applicant IDs array is required', success: false },
        { status: 400 }
      );
    }

    // Process batch scores
    return await processBatchScores(supabase, applicantIds, customFieldId as string, context.user.id);

  } catch (error) {
    console.error('Error in batch score handler:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process batch scores', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle webhook calls from database triggers
async function handleWebhookCall(request: NextRequest) {
  const body = await request.json();
  const { applicantIds } = body;

  if (!applicantIds || !Array.isArray(applicantIds) || applicantIds.length === 0) {
    return NextResponse.json(
      { error: 'Applicant IDs array is required', success: false },
      { status: 400 }
    );
  }

  // Use service role client to bypass RLS (trigger already validated data)
  const supabase = createServiceRoleClient();

  const results = [];
  
  for (const applicantId of applicantIds) {
    try {
      // Get applicant data and user info
      const { data: applicantData, error: applicantError } = await supabase
        .from('applicants')
        .select(`
          id,
          user_id,
          score,
          source
        `)
        .eq('id', applicantId)
        .single();

      if (applicantError || !applicantData) {
        results.push({
          applicantId,
          success: false,
          error: 'Applicant not found'
        });
        continue;
      }

      const { user_id, score: applicantScore, source } = applicantData;

      // Check if this applicant came from Ashby
      if (source !== 'ashby') {
        results.push({
          applicantId,
          success: false,
          error: 'Not an Ashby candidate'
        });
        continue;
      }

      // Get user's API key
      const { data: userData } = await supabase
        .from('users')
        .select('ashby_api_key')
        .eq('id', user_id)
        .single();

      const apiKey = getAshbyApiKey(userData?.ashby_api_key);
      if (!apiKey) {
        results.push({
          applicantId,
          success: false,
          error: 'Ashby integration not configured for user'
        });
        continue;
      }

      // Get ashby_id using utility function
      const ashbyLookup = await getAshbyIdFromApplicantId(supabase, applicantId, user_id);
      if (!ashbyLookup.success) {
        results.push({
          applicantId,
          success: false,
          error: ashbyLookup.error
        });
        continue;
      }

      // Extract and validate score
      if (typeof applicantScore !== 'number' || applicantScore < 0 || applicantScore > 100) {
        results.push({
          applicantId,
          success: false,
          error: 'Invalid or missing score'
        });
        continue;
      }

      // Initialize Ashby client and push score
      const ashbyClient = new AshbyClient({ apiKey });
      
      // Use the correct UnmaskScore field ID
      const customFieldId = process.env.ASHBY_SCORE_FIELD_ID || '1a3a3e4d-5455-437e-8f75-4aa547222814';

      const webhookPayload = {
        objectType: 'Candidate',
        objectId: ashbyLookup.ashbyId!,
        fieldId: customFieldId,
        fieldValue: applicantScore
      };

      console.log('🔧 WEBHOOK BATCH: Sending score to Ashby via database trigger:', {
        applicantId,
        ashbyId: ashbyLookup.ashbyId,
        payload: webhookPayload,
        customFieldId,
        score: applicantScore,
        environmentFieldId: process.env.ASHBY_SCORE_FIELD_ID || 'NOT_SET (using default)',
        timestamp: new Date().toISOString()
      });

      const ashbyResponse = await ashbyClient.setCustomFieldValue(webhookPayload);

      console.log('📤 WEBHOOK BATCH: Ashby API response:', {
        success: ashbyResponse.success,
        results: ashbyResponse.results,
        error: ashbyResponse.error,
        timestamp: new Date().toISOString()
      });

      // Check both outer success and inner results.success
      const isActuallySuccessful = ashbyResponse.success && ashbyResponse.results?.success !== false;
      
      if (!isActuallySuccessful) {
        const errorMessage = ashbyResponse.results?.errorInfo?.code || ashbyResponse.error?.message || 'Failed to push score to Ashby';
        const errorDetails = ashbyResponse.results?.errors || [];
        
        console.error('❌ WEBHOOK BATCH: Failed to push score to Ashby:', {
          applicantId,
          ashbyId: ashbyLookup.ashbyId,
          outerSuccess: ashbyResponse.success,
          innerSuccess: ashbyResponse.results?.success,
          errorCode: ashbyResponse.results?.errorInfo?.code,
          errorDetails,
          error: ashbyResponse.error,
          payload: webhookPayload
        });
        
        results.push({
          applicantId,
          success: false,
          error: `Ashby API error: ${errorMessage}`,
          errorCode: ashbyResponse.results?.errorInfo?.code,
          errorDetails
        });
        continue;
      }

      console.log('✅ WEBHOOK BATCH: Successfully pushed score to Ashby:', {
        applicantId,
        ashbyId: ashbyLookup.ashbyId,
        score: applicantScore,
        customFieldId,
        ashbyResults: ashbyResponse.results
      });

      results.push({
        applicantId,
        ashbyId: ashbyLookup.ashbyId,
        score: applicantScore,
        success: true,
        customFieldId,
        ashbyResults: ashbyResponse.results
      });

    } catch (error) {
      results.push({
        applicantId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  
  return NextResponse.json({
    success: true,
    message: `Batch webhook processing completed: ${successCount}/${applicantIds.length} successful`,
    results: results.reduce((acc, result) => {
      acc[result.applicantId] = result;
      return acc;
    }, {} as Record<string, typeof results[0]>),
    summary: {
      total: applicantIds.length,
      successful: successCount,
      failed: applicantIds.length - successCount
    }
  });
}

// Handle user calls (middleware-wrapped logic)
async function handleUserCall(request: NextRequest) {
  // Use the middleware to get proper auth context
  const middlewareResponse = await withApiMiddleware(batchScoreHandler, {
    requireAuth: true,
    enableCors: true,
    enableLogging: true,
    rateLimit: { 
      maxRequests: 10,
      windowMs: 60000
    }
  })(request, { params: Promise.resolve({}) });

  return middlewareResponse;
}

// POST - Process batch scores to Ashby (handles both user calls and webhook calls)
export async function POST(request: NextRequest) {
  try {
    // Check if this is a webhook call from database trigger
    const isWebhookCall = request.headers.get('x-webhook-source') === 'database-trigger';
    
    if (isWebhookCall) {
      // Validate webhook secret for security
      const webhookSecret = request.headers.get('x-webhook-secret');
      if (webhookSecret !== process.env.WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 403 });
      }
      return await handleWebhookCall(request);
    } else {
      return await handleUserCall(request);
    }
  } catch (error) {
    console.error('Error in batch-scores API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}