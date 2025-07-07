import { NextRequest, NextResponse } from 'next/server';
import { Applicant } from '@/lib/interfaces/applicant';
import { CvData } from '@/lib/interfaces/cv';
import { processCvPdf, validateAndCleanCvData, processLinkedInPdf } from '@/lib/cv';
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
    const githubFile = formData.get('githubFile') as File;

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
      originalFileName: cvFile.name
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

    // Save GitHub file if provided
    if (githubFile) {
      const githubBuffer = Buffer.from(await githubFile.arrayBuffer());
      const githubExt = githubFile.name.endsWith('.html') ? 'html' : 'pdf';
      saveApplicantFile(applicantId, githubBuffer, `github.${githubExt}`);
    }

    // Process asynchronously
    processApplicantAsync(applicantId);

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

async function processApplicantAsync(applicantId: string) {
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
    const score = calculateScore(cvData);

    // Update applicant with processed data
    applicant.cvData = cvData;
    applicant.linkedinData = linkedinData || undefined;
    applicant.name = `${cvData.firstName} ${cvData.lastName}`.trim() || 'Unknown';
    applicant.email = cvData.email || '';
    applicant.role = cvData.jobTitle || '';
    applicant.score = score;
    applicant.status = 'completed';

    saveApplicant(applicant);

    console.log(`Successfully processed applicant ${applicantId}${linkedinData ? ' (with LinkedIn data)' : ''}`);

  } catch (error) {
    console.error(`Error processing applicant ${applicantId}:`, error);

    const applicant = loadApplicant(applicantId);
    if (applicant) {
      applicant.status = 'failed';
      saveApplicant(applicant);
    }
  }
}

function calculateScore(cvData: CvData): number {
  let score = 50; // Base score

  // Add points for completeness
  if (cvData.email) score += 5;
  if (cvData.phone) score += 5;
  if (cvData.professionalSummary) score += 10;
  if (cvData.professionalExperiences?.length > 0) score += 15;
  if (cvData.educations?.length > 0) score += 10;
  if (cvData.skills?.length > 0) score += 5;

  return Math.min(score, 100);
}
