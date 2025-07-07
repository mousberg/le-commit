import { CvData } from './index';
import { GitHubData } from './github';

export interface Applicant {
  id: string;
  name: string;
  email: string;
  cvData?: CvData;
  linkedinData?: CvData;
  githubData?: GitHubData;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  originalFileName?: string;
  originalGithubUrl?: string;
  score?: number; // For compatibility with board page
  role?: string; // Job title from CV
}

export interface CreateApplicantRequest {
  cvFile: File;
  linkedinFile?: File;
  githubUrl?: string;
}
