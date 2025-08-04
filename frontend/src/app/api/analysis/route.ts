import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { analyzeApplicant, createErrorFallback } from '@/lib/analysis';
import { Applicant } from '@/lib/interfaces/applicant';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicant_id } = body;

    if (!applicant_id) {
      return NextResponse.json(
        { error: 'applicant_id is required' },
        { status: 400 }
      );
    }

    console.log(`🧠 Starting AI analysis for applicant ${applicant_id}`);

    // Get server-side Supabase client with service role
    const supabase = createServiceRoleClient();

    // Get the applicant record with all data
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicant_id)
      .single();

    if (applicantError || !applicant) {
      console.error('Failed to get applicant:', applicantError);
      return NextResponse.json(
        { error: 'Applicant not found' },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from('applicants')
      .update({ ai_status: 'processing' })
      .eq('id', applicant_id);

    try {
      console.log(`🔍 Running comprehensive analysis for applicant ${applicant_id}`);

      // Run the analysis using the centralized analysis service
      const analyzedApplicant = await analyzeApplicant(applicant as Applicant);

      // Update applicant with analysis results
      // Note: status and score are now generated columns - only update ai_data and ai_status
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          ai_data: analyzedApplicant.ai_data,
          ai_status: 'ready'
          // status and score are automatically generated from ai_status and ai_data
        })
        .eq('id', applicant_id);

      if (updateError) {
        throw new Error(`Failed to update applicant: ${updateError.message}`);
      }

      console.log(`✅ AI analysis completed for applicant ${applicant_id} with score: ${analyzedApplicant.ai_data?.score || 'N/A'}`);
      return NextResponse.json({
        success: true,
        applicant_id,
        ai_data: analyzedApplicant.ai_data,
        score: analyzedApplicant.ai_data?.score
      });

    } catch (analysisError) {
      console.error(`❌ AI analysis failed for applicant ${applicant_id}:`, analysisError);

      // Update with error analysis using centralized error fallback
      const errorFallback = createErrorFallback(analysisError instanceof Error ? analysisError.message : 'Analysis failed');

      await supabase
        .from('applicants')
        .update({
          ai_status: 'error',
          ai_data: errorFallback,
          status: 'completed' // Still mark as completed even with analysis error
          // score is automatically generated from ai_data.credibilityScore
        })
        .eq('id', applicant_id);

      return NextResponse.json({
        success: false,
        error: analysisError instanceof Error ? analysisError.message : 'AI analysis failed',
        applicant_id
      }, { status: 500 });
    }

  } catch (error) {
    console.error('AI analysis endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
