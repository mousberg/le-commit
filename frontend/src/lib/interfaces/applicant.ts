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
  originalLinkedinUrl?: string;
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

  // Hackathon-specific data
  hackathonData?: {
    teamName?: string;
    problemsInterested?: string;
    hasTeam?: boolean;
  };
}

export interface CreateApplicantRequest {
  cvFile?: File;
  linkedinUrl?: string;
  githubUrl?: string;
}
