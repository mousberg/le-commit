// Ashby Push Score API - Send AI analysis score to Ashby custom field
// POST: Push analysis score to Ashby using customField.setValue

import { NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { getAshbyApiKey } from '@/lib/ashby/server';

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
        // Get applicant data and linked Ashby information
        const applicantResult = await supabase
          .from('applicants')
          .select(`
            id,
            ai_data,
            source,
            ashby_candidates!inner(
              ashby_id
            )
          `)
          .eq('id', applicantId)
          .single();

        if (applicantResult.error || !applicantResult.data) {
          results.push({
            applicantId,
            success: false,
            error: 'Applicant not found'
          });
          continue;
        }

        const { ai_data, source, ashby_candidates } = applicantResult.data;
        
        // Check if this applicant came from Ashby
        if (source !== 'ashby' || !ashby_candidates) {
          results.push({
            applicantId,
            success: false,
            error: 'Not linked to Ashby candidate'
          });
          continue;
        }

        // Extract AI analysis score
        if (!ai_data || typeof ai_data.score !== 'number') {
          results.push({
            applicantId,
            success: false,
            error: 'No AI analysis score available'
          });
          continue;
        }

        const score = ai_data.score;
        const ashbyObjectId = ashby_candidates[0].ashby_id;

        // Validate score is in expected range (0-100)
        if (score < 0 || score > 100) {
          results.push({
            applicantId,
            success: false,
            error: 'Score must be between 0 and 100'
          });
          continue;
        }

        // Send score to Ashby
        const ashbyResponse = await ashbyClient.setCustomFieldValue({
          objectType: 'Candidate',
          objectId: ashbyObjectId,
          fieldId: customFieldId,
          fieldValue: score
        });

        results.push({
          applicantId,
          ashbyObjectId,
          score,
          success: ashbyResponse.success,
          error: ashbyResponse.error?.message
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
      message: `Batch processing completed: ${successCount}/${applicantIds.length} successful`,
      results,
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
      customFieldId = '1a3a3e4d-5455-437e-8f75-4aa547222814', // UnmaskScore field UUID
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
          ai_data,
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

      const { ai_data, source, ashby_candidates } = applicantResult.data;
      
      // Check if this applicant came from Ashby
      if (source !== 'ashby' || !ashby_candidates) {
        return NextResponse.json(
          { error: 'This applicant is not linked to an Ashby candidate', success: false },
          { status: 400 }
        );
      }

      // Extract AI analysis score
      if (!ai_data || typeof ai_data.score !== 'number') {
        return NextResponse.json(
          { error: 'No AI analysis score available for this applicant', success: false },
          { status: 400 }
        );
      }
      scoreToSend = ai_data.score;

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

    console.log('🚀 Sending to Ashby:', requestPayload);
    const ashbyResponse = await ashbyClient.setCustomFieldValue(requestPayload);

    if (!ashbyResponse.success) {
      return NextResponse.json(
        { 
          error: ashbyResponse.error?.message || 'Failed to set custom field in Ashby', 
          success: false,
          ashbyError: ashbyResponse.error
        },
        { status: 500 }
      );
    }

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

// POST - Push AI analysis score to Ashby
export const POST = withApiMiddleware(pushScoreToAshby, {
  requireAuth: true,
  enableCors: true,
  enableLogging: true,
  rateLimit: { 
    maxRequests: 20,
    windowMs: 60000 // 1-minute window
  }
});