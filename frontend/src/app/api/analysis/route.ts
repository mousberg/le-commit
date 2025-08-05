import { NextResponse } from 'next/server';
import { startProcessing, validateRequestBody } from '@/lib/processing';
import { analyzeApplicant, createErrorFallback } from '@/lib/analysis';
import { Applicant } from '@/lib/interfaces/applicant';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // Validate request body
  const bodyValidation = validateRequestBody(request);
  if (bodyValidation) return bodyValidation;

  const body = await request.json();
  const { applicant_id } = body;

  if (!applicant_id) {
    return NextResponse.json(
      { error: 'applicant_id is required' },
      { status: 400 }
    );
  }

  // Use the reusable processing function with special error handling for AI
  try {
    return await startProcessing(
      applicant_id,
      'ai_status',
      async (applicant) => {
        console.log(`🔍 Running comprehensive analysis for applicant ${applicant_id}`);
        
        // Run the analysis using the centralized analysis service
        const analyzedApplicant = await analyzeApplicant(applicant as unknown as Applicant);
        
        return analyzedApplicant.ai_data;
      },
      'AI Analysis'
    );
  } catch (error) {
    // Special handling for AI analysis errors - still mark as completed with error fallback
    console.error(`❌ AI analysis failed for applicant ${applicant_id}:`, error);
    
    const errorFallback = createErrorFallback(error instanceof Error ? error.message : 'Analysis failed');
    
    // For AI analysis, we want to mark as completed even with errors
    // Override the default error handling by manually updating to completed
    const supabase = createServiceRoleClient();
    await supabase
      .from('applicants')
      .update({
        ai_status: 'ready', // Mark as ready instead of error
        ai_data: errorFallback,
      })
      .eq('id', applicant_id);

    return NextResponse.json({
      success: true, // Return success even with analysis error
      applicant_id,
      ai_data: errorFallback,
      score: errorFallback.score
    });
  }
}