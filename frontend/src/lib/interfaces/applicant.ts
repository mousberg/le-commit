import { GitHubData } from './github';
import { AnalysisResult, CvAnalysis, LinkedInAnalysis, GitHubAnalysis, CrossReferenceAnalysis } from './analysis';
import { CvData } from './cv';

// LinkedIn specific types (separate from CV data)
export interface LinkedInData {
  name: string;
  headline: string;
  location: string;
  connections: number;
  profileUrl: string;
  accountCreationDate?: string;
  experience: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: string[];
  activity: LinkedInActivity;
  recommendations?: LinkedInRecommendation[];
  certifications?: LinkedInCertification[];
}

export interface LinkedInExperience {
  company: string;
  title: string;
  duration: string;
  location?: string;
  description?: string;
  companyExists?: boolean; // Whether company page exists on LinkedIn
}

export interface LinkedInEducation {
  school: string;
  degree: string;
  years: string;
  location?: string;
  description?: string;
  schoolExists?: boolean; // Whether school page exists on LinkedIn
}

export interface LinkedInActivity {
  posts: number;
  likes: number;
  comments: number;
  shares?: number;
  lastActivityDate?: string;
}

export interface LinkedInRecommendation {
  recommender: string;
  recommenderTitle?: string;
  recommenderCompany?: string;
  text: string;
  date?: string;
  recommenderProfileExists?: boolean;
}

export interface LinkedInCertification {
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

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
  original_linkedin_url?: string | null; // LinkedIn URL support
  created_at: string | null;
  updated_at: string | null;

  // LinkedIn job tracking (for URL-based LinkedIn processing)
  linkedin_job_id?: string | null; // BrightData snapshot ID
  linkedin_job_status?: 'pending' | 'running' | 'completed' | 'failed' | null;
  linkedin_job_started_at?: string | null;
  linkedin_job_completed_at?: string | null;

  // JSON fields with proper types
  cv_data?: CvData | null;
  linkedin_data?: LinkedInData | null; // Always from LinkedIn URL API
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
  cvFile?: File;
  linkedinUrl?: string;
  githubUrl?: string;
}
