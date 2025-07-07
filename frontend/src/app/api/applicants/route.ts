import { NextRequest, NextResponse } from 'next/server';
import { Applicant } from '@/lib/interfaces/applicant';
import { CvData } from '@/lib/interfaces/cv';
import { GitHubData } from '@/lib/interfaces/github';
import { processCvPdf, validateAndCleanCvData, processLinkedInPdf } from '@/lib/cv';
import { processGitHubAccount } from '@/lib/github';
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

    // Process CV and LinkedIn in parallel
    console.log(`Processing files for applicant ${applicantId}`);

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

    // Wait for all processing to complete
    const results = await Promise.allSettled(processingPromises);

    // Process results
    let cvData: CvData | null = null;
    let linkedinData: CvData | null = null;
    let hasErrors = false;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.type === 'cv') {
          cvData = result.value.data as CvData;
        } else if (result.value.type === 'linkedin') {
          linkedinData = result.value.data as CvData;
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

    // Calculate a simple score based on available data
    const score = calculateScore(cvData, linkedinData, applicant.githubData);

    // Update applicant with processed data
    applicant.cvData = cvData;
    applicant.linkedinData = linkedinData || undefined;
    applicant.name = `${cvData.firstName} ${cvData.lastName}`.trim() || 'Unknown';
    applicant.email = cvData.email || '';
    applicant.role = cvData.jobTitle || '';
    applicant.score = score;
    applicant.status = 'completed';

    saveApplicant(applicant);

    console.log(`Successfully processed applicant ${applicantId}${linkedinData ? ' (with LinkedIn data)' : ''}${applicant.githubData ? ' (with GitHub data)' : ''}`);

    // Process GitHub account if URL is provided
    if (githubUrl) {
      try {
        console.log(`Processing GitHub account: ${githubUrl}`);
        const githubData = await processGitHubAccount(githubUrl, {
          maxRepos: 50,
          includeOrganizations: true,
          analyzeContent: true,
          maxContentAnalysis: 10,
          includeActivity: true
        });
        
        // Update applicant with GitHub data
        applicant.githubData = githubData;
        saveApplicant(applicant);
        
        console.log(`Successfully processed GitHub data for ${applicantId}`);
      } catch (githubError) {
        console.error(`Error processing GitHub account for ${applicantId}:`, githubError);
        // Continue without GitHub data rather than failing the entire process
      }
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

function calculateScore(cvData: CvData, githubData?: GitHubData): number {
  let score = 50; // Base score

  // Add points for CV completeness
  if (cvData.email) score += 5;
  if (cvData.phone) score += 5;
  if (cvData.professionalSummary) score += 10;
  if (cvData.professionalExperiences?.length > 0) score += 15;
  if (cvData.educations?.length > 0) score += 10;
  if (cvData.skills?.length > 0) score += 5;

  // Add points for LinkedIn data
  if (linkedinData) {
    score += 10; // Base bonus for having LinkedIn data
    if (linkedinData.professionalExperiences?.length > 0) score += 5;
    if (linkedinData.skills?.length > 0) score += 3;
  }

  // Add points for GitHub data
  if (githubData) {
    score += 15; // Base bonus for having GitHub data
    
    // Repository activity scoring
    if (githubData.publicRepos > 0) score += 5;
    if (githubData.publicRepos > 10) score += 5;
    
    // Contribution activity scoring
    if (githubData.contributions?.totalCommits > 0) score += 5;
    if (githubData.contributions?.streakDays > 7) score += 3;
    
    // Social proof scoring
    if (githubData.followers > 10) score += 3;
    if (githubData.starredRepos > 50) score += 2;
    
    // Quality indicators
    if (githubData.overallQualityScore && githubData.overallQualityScore.overall > 70) score += 5;
    if (githubData.activityAnalysis?.commitFrequency.conventionalCommits) score += 2;
  }

  return Math.min(score, 100);
}