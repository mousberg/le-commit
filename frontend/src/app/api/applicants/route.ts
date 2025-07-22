import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { CvData } from '@/lib/interfaces/cv';
import { GitHubData } from '@/lib/interfaces/github';
import { processCvPdf, validateAndCleanCvData, processLinkedInPdf } from '@/lib/cv';
import { processGitHubAccount } from '@/lib/github';
import { analyzeApplicant } from '@/lib/analysis';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // List user's applicants with filtering using server-side client
    let query = supabase
      .from('applicants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const applicantsResult = await query;

    if (applicantsResult.error) {
      throw new Error(`Failed to fetch applicants: ${applicantsResult.error.message}`);
    }

    const applicants = applicantsResult.data;

    return NextResponse.json({
      applicants,
      total: applicants.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching applicants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applicants', success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const cvFile = formData.get('cvFile') as File;
    const linkedinFile = formData.get('linkedinFile') as File;
    const githubUrl = formData.get('githubUrl') as string;

    if (!cvFile) {
      return NextResponse.json(
        { error: 'CV file is required', success: false },
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
        original_filename: cvFile.name,
        original_github_url: githubUrl || null
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
    processApplicantAsync(applicant.id, cvFile, linkedinFile, githubUrl);

    return NextResponse.json({
      applicant,
      success: true
    });

  } catch (error) {
    console.error('Error creating applicant:', error);
    return NextResponse.json(
      { error: 'Failed to create applicant', success: false },
      { status: 500 }
    );
  }
}

async function processApplicantAsync(applicantId: string, cvFile: File, linkedinFile?: File, githubUrl?: string) {
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

    // Generate unique temp directory suffixes to prevent race conditions
    const cvTempSuffix = `cv_${applicantId}_${Date.now()}`;
    const linkedinTempSuffix = `linkedin_${applicantId}_${Date.now()}`;

    console.log(`Processing all data sources for applicant ${applicantId}`);

    const processingPromises = [];

    // Always process CV (required)
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

    // Process LinkedIn if file exists
    if (linkedinFile) {
      processingPromises.push(
        (async () => {
          try {
            const arrayBuffer = await linkedinFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const tempFilePath = `/tmp/linkedin_${applicantId}_${Date.now()}.pdf`;
            fs.writeFileSync(tempFilePath, buffer);
            
            const rawLinkedinData = await processLinkedInPdf(tempFilePath, true, linkedinTempSuffix);
            
            fs.unlinkSync(tempFilePath);
            
            return {
              type: 'linkedin',
              data: validateAndCleanCvData(rawLinkedinData)
            };
          } catch (error) {
            console.warn(`LinkedIn processing failed for ${applicantId}:`, error);
            return { type: 'linkedin', data: null, error: error instanceof Error ? error.message : String(error) };
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
    let linkedinData: CvData | null = null;
    let githubData: GitHubData | null = null;
    let hasErrors = false;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.type === 'cv') {
          cvData = result.value.data as CvData;
        } else if (result.value.type === 'linkedin') {
          linkedinData = result.value.data as CvData;
        } else if (result.value.type === 'github') {
          githubData = result.value.data as GitHubData;
        }
      } else {
        console.error(`Processing failed for ${applicantId}:`, result.reason);
        if (result.reason?.message?.includes('CV')) {
          hasErrors = true;
        }
      }
    }

    // CV processing is required for successful completion
    if (!cvData || hasErrors) {
      throw new Error('CV processing failed');
    }

    // Update applicant with all processed data at once
    const updateResult = await serverSupabase
      .from('applicants')
      .update({
        cv_data: cvData,
        linkedin_data: linkedinData || null,
        github_data: githubData || null,
        name: `${cvData.firstName} ${cvData.lastName}`.trim() || 'Unknown',
        email: cvData.email || '',
        role: cvData.jobTitle || '',
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
