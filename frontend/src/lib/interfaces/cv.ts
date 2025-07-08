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

export interface GitHubData {
  username: string;
  name: string;
  bio: string;
  location: string;
  email: string;
  blog: string;
  company: string;
  profileUrl: string;
  avatarUrl: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  accountCreationDate: string;
  lastActivityDate?: string;
  repositories: GitHubRepository[];
  repositoryContent?: GitHubRepositoryContent[]; // Content analysis for each repo
  languages: GitHubLanguageStats[];
  contributions: GitHubContributionStats;
  activityAnalysis?: GitHubActivityAnalysis;
  starredRepos: number;
  forkedRepos: number;
  organizations: GitHubOrganization[];
  overallQualityScore?: GitHubQualityScore;
  other: Record<string, unknown>;
}

export interface GitHubRepository {
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  watchers: number;
  size: number;
  isPrivate: boolean;
  isFork: boolean;
  createdAt: string;
  updatedAt: string;
  topics: string[];
  url: string;
  cloneUrl: string;
  license?: string;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  hasPages: boolean;
  openIssues: number;
  defaultBranch: string;
}

export interface GitHubLanguageStats {
  language: string;
  percentage: number;
  bytes: number;
}

export interface GitHubContributionStats {
  totalCommits: number;
  totalPullRequests: number;
  totalIssues: number;
  totalRepositories: number;
  streakDays: number;
  contributionsLastYear: number;
  mostActiveDay?: string;
  mostUsedLanguage?: string;
}

export interface GitHubOrganization {
  login: string;
  name: string;
  description: string;
  url: string;
  avatarUrl: string;
  publicRepos: number;
  location: string;
  blog: string;
  email: string;
  createdAt: string;
}

export interface GitHubRepositoryContent {
  readme: GitHubReadmeAnalysis;
  packageJson?: GitHubPackageAnalysis;
  workflows: GitHubWorkflowAnalysis[];
  codeStructure: GitHubCodeStructure;
  qualityScore: GitHubQualityScore;
}

export interface GitHubReadmeAnalysis {
  exists: boolean;
  length: number;
  sections: string[];
  hasBadges: boolean;
  hasInstallInstructions: boolean;
  hasUsageExamples: boolean;
  hasContributing: boolean;
  hasLicense: boolean;
  imageCount: number;
  linkCount: number;
  codeBlockCount: number;
  qualityScore: number; // 0-100
}

export interface GitHubPackageAnalysis {
  exists: boolean;
  hasScripts: boolean;
  scriptCount: number;
  dependencyCount: number;
  devDependencyCount: number;
  hasLinting: boolean;
  hasTesting: boolean;
  hasTypeScript: boolean;
  hasDocumentation: boolean;
  hasValidLicense: boolean;
  frameworks?: string[]; // Detected frameworks (React, Vue, Angular, etc.)
  buildTools?: string[]; // Build tools (webpack, rollup, vite, etc.)
  testingFrameworks?: string[]; // Testing frameworks (jest, mocha, cypress, etc.)
  lintingTools?: string[]; // Linting tools (eslint, prettier, etc.)
  outdatedDependencies?: number;
  securityVulnerabilities?: number;
}

export interface GitHubWorkflowAnalysis {
  name: string;
  fileName: string;
  triggers: string[];
  jobs: string[];
  hasTestJob: boolean;
  hasLintJob: boolean;
  hasBuildJob: boolean;
  hasDeployJob: boolean;
  usesSecrets: boolean;
  matrixStrategy: boolean;
  complexity: number; // 0-100
}

export interface GitHubCodeStructure {
  fileCount: number;
  directoryCount: number;
  languageFiles: Record<string, number>;
  hasTests: boolean;
  testFrameworks: string[];
  hasDocumentation: boolean;
  hasExamples: boolean;
  hasConfigFiles: boolean;
  organizationScore: number; // 0-100
}

export interface GitHubQualityScore {
  overall: number; // 0-100
  readme: number;
  codeOrganization: number;
  cicd: number;
  documentation: number;
  maintenance: number;
  community: number;
  breakdown: {
    readmeQuality: number;
    hasCI: number;
    hasTests: number;
    hasLinting: number;
    dependencyHealth: number;
    communityFiles: number;
    recentActivity: number;
  };
}

export interface GitHubActivityAnalysis {
  commitFrequency: GitHubCommitFrequency;
  issueMetrics: GitHubIssueMetrics;
  pullRequestMetrics: GitHubPullRequestMetrics;
  collaborationSignals: GitHubCollaborationSignals;
}

export interface GitHubCommitFrequency {
  lastWeek: number;
  lastMonth: number;
  lastYear: number;
  averagePerWeek: number;
  commitMessageQuality: number; // 0-100
  conventionalCommits: boolean;
}

export interface GitHubIssueMetrics {
  totalOpen: number;
  totalClosed: number;
  averageResponseTime: number; // hours
  averageResolutionTime: number; // hours
  hasLabels: boolean;
  hasTemplates: boolean;
  maintainerResponseRate: number; // 0-100
}

export interface GitHubPullRequestMetrics {
  totalOpen: number;
  totalMerged: number;
  averageReviewTime: number; // hours
  averageMergeTime: number; // hours
  hasTemplates: boolean;
  requiresReviews: boolean;
  maintainerMergeRate: number; // 0-100
}

export interface GitHubCollaborationSignals {
  uniqueContributors: number;
  coreTeamSize: number;
  outsideContributions: number;
  forkToStarRatio: number;
  communityEngagement: number; // 0-100
  hasCodeOfConduct: boolean;
  hasContributingGuide: boolean;
  hasSecurityPolicy: boolean;
}
