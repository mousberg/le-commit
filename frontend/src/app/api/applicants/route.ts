import { NextRequest, NextResponse } from 'next/server';
import { Applicant } from '@/lib/interfaces/applicant';
import {
  loadAllApplicants,
  loadApplicant,
  saveApplicant,
  saveApplicantFile,
  ensureDataDir,
  saveLinkedInRawData,
  getApplicantPaths
} from '@/lib/fileStorage';
import { startLinkedInJob, checkLinkedInJob, processLinkedInData, pollLinkedInJob } from '@/lib/linkedin-api';
import { processCvPdf, validateAndCleanCvData } from '@/lib/profile-pdf';
import { processGitHubAccount } from '@/lib/github';
import { analyzeApplicant } from '@/lib/analysis';

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
    const linkedinUrl = formData.get('linkedinUrl') as string;
    const githubUrl = formData.get('githubUrl') as string;

    if (!cvFile && !linkedinUrl) {
      return NextResponse.json(
        { error: 'Either CV file or LinkedIn profile URL is required', success: false },
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
      originalFileName: cvFile?.name,
      originalGithubUrl: githubUrl,
      originalLinkedinUrl: linkedinUrl
    };

    // Save initial record
    saveApplicant(applicant);

    // Save CV file if provided
    if (cvFile) {
      const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
      saveApplicantFile(applicantId, cvBuffer, 'cv.pdf');
    }

    // Start async processing
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
    const applicant = loadApplicant(applicantId);
    if (!applicant) {
      console.error(`Applicant ${applicantId} not found`);
      return;
    }

    // Update status to processing
    applicant.status = 'processing';
    saveApplicant(applicant);

    // Process LinkedIn FIRST if URL provided
    if (applicant.originalLinkedinUrl) {
      try {
        console.log(`🚀 Starting LinkedIn job for ${applicantId}`);
        const { jobId } = await startLinkedInJob(applicant.originalLinkedinUrl);
        
        // Update applicant with job ID
        applicant.linkedinJobId = jobId;
        applicant.linkedinJobStatus = 'running';
        applicant.linkedinJobStartedAt = new Date().toISOString();
        saveApplicant(applicant);

        // Poll until complete
        console.log(`⏳ Waiting for LinkedIn job ${jobId} to complete...`);
        const linkedinData = await pollLinkedInJob(jobId);
        
        // Save LinkedIn data
        applicant.linkedinData = linkedinData;
        applicant.linkedinJobStatus = 'completed';
        applicant.linkedinJobCompletedAt = new Date().toISOString();
        
        // Update name/email from LinkedIn
        applicant.name = `${linkedinData.firstName} ${linkedinData.lastName}`.trim() || 'Unknown';
        applicant.email = linkedinData.email || applicant.email;
        applicant.role = linkedinData.jobTitle || applicant.role;
        
        saveApplicant(applicant);
        console.log(`✅ LinkedIn processing completed for ${applicantId}`);
        
      } catch (error) {
        console.error(`LinkedIn processing failed for ${applicantId}:`, error);
        applicant.linkedinJobStatus = 'failed';
        saveApplicant(applicant);
      }
    }

    // Process CV if available (after LinkedIn)
    let cvData = null;
    if (applicant.originalFileName) {
      try {
        const paths = getApplicantPaths(applicantId);
        const fs = await import('fs');
        if (fs.existsSync(paths.cvPdf)) {
          console.log(`📄 Processing CV for ${applicantId}`);
          const rawCvData = await processCvPdf(paths.cvPdf, true, `cv_${applicantId}`);
          cvData = validateAndCleanCvData(rawCvData, 'cv');
          applicant.cvData = cvData;
          
          // Update name/email if not set by LinkedIn
          if (!applicant.linkedinData && cvData) {
            applicant.name = `${cvData.firstName} ${cvData.lastName}`.trim() || 'Unknown';
            applicant.email = cvData.email || applicant.email;
            applicant.role = cvData.jobTitle || applicant.role;
          }
          
          saveApplicant(applicant);
        }
      } catch (error) {
        console.error(`CV processing failed for ${applicantId}:`, error);
      }
    }

    // Process GitHub if available (after LinkedIn and CV)
    if (applicant.originalGithubUrl) {
      try {
        console.log(`🐙 Processing GitHub for ${applicantId}`);
        const githubData = await processGitHubAccount(applicant.originalGithubUrl, {
          maxRepos: 50,
          includeOrganizations: true,
          analyzeContent: true,
          maxContentAnalysis: 3,
          includeActivity: true
        });
        
        applicant.githubData = githubData;
        
        // Update email if still not set
        if (!applicant.email && githubData.email) {
          applicant.email = githubData.email;
        }
        
        saveApplicant(applicant);
      } catch (error) {
        console.error(`GitHub processing failed for ${applicantId}:`, error);
      }
    }

    // Update status to analyzing
    applicant.status = 'analyzing';
    saveApplicant(applicant);

    // Run analysis
    try {
      const analyzedApplicant = await analyzeApplicant(applicant);
      analyzedApplicant.status = 'completed';
      saveApplicant(analyzedApplicant);
      console.log(`✅ Analysis completed for ${applicantId}`);
    } catch (error) {
      console.error(`Analysis failed for ${applicantId}:`, error);
      applicant.status = 'completed';
      saveApplicant(applicant);
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

