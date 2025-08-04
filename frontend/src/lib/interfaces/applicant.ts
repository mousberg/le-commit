import { GitHubData } from './github';
import { AnalysisResult } from './analysis';
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

// Event-driven architecture applicant model
export interface Applicant {
  // Base database fields
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;

  // Original URLs/sources
  linkedin_url: string | null;
  github_url: string | null;

  // File handling
  cv_file_id: string | null;

  // Processing status columns
  cv_status: 'pending' | 'processing' | 'ready' | 'error';
  li_status: 'pending' | 'processing' | 'ready' | 'error' | 'not_provided';
  gh_status: 'pending' | 'processing' | 'ready' | 'error' | 'not_provided';
  ai_status: 'pending' | 'processing' | 'ready' | 'error';

  // JSONB data columns
  cv_data: CvData | null;
  li_data: LinkedInData | null;
  gh_data: GitHubData | null;
  ai_data: AnalysisResult | null;

  // Generated columns (automatically computed from sub-statuses and data)
  status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed'; // Generated from cv/li/gh/ai statuses
  score: number | null; // Generated from ai_data.score

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateApplicantRequest {
  cvFile?: File;
  linkedinUrl?: string;
  githubUrl?: string;
}
