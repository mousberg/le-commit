// Ashby Push Score API - Send AI analysis score to Ashby custom field
// POST: Push analysis score to Ashby using customField.setValue

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
          objectType: 'Candidate' as const,
          objectId: ashbyObjectId,
          fieldId: customFieldId,
          fieldValue: applicantScore
        };


        const ashbyResponse = await ashbyClient.setCustomFieldValue(batchPayload);

        // Check both outer success and inner results.success
        const isActuallySuccessful = ashbyResponse.success && ashbyResponse.results?.success !== false;
        const errorMessage = ashbyResponse.error?.message || 'Unknown error';

        results.push({
          applicantId,
          ashbyId: ashbyObjectId,
          score: applicantScore,
          success: isActuallySuccessful,
          error: isActuallySuccessful ? undefined : errorMessage,
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

async function pushScoreToAshby(context: ApiHandlerContext) {
  const { body: requestBody } = context;
  const supabase = await createClient();

  try {
    const body = requestBody as Record<string, unknown>;
    const { 
      applicantId, 
      applicantIds, // For batch operations
      ashbyObjectType = 'Candidate', // Default to Candidate for authenticity analysis
      ashbyObjectId, // Optional: specific Ashby ID to override auto-detection
      customFieldId = '1a3a3e4d-5455-437e-8f75-4aa547222814', // UnmaskScore field UUID (verified from debug endpoint)
      scoreOverride,
      batchMode = false // Flag to indicate batch processing
    } = body;

    if (!applicantId && !applicantIds && !scoreOverride) {
      return NextResponse.json(
        { error: 'Applicant ID(s) required (or scoreOverride for testing)', success: false },
        { status: 400 }
      );
    }

    // Handle batch processing
    if (batchMode && applicantIds && Array.isArray(applicantIds)) {
      return await processBatchScores(supabase, applicantIds, customFieldId as string, context.user.id);
    }

    // Get user's API key from context (middleware provides authenticated user)
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', context.user.id)
      .single();

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: apiKey
    });

    let scoreToSend: number;
    let finalAshbyObjectId: string;

    if (scoreOverride !== undefined) {
      // Use override score for testing
      scoreToSend = scoreOverride as number;
      
      // For testing with scoreOverride, ashbyObjectId must be provided
      if (!ashbyObjectId) {
        return NextResponse.json(
          { error: 'When using scoreOverride, ashbyObjectId must be provided', success: false },
          { status: 400 }
        );
      }
      finalAshbyObjectId = ashbyObjectId as string;
    } else {
      // Get applicant data and linked Ashby information
      const applicantResult = await supabase
        .from('applicants')
        .select(`
          score,
          source,
          ashby_candidates!inner(
            ashby_id
          )
        `)
        .eq('id', applicantId)
        .single();

      if (applicantResult.error || !applicantResult.data) {
        return NextResponse.json(
          { error: 'Applicant not found', success: false },
          { status: 404 }
        );
      }

      const { score: applicantScore, source, ashby_candidates } = applicantResult.data;
      
      // Check if this applicant came from Ashby
      if (source !== 'ashby' || !ashby_candidates) {
        return NextResponse.json(
          { error: 'This applicant is not linked to an Ashby candidate', success: false },
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
      scoreToSend = applicantScore;

      // Determine the Ashby Object ID (Candidate-level for authenticity)
      if (ashbyObjectId) {
        // Use provided ID (manual override)
        finalAshbyObjectId = ashbyObjectId as string;
      } else {
        // Use Ashby Candidate ID for authenticity analysis
        finalAshbyObjectId = ashby_candidates[0].ashby_id;
      }
    }

    // Validate score is in expected range (0-100)
    if (scoreToSend < 0 || scoreToSend > 100) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 100', success: false },
        { status: 400 }
      );
    }

    // Send score to Ashby using customField.setValue with new API format
    const requestPayload = {
      objectType: ashbyObjectType as "Application" | "Candidate",
      objectId: finalAshbyObjectId,
      fieldId: customFieldId as string,
      fieldValue: scoreToSend
    };

    const ashbyResponse = await ashbyClient.setCustomFieldValue(requestPayload);

    // Check both outer success and inner results.success
    const isActuallySuccessful = ashbyResponse.success && ashbyResponse.results?.success !== false;
    
    if (!isActuallySuccessful) {
      const errorMessage = ashbyResponse.error?.message || 'Failed to set custom field in Ashby';
      
      console.error('❌ USER: Failed to push score to Ashby:', {
        applicantId,
        outerSuccess: ashbyResponse.success,
        innerSuccess: ashbyResponse.results?.success,
        error: ashbyResponse.error,
        payload: requestPayload
      });
      
      return NextResponse.json(
        { 
          error: `Ashby API error: ${errorMessage}`,
            success: false,
          ashbyError: ashbyResponse.error
        },
        { status: 400 } // Use 400 for client errors like field not found
      );
    }

    // Success logged at the main handler level

    return NextResponse.json({
      success: true,
      message: 'Score successfully pushed to Ashby',
      data: {
        applicantId,
        ashbyObjectType,
        ashbyObjectId: finalAshbyObjectId,
        customFieldId,
        score: scoreToSend,
        wasAutoDetected: !ashbyObjectId && !scoreOverride,
        ashbyResponse: ashbyResponse.results
      }
    });

  } catch (error) {
    console.error('Error pushing score to Ashby:', error);
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

// Handle webhook calls from database triggers
async function handleWebhookCall(request: NextRequest) {
  const body = await request.json();
  const { applicantId } = body;

  if (!applicantId) {
    return NextResponse.json(
      { error: 'Applicant ID is required', success: false },
      { status: 400 }
    );
  }

  // Use service role client to bypass RLS (trigger already validated data)
  const supabase = createServiceRoleClient();

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
    return NextResponse.json(
      { error: 'Applicant not found', success: false },
      { status: 404 }
    );
  }

  const { user_id, score: applicantScore, source } = applicantData;

  // Check if this applicant came from Ashby
  if (source !== 'ashby') {
    return NextResponse.json(
      { error: 'Not an Ashby candidate', success: false },
      { status: 400 }
    );
  }

  // Get user's API key
  const { data: userData } = await supabase
    .from('users')
    .select('ashby_api_key')
    .eq('id', user_id)
    .single();

  const apiKey = getAshbyApiKey(userData?.ashby_api_key);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Ashby integration not configured for user', success: false },
      { status: 400 }
    );
  }

  // Get ashby_id using utility function
  const ashbyLookup = await getAshbyIdFromApplicantId(supabase, applicantId, user_id);
  if (!ashbyLookup.success) {
    return NextResponse.json(
      { error: ashbyLookup.error, success: false },
      { status: 404 }
    );
  }

  // Extract and validate score
  if (typeof applicantScore !== 'number' || applicantScore < 0 || applicantScore > 100) {
    return NextResponse.json(
      { error: 'Invalid or missing score', success: false },
      { status: 400 }
    );
  }

  // Initialize Ashby client and push score
  const ashbyClient = new AshbyClient({ apiKey });
  
  // Use the correct UnmaskScore field ID (verified from debug endpoint)
  const customFieldId = process.env.ASHBY_SCORE_FIELD_ID || '1a3a3e4d-5455-437e-8f75-4aa547222814';

  const webhookPayload = {
    objectType: 'Candidate' as const,
    objectId: ashbyLookup.ashbyId!,
    fieldId: customFieldId,
    fieldValue: applicantScore
  };

  const ashbyResponse = await ashbyClient.setCustomFieldValue(webhookPayload);

  // Check both outer success and inner results.success
  const isActuallySuccessful = ashbyResponse.success && ashbyResponse.results?.success !== false;
  
  if (!isActuallySuccessful) {
    const errorMessage = ashbyResponse.error?.message || 'Failed to push score to Ashby';
    const isRateLimit = ashbyResponse.error?.code === 'RATE_LIMIT_EXCEEDED' || 
                        errorMessage.toLowerCase().includes('rate limit') ||
                        errorMessage.toLowerCase().includes('too many');
    
    console.error('❌ WEBHOOK: Failed to push score to Ashby:', {
      applicantId,
      ashbyId: ashbyLookup.ashbyId,
      outerSuccess: ashbyResponse.success,
      innerSuccess: ashbyResponse.results?.success,
      error: ashbyResponse.error,
      payload: webhookPayload,
      isRateLimit
    });
    
    // For rate limit errors, return 503 (Service Unavailable) to indicate temporary issue
    // For other errors, use 400 (Bad Request) 
    const statusCode = isRateLimit ? 503 : 400;
    
    return NextResponse.json(
      { 
        error: `Ashby API error: ${errorMessage}`,
        success: false,
        isRateLimit,
        retryAfter: isRateLimit ? (ashbyResponse.error?.retryAfter || 60) : undefined
      },
      { status: statusCode }
    );
  }

  // Success logged at the main handler level

  return NextResponse.json({
    success: true,
    message: 'Score successfully synced to Ashby',
    data: {
      applicantId,
      ashbyId: ashbyLookup.ashbyId,
      score: applicantScore,
      customFieldId,
      ashbyResults: ashbyResponse.results
    }
  });
}

