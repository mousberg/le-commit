import * as fs from 'fs';
import * as path from 'path';
import { Applicant } from './interfaces/applicant';

const DATA_DIR = path.join(process.cwd(), 'data', 'applicants');

// Ensure data directory exists
export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Get applicant directory path
export function getApplicantDir(applicantId: string): string {
  return path.join(DATA_DIR, applicantId);
}

// Get applicant file paths
export function getApplicantPaths(applicantId: string) {
  const dir = getApplicantDir(applicantId);
  return {
    dir,
    applicantJson: path.join(dir, 'applicant.json'),
    cvPdf: path.join(dir, 'cv.pdf'),
    linkedinFile: path.join(dir, 'linkedin.pdf'),
    githubFile: path.join(dir, 'github.pdf')
  };
}

// Save applicant data
export function saveApplicant(applicant: Applicant): void {
  const paths = getApplicantPaths(applicant.id);

  // Ensure applicant directory exists
  if (!fs.existsSync(paths.dir)) {
    fs.mkdirSync(paths.dir, { recursive: true });
  }

  // Save applicant metadata and all data in one file
  fs.writeFileSync(paths.applicantJson, JSON.stringify(applicant, null, 2));
}

// Load applicant data
export function loadApplicant(applicantId: string): Applicant | null {
  const paths = getApplicantPaths(applicantId);

  try {
    if (!fs.existsSync(paths.applicantJson)) {
      return null;
    }

    const data = fs.readFileSync(paths.applicantJson, 'utf8');
    return JSON.parse(data) as Applicant;
  } catch (error) {
    console.error('Error loading applicant:', error);
    return null;
  }
}

// Load all applicants
export function loadAllApplicants(): Applicant[] {
  ensureDataDir();

  try {
    const applicantDirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const applicants: Applicant[] = [];

    for (const dir of applicantDirs) {
      const applicant = loadApplicant(dir);
      if (applicant) {
        applicants.push(applicant);
      }
    }

    // Sort by creation date (newest first)
    return applicants.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error loading applicants:', error);
    return [];
  }
}

// Save file (CV, LinkedIn, or GitHub)
export function saveApplicantFile(applicantId: string, file: Buffer, filename: string): void {
  const dir = getApplicantDir(applicantId);
  const filePath = path.join(dir, filename);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, file);
}

// Delete applicant directory
export function deleteApplicant(applicantId: string): boolean {
  const dir = getApplicantDir(applicantId);

  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting applicant:', error);
    return false;
  }
}
