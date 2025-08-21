// Ashby Push Score API - Send AI analysis score to Ashby custom field
// POST: Push analysis score to Ashby using customField.setValue

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';
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
  const { body: requestBody, dbService } = context;
  // Use the database service from context (could be service role or user authenticated)
  const supabase = dbService?.dbClient?.getClient() || (await createClient());

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
      // Get applicant data first
      const applicantResult = await supabase
        .from('applicants')
        .select('score, source')
        .eq('id', applicantId)
        .eq('user_id', context.user.id)
        .single();

      if (applicantResult.error || !applicantResult.data) {
        return NextResponse.json(
          { error: 'Applicant not found', success: false },
          { status: 404 }
        );
      }

      const { score: applicantScore, source } = applicantResult.data;
      
      console.log('🔍 Applicant data:', {
        applicantId,
        source,
        score: applicantScore
      });
      
      // Check if this applicant came from Ashby
      if (source !== 'ashby') {
        console.log('❌ Applicant not from Ashby:', { source, applicantId });
        return NextResponse.json(
          { error: 'This applicant is not linked to an Ashby candidate', success: false },
          { status: 400 }
        );
      }

      // Get ashby_id using utility function (handles the proper relationship)
      const ashbyLookup = await getAshbyIdFromApplicantId(supabase, applicantId, context.user.id);
      if (!ashbyLookup.success) {
        console.log('❌ No ashby_candidates found for applicant:', { applicantId, source, error: ashbyLookup.error });
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
      scoreToSend = applicantScore;

      // Determine the Ashby Object ID (Candidate-level for authenticity)  
      if (ashbyObjectId) {
        // Use provided ID (manual override)
        finalAshbyObjectId = ashbyObjectId as string;
      } else {
        // Use Ashby Candidate ID from utility function
        finalAshbyObjectId = ashbyLookup.ashbyId!;
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

// Removed handleWebhookCall and handleUserCall functions
// Now using simplified single-path architecture

// POST - Push AI analysis score to Ashby (simplified single-path architecture)
// Both user calls and queue processor calls use the same middleware-wrapped path
export async function POST(request: NextRequest) {
  try {
    // Enhanced logging for 401 debugging
    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
    
    console.log('🔍 POST /api/ashby/push-score - Auth Debug:', {
      hasAuthHeader: !!authHeader,
      authHeaderType: authHeader?.split(' ')[0] || 'none',
      isServiceRole,
      hasServiceRoleKey: !!serviceRoleKey,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });
    
    if (isServiceRole) {
      // Handle service role authentication (webhook processor)
      const body = await request.json();
      const { userId } = body;
      
      console.log('🔧 Service role auth detected:', { userId, bodyKeys: Object.keys(body) });
      
      if (!userId) {
        console.log('❌ Service role auth failed: missing userId');
        return NextResponse.json(
          { error: 'userId required for service role authentication', success: false },
          { status: 400 }
        );
      }
      
      // Create service role context with service role client
      const { createServiceRoleClient } = await import('@/lib/supabase/server');
      const { DatabaseClient } = await import('@/lib/supabase/database');
      const { SupabaseDatabaseService } = await import('@/lib/services/database');
      
      const serviceRoleSupabase = createServiceRoleClient();
      const dbClient = new DatabaseClient(serviceRoleSupabase);
      const dbService = new SupabaseDatabaseService();
      // Override the client with service role client
      (dbService as any).dbClient = dbClient;
      
      const serviceRoleContext = {
        user: { id: userId, email: '' },
        dbService,
        request,
        body,
        params: {}
      };
      
      const response = await pushScoreToAshby(serviceRoleContext);
      
      if (response.status === 200) {
        console.log('✅ POST /api/ashby/push-score 200 (service role)');
      }
      
      return response;
    } else {
      // Use regular middleware for user authentication
      console.log('🔧 User auth path detected, using middleware');
      
      const middlewareResponse = await withApiMiddleware(pushScoreToAshby, {
        requireAuth: true,
        enableCors: true
      })(request, { params: Promise.resolve({}) });

      // Enhanced logging
      console.log(`${middlewareResponse.status === 200 ? '✅' : '❌'} POST /api/ashby/push-score ${middlewareResponse.status} (user auth)`, {
        status: middlewareResponse.status,
        hasAuthHeader: !!authHeader,
        timestamp: new Date().toISOString()
      });
      
      // If 401, log the response body for debugging
      if (middlewareResponse.status === 401) {
        const responseClone = middlewareResponse.clone();
        const responseBody = await responseClone.json().catch(() => null);
        console.log('❌ User auth 401 details:', responseBody);
      }
      
      return middlewareResponse;
    }
  } catch (error) {
    console.error('❌ Error in push-score API:', {
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