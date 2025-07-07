import { CvData } from './index';

export interface Applicant {
  id: string;
  name: string;
  email: string;
  cvData?: CvData;
  linkedinData?: CvData;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  originalFileName?: string;
  score?: number; // For compatibility with board page
  role?: string; // Job title from CV
}

export interface CreateApplicantRequest {
  cvFile: File;
  linkedinFile?: File;
  githubFile?: File;
}
