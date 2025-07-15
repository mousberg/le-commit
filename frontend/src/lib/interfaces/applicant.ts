import { ProfileData } from './cv';
import { GitHubData } from './github';
import { AnalysisResult, CvAnalysis, LinkedInAnalysis, GitHubAnalysis, CrossReferenceAnalysis } from './analysis';

export interface Applicant {
  id: string;
  name: string;
  email: string;
  cvData?: ProfileData;
  linkedinData?: ProfileData;
  githubData?: GitHubData;
  status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  createdAt: string;
  originalFileName?: string;
  originalGithubUrl?: string;
  score?: number; // For compatibility with board page
  role?: string; // Job title from CV

  // New analysis fields
  analysisResult?: AnalysisResult;
  individualAnalysis?: {
    cv?: CvAnalysis;
    linkedin?: LinkedInAnalysis;
    github?: GitHubAnalysis;
  };
  crossReferenceAnalysis?: CrossReferenceAnalysis;
}

export interface CreateApplicantRequest {
  cvFile?: File;
  linkedinFile?: File;
  githubUrl?: string;
}
