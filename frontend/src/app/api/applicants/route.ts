import { NextRequest, NextResponse } from 'next/server';
import { Applicant } from '@/lib/interfaces/applicant';
import { CvData } from '@/lib/interfaces/cv';
import { GitHubData } from '@/lib/interfaces/github';
import { processCvPdf, validateAndCleanCvData, processLinkedInPdf } from '@/lib/cv';
import { processGitHubAccount } from '@/lib/github';
import { analyzeApplicant } from '@/lib/analysis';
import * as fs from 'fs';
import {
  loadAllApplicants,
  loadApplicant,
  saveApplicant,
  saveApplicantFile,
  getApplicantPaths,
  ensureDataDir
} from '@/lib/fileStorage';

export async function GET() {
  try {
    const applicants = loadAllApplicants();

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
    ensureDataDir();

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

    const applicantId = crypto.randomUUID();

    // Create initial applicant record
    const applicant: Applicant = {
      id: applicantId,
      name: 'Processing...',
      email: '',
      status: 'uploading',
      createdAt: new Date().toISOString(),
      originalFileName: cvFile.name,
      originalGithubUrl: githubUrl
    };

    // Save initial record
    saveApplicant(applicant);

    // Save CV file
    const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
    saveApplicantFile(applicantId, cvBuffer, 'cv.pdf');

    // Save LinkedIn file if provided
    if (linkedinFile) {
      const linkedinBuffer = Buffer.from(await linkedinFile.arrayBuffer());
      const linkedinExt = linkedinFile.name.endsWith('.html') ? 'html' : 'pdf';
      saveApplicantFile(applicantId, linkedinBuffer, `linkedin.${linkedinExt}`);
    }

    // Process asynchronously
    processApplicantAsync(applicantId, githubUrl);

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

async function processApplicantAsync(applicantId: string, githubUrl?: string) {
  try {
    const paths = getApplicantPaths(applicantId);
    const applicant = loadApplicant(applicantId);

    if (!applicant) return;

    // Update status to processing
    applicant.status = 'processing';
    saveApplicant(applicant);

    // Generate unique temp directory suffixes to prevent race conditions
    const cvTempSuffix = `cv_${applicantId}_${Date.now()}`;
    const linkedinTempSuffix = `linkedin_${applicantId}_${Date.now()}`;

        // Process CV, LinkedIn, and GitHub all in parallel
    console.log(`Processing all data sources for applicant ${applicantId}`);

    const processingPromises = [];

    // Always process CV (required)
    processingPromises.push(
      processCvPdf(paths.cvPdf, true, cvTempSuffix).then(rawCvData => ({
        type: 'cv',
        data: validateAndCleanCvData(rawCvData)
      }))
    );

    // Process LinkedIn if file exists
    if (paths.linkedinFile && fs.existsSync(paths.linkedinFile)) {
      processingPromises.push(
        processLinkedInPdf(paths.linkedinFile, true, linkedinTempSuffix).then(rawLinkedinData => ({
          type: 'linkedin',
          data: validateAndCleanCvData(rawLinkedinData)
        })).catch(error => {
          console.warn(`LinkedIn processing failed for ${applicantId}:`, error);
          return { type: 'linkedin', data: null, error: error.message };
        })
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
    applicant.cvData = cvData;
    applicant.linkedinData = linkedinData || undefined;
    applicant.githubData = githubData || undefined;
    applicant.name = `${cvData.firstName} ${cvData.lastName}`.trim() || 'Unknown';
    applicant.email = cvData.email || '';
    applicant.role = cvData.jobTitle || '';
    applicant.status = 'analyzing';

    // Save intermediate state before analysis
    saveApplicant(applicant);

    console.log(`Data processing completed for applicant ${applicantId}${linkedinData ? ' (with LinkedIn data)' : ''}${githubData ? ' (with GitHub data)' : ''}, starting analysis...`);

    // Perform comprehensive analysis
    try {
      const analyzedApplicant = await analyzeApplicant(applicant);

      // Save final results with analysis
      analyzedApplicant.status = 'completed';
      saveApplicant(analyzedApplicant);

      console.log(`Analysis completed for applicant ${applicantId} with credibility score: ${analyzedApplicant.analysisResult?.credibilityScore || 'N/A'}`);
    } catch (analysisError) {
      console.error(`Analysis failed for applicant ${applicantId}:`, analysisError);

      // Even if analysis fails, we can still mark as completed with the data we have
      applicant.status = 'completed';
      applicant.analysisResult = {
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
      };
      saveApplicant(applicant);

      console.log(`Applicant ${applicantId} marked as completed despite analysis failure`);
    }

  } catch (error) {
    console.error(`Error processing applicant ${applicantId}:`, error);

    const applicant = loadApplicant(applicantId);
    if (applicant) {
      applicant.status = 'failed';
      saveApplicant(applicant);
    }
  }
}
