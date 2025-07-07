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