export interface CvData {
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
  other: Record<string, any> // Flexible field for any additional data
}

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

export interface Signal {
    name: string
    description: string
    importance: number // 0 - 1
    requiresCV: boolean
    requiresLinkedIn: boolean
}

export interface SignalEvaluation {
    evaluation_score: number // 0 - 1
    reason: string
}

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
