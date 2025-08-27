export interface CvData {
  lastName: string
  firstName: string
  // Database sync compatibility fields (used by sync trigger)
  name?: string // Full name for database sync
  full_name?: string // Alternative full name field
  telephone?: string // Alternative phone field for database sync
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
