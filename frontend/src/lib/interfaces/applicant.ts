import { CvData } from './index';
import { GitHubData } from './github';
import { AnalysisResult, CvAnalysis, LinkedInAnalysis, GitHubAnalysis, CrossReferenceAnalysis } from './analysis';

// Use Supabase generated types as the base, with proper type annotations for JSON fields
export interface Applicant {
  // Base database fields
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  status: string;
  role: string | null;
  score: number | null;
  original_filename: string | null;
  original_github_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  
  // JSON fields with proper types
  cv_data?: CvData | null;
  linkedin_data?: CvData | null;
  github_data?: GitHubData | null;
  analysis_result?: AnalysisResult | null;
  individual_analysis?: {
    cv?: CvAnalysis;
    linkedin?: LinkedInAnalysis;
    github?: GitHubAnalysis;
  } | null;
  cross_reference_analysis?: CrossReferenceAnalysis | null;
}

export interface CreateApplicantRequest {
  cvFile: File;
  linkedinFile?: File;
  githubUrl?: string;
  role?: string;
}
