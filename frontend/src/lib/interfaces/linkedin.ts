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
