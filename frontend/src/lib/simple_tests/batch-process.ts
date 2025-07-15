#!/usr/bin/env npx tsx

import * as fs from 'fs';
import * as path from 'path';
import type { Applicant } from '../interfaces/applicant';
import type { CvData } from '../interfaces/cv';
import type { GitHubData } from '../interfaces/github';

interface CsvRow {
  name?: string;
  email?: string;
  linkedin?: string;
  github?: string;
  cv?: string;
  team_name?: string;
  problems_interested?: string;
  no_team?: string;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: CsvRow = {};
    
    headers.forEach((header, index) => {
      if (values[index]) {
        switch (header) {
          case 'name':
            row.name = values[index];
            break;
          case 'email':
            row.email = values[index];
            break;
          case 'linkedin':
          case 'what is your linkedin profile?':
            row.linkedin = values[index];
            break;
          case 'github':
          case 'github repo':
            row.github = values[index];
            break;
          case 'cv':
            row.cv = values[index];
            break;
          case 'team name':
          case 'team name - make sure your whole team signs up using the same team name!':
            row.team_name = values[index];
            break;
          case 'problems':
          case 'what problems are you interested in solving?':
            row.problems_interested = values[index];
            break;
          case 'no team':
          case 'i don\'t have a team':
            row.no_team = values[index];
            break;
        }
      }
    });
    
    rows.push(row);
  }
  
  return rows;
}

async function copyFileToApplicantDir(sourcePath: string, applicantId: string, filename: string): Promise<void> {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`CV file not found: ${sourcePath}`);
  }
  
  const { saveApplicantFile } = await import('../fileStorage');
  const fileBuffer = fs.readFileSync(sourcePath);
  saveApplicantFile(applicantId, fileBuffer, filename);
}

async function processApplicantFromCsv(row: CsvRow): Promise<string> {
  const applicantId = crypto.randomUUID();
  
  // Validate required fields
  if (!row.linkedin && !row.cv) {
    throw new Error('At least one of LinkedIn or CV is required');
  }
  
  // Create initial applicant record
  const applicant: Applicant = {
    id: applicantId,
    name: row.name || 'Processing...',
    email: row.email || '',
    status: 'uploading',
    createdAt: new Date().toISOString(),
    originalFileName: row.cv ? path.basename(row.cv) : undefined,
    originalGithubUrl: row.github,
    originalLinkedinUrl: (row.linkedin && row.linkedin.startsWith('http')) ? row.linkedin : undefined,
    hackathonData: {
      teamName: row.team_name,
      problemsInterested: row.problems_interested,
      hasTeam: row.no_team?.toLowerCase() === 'no'
    }
  };
  
  // Save initial record
  const { saveApplicant } = await import('../fileStorage');
  saveApplicant(applicant);
  
  // Copy CV file if provided
  if (row.cv) {
    const cvExtension = path.extname(row.cv).toLowerCase();
    const cvFilename = cvExtension === '.pdf' ? 'cv.pdf' : `cv${cvExtension}`;
    await copyFileToApplicantDir(row.cv, applicantId, cvFilename);
  }
  
  // Process LinkedIn file if it's a file path
  if (row.linkedin && (row.linkedin.includes('/') || row.linkedin.includes('\\'))) {
    const linkedinExtension = path.extname(row.linkedin).toLowerCase();
    const linkedinFilename = linkedinExtension === '.pdf' ? 'linkedin.pdf' : `linkedin${linkedinExtension}`;
    await copyFileToApplicantDir(row.linkedin, applicantId, linkedinFilename);
  }
  
  // Process asynchronously
  await processApplicantData(applicantId, row);
  
  return applicantId;
}

