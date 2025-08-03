import { NextResponse } from 'next/server';
import fs from 'fs';
import { CvData } from '@/lib/interfaces/cv';
import { GitHubData } from '@/lib/interfaces/github';
import { LinkedInData } from '@/lib/interfaces/applicant';
import { processCvPdf, validateAndCleanCvData } from '@/lib/profile-pdf';
import { processGitHubAccount } from '@/lib/github';
import { analyzeApplicant } from '@/lib/analysis';
import { startLinkedInJob, checkLinkedInJob, processLinkedInData } from '@/lib/linkedin-api';
import { createClient } from '@/lib/supabase/server';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';

async function createApplicant(context: ApiHandlerContext) {
  const { user, request } = context;

  const formData = await request.formData();
  const cvFile = formData.get('cvFile') as File;
  const linkedinUrl = formData.get('linkedinUrl') as string;
  const githubUrl = formData.get('githubUrl') as string;

  if (!cvFile && !linkedinUrl) {
    return NextResponse.json(
      { error: 'Either CV file or LinkedIn profile URL is required', success: false },
      { status: 400 }
    );
  }

  // Create initial applicant record in database using server-side client
  const serverSupabase = await createClient();
  const applicantResult = await serverSupabase
    .from('applicants')
    .insert({
      user_id: user.id,
      name: 'Processing...',
      email: '',
      status: 'uploading',
      original_filename: cvFile?.name || null,
      original_github_url: githubUrl || null,
      original_linkedin_url: linkedinUrl || null
    })
    .select()
    .single();

  if (applicantResult.error) {
    throw new Error(`Failed to create applicant: ${applicantResult.error.message}`);
  }
  
  const applicant = applicantResult.data;

  // TODO: Implement file storage for simplified architecture
  // For now, we'll process the files directly without storage

  // Process asynchronously
  processApplicantAsync(applicant.id, cvFile, linkedinUrl, githubUrl);

  return NextResponse.json({
    applicant,
    success: true
  });
}

export const POST = withApiMiddleware(createApplicant, {
  requireAuth: true,
  enableCors: true,
  enableLogging: true,
  rateLimit: { maxRequests: 10, windowMs: 60000 } // 10 requests per minute
});