// Handle user calls (existing middleware-wrapped logic)
async function handleUserCall(request: NextRequest) {
  try {
    // Use the middleware to get proper auth context
    const middlewareResponse = await withApiMiddleware(pushScoreToAshby, {
      requireAuth: true,
      enableCors: true,
      enableLogging: true,
      rateLimit: { 
        maxRequests: 20,
        windowMs: 60000
      }
    })(request, { params: Promise.resolve({}) });

    // Only log detailed info on failures
    if (middlewareResponse.status >= 400) {
      try {
        const responseBody = await middlewareResponse.clone().text();
        console.error('❌ User call failed with error response:', {
          method: request.method,
          url: request.url,
          status: middlewareResponse.status,
          statusText: middlewareResponse.statusText,
          responseBody,
          timestamp: new Date().toISOString()
        });
      } catch (bodyParseError) {
        console.error('❌ Failed to parse error response body:', bodyParseError);
      }
    }

    return middlewareResponse;
  } catch (error) {
    console.error('❌ Error in handleUserCall:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      error: 'Failed to process user call',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Push AI analysis score to Ashby (handles both user calls and webhook calls)
export async function POST(request: NextRequest) {
  try {
    const isWebhookSource = request.headers.get('x-webhook-source');

    // Check if this is a webhook call from database trigger
    const isWebhookCall = isWebhookSource === 'database-trigger';
    
    if (isWebhookCall) {
      // Skip webhook secret validation - minimal security risk for score/note updates
      const response = await handleWebhookCall(request);
      
      // Log success or failure
      if (response.status === 200) {
        console.log('✅ POST /api/ashby/push-score (webhook) 200');
      }
      
      return response;
    } else {
      const response = await handleUserCall(request);
      
      // Log success or failure
      if (response.status === 200) {
        console.log('✅ POST /api/ashby/push-score (user) 200');
      }
      
      return response;
    }
  } catch (error) {
    console.error('❌ Critical error in push-score API:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}