async function processApplicantData(applicantId: string, row: CsvRow): Promise<void> {
  try {
    const { getApplicantPaths, saveApplicant } = await import('../fileStorage');
    const paths = getApplicantPaths(applicantId);
    const applicant: Applicant = {
      ...JSON.parse(fs.readFileSync(paths.applicantJson, 'utf8')),
      status: 'processing'
    };
    saveApplicant(applicant);
    
    console.log(`Processing applicant ${applicantId} (${applicant.name})`);
    
    // Import all modules upfront
    const cvModule = await import('../cv');
    const githubModule = await import('../github');
    
    const processingPromises = [];
    
    // Process CV if file exists
    if (fs.existsSync(paths.cvPdf)) {
      console.log(`  - Processing CV file`);
      processingPromises.push(
        cvModule.processCvPdf(paths.cvPdf, true, `cv_${applicantId}_${Date.now()}`).then(rawCvData => ({
          type: 'cv',
          data: cvModule.validateAndCleanCvData(rawCvData, 'cv')
        })).catch(error => {
          console.warn(`CV processing failed for ${applicantId}:`, error);
          return { type: 'cv', data: null, error: error.message };
        })
      );
    }
    
    // Process LinkedIn if file exists
    if (paths.linkedinFile && fs.existsSync(paths.linkedinFile)) {
      console.log(`  - Processing LinkedIn file`);
      processingPromises.push(
        cvModule.processLinkedInPdf(paths.linkedinFile, true, `linkedin_${applicantId}_${Date.now()}`).then(rawLinkedinData => ({
          type: 'linkedin',
          data: cvModule.validateAndCleanCvData(rawLinkedinData, 'linkedin')
        })).catch(error => {
          console.warn(`LinkedIn processing failed for ${applicantId}:`, error);
          return { type: 'linkedin', data: null, error: error.message };
        })
      );
    }
    
    // Process LinkedIn URL if provided
    if (row.linkedin && row.linkedin.startsWith('http')) {
      console.log(`  - Processing LinkedIn URL: ${row.linkedin}`);
      processingPromises.push(
        cvModule.processLinkedInUrl(row.linkedin).then(linkedinData => ({
          type: 'linkedin',
          data: linkedinData
        })).catch(error => {
          console.warn(`LinkedIn URL processing failed for ${applicantId}:`, error);
          return { type: 'linkedin', data: null, error: error.message };
        })
      );
    }
    
    // Process GitHub if URL is provided
    if (row.github && row.github.startsWith('http')) {
      console.log(`  - Processing GitHub: ${row.github}`);
      processingPromises.push(
        githubModule.processGitHubAccount(row.github, {
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
      }
    }
    
    // At least CV or LinkedIn data is required for successful completion
    if (!cvData && !linkedinData) {
      throw new Error('Both CV and LinkedIn processing failed - no usable profile data');
    }
    
    // Update applicant with all processed data
    applicant.cvData = cvData || undefined;
    applicant.linkedinData = linkedinData || undefined;
    applicant.githubData = githubData || undefined;
    
    // Extract name and email from available data sources
    // Priority: LinkedIn > CV > GitHub > CSV
    const primaryData = linkedinData || cvData;
    const githubName = githubData?.name || githubData?.username;
    
    applicant.name = primaryData 
      ? `${primaryData.firstName} ${primaryData.lastName}`.trim() || row.name || 'Unknown'
      : githubName || row.name || 'Unknown';
    applicant.email = primaryData?.email || githubData?.email || row.email || '';
    applicant.role = primaryData?.jobTitle || '';
    applicant.status = 'analyzing';
    
    // Save intermediate state before analysis
    saveApplicant(applicant);
    
    console.log(`  - Data processing completed, starting analysis...`);
    
    // Perform comprehensive analysis
    try {
      const { analyzeApplicant } = await import('../analysis');
      const analyzedApplicant = await analyzeApplicant(applicant);
      
      // Save final results with analysis
      analyzedApplicant.status = 'completed';
      saveApplicant(analyzedApplicant);
      
      console.log(`  ✅ Analysis completed with credibility score: ${analyzedApplicant.analysisResult?.credibilityScore || 'N/A'}`);
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
      
      console.log(`  ⚠️  Applicant marked as completed despite analysis failure`);
    }
    
  } catch (error) {
    console.error(`Error processing applicant ${applicantId}:`, error);
    
    const { getApplicantPaths, saveApplicant } = await import('../fileStorage');
    const applicant = JSON.parse(fs.readFileSync(getApplicantPaths(applicantId).applicantJson, 'utf8'));
    applicant.status = 'failed';
    saveApplicant(applicant);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx tsx batch-process.ts <csv-file>');
    console.log('');
    console.log('Hackathon CSV format:');
    console.log('email,phone_number,Team Name,What is your LinkedIn profile?,Github Repo,What problems are you interested in solving?,I don\'t have a team');
    console.log('');
    console.log('Standard CSV format:');
    console.log('name,email,linkedin,github,cv');
    console.log('John Doe,john@example.com,https://linkedin.com/in/johndoe,https://github.com/johndoe,/path/to/cv.pdf');
    console.log('');
    console.log('Notes:');
    console.log('- At least one of linkedin or cv is required');
    console.log('- linkedin can be a URL or file path to downloaded profile');
    console.log('- cv must be a file path (PDF, DOC, or DOCX)');
    console.log('- github is optional (provide URL if available)');
    console.log('- name and email are optional (will be extracted from other sources)');
    console.log('');
    console.log('After processing, run hackathon analysis:');
    console.log('npx tsx hackathon-analysis.ts');
    process.exit(1);
  }
  
  const csvFile = args[0];
  
  if (!fs.existsSync(csvFile)) {
    console.error(`CSV file not found: ${csvFile}`);
    process.exit(1);
  }
  
  // Ensure data directory exists
  const { ensureDataDir } = await import('../fileStorage');
  ensureDataDir();
  
  // Parse CSV
  const csvContent = fs.readFileSync(csvFile, 'utf8');
  const rows = parseCsv(csvContent);
  
  console.log(`Found ${rows.length} rows to process`);
  
  // Process each row
  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`\n[${i + 1}/${rows.length}] Processing: ${row.name || row.email || row.github || 'Unknown'}`);
    
    try {
      const applicantId = await processApplicantFromCsv(row);
      results.push({ success: true, applicantId, row });
      console.log(`✅ Successfully processed applicant ${applicantId}`);
    } catch (error) {
      results.push({ success: false, error: error.message, row });
      console.error(`❌ Failed to process row:`, error.message);
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successfully processed: ${successful}`);
  console.log(`  ❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log(`\n❌ Failed rows:`);
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.row.name || result.row.email || 'Unknown'}: ${result.error}`);
    });
  }
}

if (require.main === module) {
  main().catch(console.error);
}