import { NextRequest, NextResponse } from 'next/server';
import { Applicant } from '@/lib/interfaces/applicant';
import { CvData } from '@/lib/interfaces/cv';
import { processCvPdf, validateAndCleanCvData } from '@/lib/cv';
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

    // Process CV
    console.log(`Processing CV for applicant ${applicantId}`);
    const rawCvData = await processCvPdf(paths.cvPdf, false); // Don't cleanup
    const cvData = validateAndCleanCvData(rawCvData);

    // Calculate a simple score based on available data
    const score = calculateScore(cvData);

    // Update applicant with CV data - everything goes in applicant.json
    applicant.cvData = cvData;
    applicant.name = `${cvData.firstName} ${cvData.lastName}`.trim() || 'Unknown';
    applicant.email = cvData.email || '';
    applicant.role = cvData.jobTitle || '';
    applicant.score = score;
    applicant.status = 'completed';

    saveApplicant(applicant);

    console.log(`Successfully processed applicant ${applicantId}`);

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
