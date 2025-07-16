import { GitHubData } from './github';
import { AnalysisResult, CvAnalysis, LinkedInAnalysis, GitHubAnalysis, CrossReferenceAnalysis } from './analysis';

// Profile and CV data types (moved from cv.ts)
export interface ProfileData {
  lastName: string
  firstName: string
  address: string
  email: string
  phone: string
  linkedin: string
  github: string
  personalWebsite: string
  professionalSummary: string
  jobTitle: string
  professionalExperiences: Experience[]
  otherExperiences: Experience[]
  educations: Education[]
  skills: string[]
  languages: Language[]
  publications: string[]
  distinctions: string[]
  hobbies: string[]
  references: string[]
  certifications: Certification[]
  other: Record<string, unknown> // Flexible field for any additional data
  source: 'cv' | 'linkedin' // Track the source of this profile data
}

// Backward compatibility alias
export type CvData = ProfileData;

export interface Certification {
  title: string
  issuer: string
  issuedYear: number
  issuedMonth?: number // Optional month (1-12)
}

export interface Experience {
  companyName?: string
  title?: string
  location: string
  type: ContractType
  startYear: number
  startMonth?: number // Optional month (1-12)
  endYear?: number // Optional if ongoing
  endMonth?: number // Optional month (1-12)
  ongoing: boolean
  description: string
  associatedSkills: string[]
}

export interface Education {
  degree: string
  institution: string
  location: string
  startYear: number
  startMonth?: number // Optional month (1-12)
  endYear?: number // Optional if ongoing
  endMonth?: number // Optional month (1-12)
  ongoing: boolean
  description: string
  associatedSkills: string[]
}

export interface Language {
  language: string
  level: LanguageLevel
}

export enum LanguageLevel {
  BASIC_KNOWLEDGE = 'BASIC_KNOWLEDGE',
  LIMITED_PROFESSIONAL = 'LIMITED_PROFESSIONAL',
  PROFESSIONAL = 'PROFESSIONAL',
  FULL_PROFESSIONAL = 'FULL_PROFESSIONAL',
  NATIVE_BILINGUAL = 'NATIVE_BILINGUAL',
}

export enum ContractType {
  PERMANENT_CONTRACT = 'PERMANENT_CONTRACT',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  FREELANCE = 'FREELANCE',
  FIXED_TERM_CONTRACT = 'FIXED_TERM_CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  APPRENTICESHIP = 'APPRENTICESHIP',
  PERFORMING_ARTS_INTERMITTENT = 'PERFORMING_ARTS_INTERMITTENT',
  PART_TIME_PERMANENT = 'PART_TIME_PERMANENT',
  CIVIC_SERVICE = 'CIVIC_SERVICE',
  PART_TIME_FIXED_TERM = 'PART_TIME_FIXED_TERM',
  SUPPORTED_EMPLOYMENT = 'SUPPORTED_EMPLOYMENT',
  CIVIL_SERVANT = 'CIVIL_SERVANT',
  TEMPORARY_WORKER = 'TEMPORARY_WORKER',
  ASSOCIATIVE = 'ASSOCIATIVE',
}

// LinkedIn specific types
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
