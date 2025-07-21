import { NextRequest, NextResponse } from 'next/server';
import { CvData } from '@/lib/interfaces/cv';
import { GitHubData } from '@/lib/interfaces/github';
import { processCvPdf, validateAndCleanCvData, processLinkedInPdf } from '@/lib/cv';
import { processGitHubAccount } from '@/lib/github';
import { analyzeApplicant } from '@/lib/analysis';
import { getServerDatabaseService } from '@/lib/services/database.server';
import { createStorageService } from '@/lib/services/storage';
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
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required', success: false },
        { status: 400 }
      );
    }

    // Get database service
    const dbService = await getServerDatabaseService();

    // Validate workspace access
    const hasAccess =await dbService.validateWorkspaceAccess(workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to workspace', success: false },
        { status: 403 }
      );
    }

    // List applicants with filtering
    const applicants = await dbService.listApplicants({
      workspaceId,
      status: status as 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed' | undefined,
      search: search || undefined,
      limit,
      offset
    });

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
    const workspaceId = formData.get('workspaceId') as string;

    if (!cvFile) {
      return NextResponse.json(
        { error: 'CV file is required', success: false },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required', success: false },
        { status: 400 }
      );
    }

    // Get database service
    const dbService = await getServerDatabaseService();

    // Validate workspace access (admin or owner required for creating applicants)
    const hasAccess = await dbService.validateWorkspaceAccess(workspaceId, user.id, 'admin');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to workspace', success: false },
        { status: 403 }
      );
    }

    // Create initial applicant record in database
    const applicant = await dbService.createApplicant({
      name: 'Processing...',
      email: '',
      workspaceId,
      status: 'uploading',
      originalFileName: cvFile.name,
      originalGithubUrl: githubUrl
    });

    // Get storage service
    const storageService = await createStorageService(dbService);

    // Upload CV file
    await storageService.uploadApplicantFile(
      workspaceId,
      applicant.id,
      cvFile,
      'cv',
      cvFile.name
    );

    // Upload LinkedIn file if provided
    if (linkedinFile) {
      await storageService.uploadApplicantFile(
        workspaceId,
        applicant.id,
        linkedinFile,
        'linkedin',
        linkedinFile.name
      );
    }

    // Process asynchronously
    processApplicantAsync(applicant.id, workspaceId, githubUrl);

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

async function processApplicantAsync(applicantId: string, workspaceId: string, githubUrl?: string) {
  try {
    // Get database and storage services
    const dbService = await getServerDatabaseService();
    const storageService = await createStorageService(dbService);

    // Get current applicant
    const applicant = await dbService.getApplicant(applicantId);
    if (!applicant) return;

    // Update status to processing
    await dbService.updateApplicantStatus(applicantId, 'processing');

    // Generate unique temp directory suffixes to prevent race conditions
    const cvTempSuffix = `cv_${applicantId}_${Date.now()}`;
    const linkedinTempSuffix = `linkedin_${applicantId}_${Date.now()}`;

    console.log(`Processing all data sources for applicant ${applicantId}`);

    const processingPromises = [];

    // Get file URLs for processing
    const fileRecords = await dbService.getApplicantFiles(applicantId);
    const cvFile = fileRecords.find(f => f.fileType === 'cv');
    const linkedinFile = fileRecords.find(f => f.fileType === 'linkedin');

    // Always process CV (required)
    if (cvFile) {
      processingPromises.push(
        (async () => {
          try {
            const cvUrl = await storageService.getSignedUrl(cvFile.storageBucket, cvFile.storagePath, 3600);
            const rawCvData = await processCvPdf(cvUrl, true, cvTempSuffix);
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

    // Process LinkedIn if file exists
    if (linkedinFile) {
      processingPromises.push(
        (async () => {
          try {
            const linkedinUrl = await storageService.getSignedUrl(linkedinFile.storageBucket, linkedinFile.storagePath, 3600);
            const rawLinkedinData = await processLinkedInPdf(linkedinUrl, true, linkedinTempSuffix);
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
          maxContentAnalysis: 3,  // Reduced from 10 to 3 for API efficiency
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
          hasErrors = true; // CV processing failure is critical
        }
      }
    }

    // CV processing is required for successful completion
    if (!cvData || hasErrors) {
      throw new Error('CV processing failed');
    }

    // Update applicant with all processed data at once
    const updatedApplicant = await dbService.updateApplicant(applicantId, {
      cvData: cvData as unknown as Record<string, unknown>,
      linkedinData: (linkedinData as unknown as Record<string, unknown>) || undefined,
      githubData: (githubData as unknown as Record<string, unknown>) || undefined,
      name: `${cvData.firstName} ${cvData.lastName}`.trim() || 'Unknown',
      email: cvData.email || '',
      role: cvData.jobTitle || '',
      status: 'analyzing'
    });

    console.log(`Data processing completed for applicant ${applicantId}${linkedinData ? ' (with LinkedIn data)' : ''}${githubData ? ' (with GitHub data)' : ''}, starting analysis...`);

    // Perform comprehensive analysis
    try {
      const analyzedApplicant = await analyzeApplicant(updatedApplicant);

      // Save final results with analysis
      await dbService.updateApplicant(applicantId, {
        status: 'completed',
        analysisResult: analyzedApplicant.analysisResult,
        individualAnalysis: analyzedApplicant.individualAnalysis,
        crossReferenceAnalysis: analyzedApplicant.crossReferenceAnalysis,
        score: analyzedApplicant.analysisResult?.credibilityScore
      });

      console.log(`Analysis completed for applicant ${applicantId} with credibility score: ${analyzedApplicant.analysisResult?.credibilityScore || 'N/A'}`);
    } catch (analysisError) {
      console.error(`Analysis failed for applicant ${applicantId}:`, analysisError);

      // Even if analysis fails, we can still mark as completed with the data we have
      await dbService.updateApplicant(applicantId, {
        status: 'completed',
        analysisResult: {
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
      });

      console.log(`Applicant ${applicantId} marked as completed despite analysis failure`);
    }

  } catch (error) {
    console.error(`Error processing applicant ${applicantId}:`, error);

    try {
      const dbService = await getServerDatabaseService();
      await dbService.updateApplicantStatus(applicantId, 'failed');
    } catch (updateError) {
      console.error(`Failed to update applicant status to failed:`, updateError);
    }
  }
}
