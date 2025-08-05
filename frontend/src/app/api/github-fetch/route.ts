import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { processGitHubAccount } from '@/lib/github';
import { GitHubData } from '@/lib/interfaces/github';

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { applicant_id, github_url } = body;

    if (!applicant_id || !github_url) {
      return NextResponse.json(
        { error: 'applicant_id and github_url are required' },
        { status: 400 }
      );
    }

    console.log(`🐙 Starting GitHub processing for applicant ${applicant_id}`);

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

    // Check if already processing or completed
    if (applicant.gh_status === 'processing') {
      return NextResponse.json(
        { success: false, error: 'GitHub processing already in progress', applicant_id },
        { status: 409 }
      );
    }

    if (applicant.gh_status === 'ready') {
      return NextResponse.json(
        { success: true, applicant_id, gh_data: applicant.gh_data },
        { status: 200 }
      );
    }

    // Update status to processing
    await supabase
      .from('applicants')
      .update({ gh_status: 'processing' })
      .eq('id', applicant_id);

    let githubData: GitHubData | null = null;

    try {
      console.log(`⚡ Processing GitHub account for ${applicant_id}`);

      githubData = await processGitHubAccount(github_url, {
        maxRepos: 50,
        includeOrganizations: true,
        analyzeContent: true,
        maxContentAnalysis: 3,
        includeActivity: true
      });

      // Update applicant with processed GitHub data
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          gh_data: githubData,
          gh_status: 'ready'
          // Note: status is now a generated column - automatically derived from sub-statuses
        })
        .eq('id', applicant_id);

      if (updateError) {
        throw new Error(`Failed to update applicant: ${updateError.message}`);
      }

      console.log(`✅ GitHub processing completed for applicant ${applicant_id}`);

      return NextResponse.json({
        success: true,
        applicant_id,
        gh_data: githubData
      });

    } catch (processingError) {
      console.error(`❌ GitHub processing failed for applicant ${applicant_id}:`, processingError);

      // Update status to error (but don't fail the entire process)
      await supabase
        .from('applicants')
        .update({
          gh_status: 'error',
          gh_data: {
            error: processingError instanceof Error ? processingError.message : 'GitHub processing failed',
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', applicant_id);

      // For GitHub, we might want to continue processing even if it fails
      // since it's often optional data
      return NextResponse.json({
        success: false,
        error: processingError instanceof Error ? processingError.message : 'GitHub processing failed',
        applicant_id,
        continue_processing: true // Hint that other processing can continue
      }, { status: 200 }); // Return 200 to allow other processing to continue
    }

  } catch (error) {
    console.error('GitHub processing endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