async function processApplicantAsync(applicantId: string, cvFile?: File, linkedinUrl?: string, githubUrl?: string) {
  try {
    // Get server-side Supabase client
    const serverSupabase = await createClient();
    
    // Get current applicant
    const applicantResult = await serverSupabase
      .from('applicants')
      .select('*')
      .eq('id', applicantId)
      .single();
      
    if (applicantResult.error || !applicantResult.data) {
      console.error('Failed to get applicant:', applicantResult.error);
      return;
    }

    // Update status to processing
    await serverSupabase
      .from('applicants')
      .update({ status: 'processing' })
      .eq('id', applicantId);

    // Process LinkedIn URL FIRST if provided (this needs to complete before other processing)
    let linkedinDataFromUrl: LinkedInData | null = null;
    if (linkedinUrl) {
      try {
        console.log(`🚀 Starting LinkedIn job for ${applicantId}`);
        const { jobId, isExisting } = await startLinkedInJob(linkedinUrl);
        
        // Update applicant with job ID
        await serverSupabase
          .from('applicants')
          .update({
            linkedin_job_id: jobId,
            linkedin_job_status: isExisting ? 'completed' : 'running',
            linkedin_job_started_at: new Date().toISOString(),
            linkedin_job_completed_at: isExisting ? new Date().toISOString() : null
          })
          .eq('id', applicantId);

        if (isExisting) {
          // For existing snapshots, try to get data directly
          console.log(`♻️ Using existing LinkedIn snapshot ${jobId}`);
          const result = await checkLinkedInJob(jobId, true);
          if (result.data) {
            linkedinDataFromUrl = processLinkedInData(result.data);
          } else {
            throw new Error('No data available from existing snapshot');
          }
        } else {
          // Poll until complete for new jobs
          console.log(`⏳ Waiting for LinkedIn job ${jobId} to complete...`);
          let attempts = 0;
          const maxAttempts = 60;
          
          while (attempts < maxAttempts) {
            const result = await checkLinkedInJob(jobId);
            if (result.status === 'completed' && result.data) {
              linkedinDataFromUrl = processLinkedInData(result.data);
              break;
            } else if (result.status === 'failed') {
              throw new Error('LinkedIn job failed');
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          }
          
          if (!linkedinDataFromUrl) {
            throw new Error('LinkedIn job timed out');
          }
        }
        
        // Update LinkedIn job completion status
        await serverSupabase
          .from('applicants')
          .update({
            linkedin_job_status: 'completed',
            linkedin_job_completed_at: new Date().toISOString()
          })
          .eq('id', applicantId);
        
        console.log(`✅ LinkedIn processing completed for ${applicantId}`);
        
      } catch (error) {
        console.error(`LinkedIn processing failed for ${applicantId}:`, error);
        await serverSupabase
          .from('applicants')
          .update({ linkedin_job_status: 'failed' })
          .eq('id', applicantId);
      }
    }

    // Generate unique temp directory suffix for CV processing
    const cvTempSuffix = `cv_${applicantId}_${Date.now()}`;

    console.log(`Processing data sources for applicant ${applicantId}`);

    const processingPromises = [];

    // Process CV if provided
    if (cvFile) {
      processingPromises.push(
        (async () => {
          try {
            // Convert File to buffer for processing
            const arrayBuffer = await cvFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // For now, we'll need to save to temp file since processCvPdf expects a file path
            // TODO: Update processCvPdf to accept buffer directly
            const tempFilePath = `/tmp/cv_${applicantId}_${Date.now()}.pdf`;
            fs.writeFileSync(tempFilePath, buffer);
            
            const rawCvData = await processCvPdf(tempFilePath, true, cvTempSuffix);
            
            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            
            return {
              type: 'cv',
              data: validateAndCleanCvData(rawCvData)
            };
          } catch (error) {
            console.error(`CV processing failed for ${applicantId}:`, error);
            throw error;
          }
        })()
      );
    }

    // Process GitHub if URL is provided
    if (githubUrl) {
      processingPromises.push(
        processGitHubAccount(githubUrl, {
          maxRepos: 50,
          includeOrganizations: true,
          analyzeContent: true,
          maxContentAnalysis: 3,
          includeActivity: true
        }).then(githubData => ({
          type: 'github',
          data: githubData
        })).catch(error => {
          console.warn(`GitHub processing failed for ${applicantId}:`, error);
          return { type: 'github', data: null, error: error.message };
        })
      );
    }

    // Wait for all processing to complete
    const results = await Promise.allSettled(processingPromises);

    // Process results
    let cvData: CvData | null = null;
    const linkedinData: LinkedInData | null = linkedinDataFromUrl; // LinkedIn data from URL API
    let githubData: GitHubData | null = null;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.type === 'cv') {
          cvData = result.value.data as CvData;
        } else if (result.value.type === 'github') {
          githubData = result.value.data as GitHubData;
        }
      } else {
        console.error(`Processing failed for ${applicantId}:`, result.reason);
      }
    }

    // Determine primary data source for name/email (prefer LinkedIn, fallback to CV)
    let name = 'Unknown';
    let email = '';
    let role = '';

    if (linkedinData) {
      // LinkedInData from URL API
      name = linkedinData.name || 'Unknown';
      email = ''; // LinkedIn API doesn't provide email
      role = linkedinData.headline || '';
    } else if (cvData) {
      // CvData from PDF
      name = `${cvData.firstName} ${cvData.lastName}`.trim() || 'Unknown';
      email = cvData.email || '';
      role = cvData.jobTitle || '';
    }

    // Update applicant with all processed data at once
    const updateResult = await serverSupabase
      .from('applicants')
      .update({
        cv_data: cvData,
        linkedin_data: linkedinData || null,
        github_data: githubData || null,
        name,
        email,
        role,
        status: 'analyzing'
      })
      .eq('id', applicantId)
      .select()
      .single();
      
    if (updateResult.error) {
      throw new Error(`Failed to update applicant: ${updateResult.error.message}`);
    }
    
    const updatedApplicant = updateResult.data;

    console.log(`Data processing completed for applicant ${applicantId}, starting analysis...`);

    // Perform comprehensive analysis
    try {
      const analyzedApplicant = await analyzeApplicant(updatedApplicant);

      // Save final results with analysis
      await serverSupabase
        .from('applicants')
        .update({
          status: 'completed',
          analysis_result: analyzedApplicant.analysis_result,
          individual_analysis: analyzedApplicant.individual_analysis,
          cross_reference_analysis: analyzedApplicant.cross_reference_analysis,
          score: analyzedApplicant.analysis_result?.credibilityScore
        })
        .eq('id', applicantId);

      console.log(`Analysis completed for applicant ${applicantId} with credibility score: ${analyzedApplicant.analysis_result?.credibilityScore || 'N/A'}`);
    } catch (analysisError) {
      console.error(`Analysis failed for applicant ${applicantId}:`, analysisError);

      // Even if analysis fails, we can still mark as completed with the data we have
      await serverSupabase
        .from('applicants')
        .update({
          status: 'completed',
          analysis_result: {
            credibilityScore: 50,
            summary: 'Analysis could not be completed due to technical error.',
            flags: [{
              type: 'yellow',
              category: 'verification',
              message: 'Credibility analysis failed',
              severity: 5
            }],
            suggestedQuestions: ['Could you provide additional information to verify your background?'],
            analysisDate: new Date().toISOString(),
            sources: []
          }
        })
        .eq('id', applicantId);

      console.log(`Applicant ${applicantId} marked as completed despite analysis failure`);
    }

  } catch (error) {
    console.error(`Error processing applicant ${applicantId}:`, error);

    try {
      const serverSupabase = await createClient();
      await serverSupabase
        .from('applicants')
        .update({ status: 'failed' })
        .eq('id', applicantId);
    } catch (updateError) {
      console.error(`Failed to update applicant status to failed:`, updateError);
    }
  }
}

