export interface AnalysisResult {
  credibilityScore: number; // 0-100
  summary: string; // 1-2 sentence judgment
  flags: AnalysisFlag[];
  suggestedQuestions: string[];
  analysisDate: string;
  sources: AnalysisSource[];
}

export interface AnalysisFlag {
  type: 'red' | 'yellow';
  category: 'consistency' | 'verification' | 'completeness' | 'authenticity' | 'activity';
  message: string;
  details?: string;
  severity: number; // 1-10
}

export interface AnalysisSource {
  type: 'cv' | 'linkedin' | 'github';
  available: boolean;
  score: number; // Individual source score 0-100
  flags: AnalysisFlag[];
  analysisDetails: Record<string, unknown>;
}

// Specific analysis details for each source
export interface CvAnalysis {
  completenessScore: number;
  consistencyScore: number;
  experienceRealism: number;
  educationVerification: string[];
  timelineGaps: TimelineGap[];
  skillsCredibility: number;
  flags: AnalysisFlag[];
}

export interface LinkedInAnalysis {
  profileCompleteness: number;
  activityLevel: number;
  networkQuality: number;
  contentAuthenticity: number;
  cvConsistency: number;
  accountAge?: number; // months
  connectionCount?: number;
  hasActivity: boolean;
  hasRecommendations: boolean;
  flags: AnalysisFlag[];
}

export interface GitHubAnalysis {
  codeQuality: number;
  activityConsistency: number;
  contributionRealism: number;
  profileCompleteness: number;
  skillsAlignment: number;
  projectQuality: number;
  flags: AnalysisFlag[];
}

export interface TimelineGap {
  type: 'employment' | 'education';
  startDate: string;
  endDate: string;
  durationMonths: number;
  severity: 'minor' | 'moderate' | 'major';
}

// Cross-reference analysis
export interface CrossReferenceAnalysis {
  cvLinkedInConsistency: number;
  cvGitHubConsistency: number;
  linkedInGitHubConsistency: number;
  nameConsistency: boolean;
  experienceConsistency: InconsistencyDetail[];
  skillsConsistency: InconsistencyDetail[];
  educationConsistency: InconsistencyDetail[];
  flags: AnalysisFlag[];
}

export interface InconsistencyDetail {
  field: string;
  cvValue: string;
  linkedinValue?: string;
  githubValue?: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}
