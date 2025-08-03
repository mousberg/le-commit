import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { startLinkedInJob, checkLinkedInJob, processLinkedInData } from '@/lib/linkedin-api';
import { LinkedInData } from '@/lib/interfaces/applicant';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicant_id, linkedin_url } = body;

    if (!applicant_id || !linkedin_url) {
      return NextResponse.json(
        { error: 'applicant_id and linkedin_url are required' },
        { status: 400 }
      );
    }

    console.log(`🔗 Starting LinkedIn processing for applicant ${applicant_id}`);

    // Get server-side Supabase client with service role
    const supabase = createServiceRoleClient();

    // Get the applicant record
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
      .update({ li_status: 'processing' })
      .eq('id', applicant_id);

    let linkedinData: LinkedInData | null = null;

    try {
      console.log(`🚀 Starting LinkedIn job for ${applicant_id}`);
      const { jobId, isExisting } = await startLinkedInJob(linkedin_url);

      if (isExisting) {
        // For existing snapshots, try to get data directly
        console.log(`♻️ Using existing LinkedIn snapshot ${jobId}`);
        const result = await checkLinkedInJob(jobId, true);
        if (result.data) {
          linkedinData = processLinkedInData(result.data);
        } else {
          throw new Error('No data available from existing snapshot');
        }
      } else {
        // Poll until complete for new jobs
        console.log(`⏳ Waiting for LinkedIn job ${jobId} to complete...`);
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max

        while (attempts < maxAttempts) {
          const result = await checkLinkedInJob(jobId);
          if (result.status === 'completed' && result.data) {
            linkedinData = processLinkedInData(result.data);
            break;
          } else if (result.status === 'failed') {
            throw new Error('LinkedIn job failed');
          }

          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }

        if (!linkedinData) {
          throw new Error('LinkedIn job timed out');
        }
      }

      // Extract name from LinkedIn data
      let name = applicant.name;

      if (linkedinData) {
        // LinkedIn data typically has better name info
        name = linkedinData.name || applicant.name;
      }

      // Update applicant with processed LinkedIn data
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          li_data: linkedinData,
          li_status: 'ready',
          name,
          status: 'processing' // Keep overall status as processing until all done
        })
        .eq('id', applicant_id);

      if (updateError) {
        throw new Error(`Failed to update applicant: ${updateError.message}`);
      }

      console.log(`✅ LinkedIn processing completed for applicant ${applicant_id}`);

      return NextResponse.json({
        success: true,
        applicant_id,
        li_data: linkedinData
      });

    } catch (processingError) {
      console.error(`❌ LinkedIn processing failed for applicant ${applicant_id}:`, processingError);

      // Update status to error
      await supabase
        .from('applicants')
        .update({
          li_status: 'error',
          li_data: {
            error: processingError instanceof Error ? processingError.message : 'LinkedIn processing failed',
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', applicant_id);

      return NextResponse.json({
        success: false,
        error: processingError instanceof Error ? processingError.message : 'LinkedIn processing failed',
        applicant_id
      }, { status: 500 });
    }

  } catch (error) {
    console.error('LinkedIn processing endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
