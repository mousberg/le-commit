// Ashby API Types for Unmask Integration

// Authentication
export interface AshbyAuth {
  apiKey: string;
  baseUrl?: string; // Default: https://api.ashbyhq.com
}

// Candidate Types (matches actual Ashby API response)
export interface AshbyCandidate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  
  // Email addresses
  primaryEmailAddress?: {
    value: string;
    type: string;
    isPrimary: boolean;
  };
  emailAddresses?: Array<{
    value: string;
    type: string;
    isPrimary: boolean;
  }>;
  
  // Phone numbers
  primaryPhoneNumber?: {
    value: string;
    type: string;
    isPrimary: boolean;
  };
  phoneNumbers?: Array<{
    value: string;
    type: string;
    isPrimary: boolean;
  }>;
  
  // Social links (LinkedIn, GitHub, etc.)
  socialLinks?: Array<{
    type: string;
    url: string;
  }>;
  
  // Professional information
  position?: string;
  company?: string;
  school?: string;
  
  // Location
  location?: {
    id: string;
    locationSummary: string;
    locationComponents: Array<{
      type: string;
      name: string;
    }>;
  };
  timezone?: string;
  
  // Files
  resumeFileHandle?: {
    id: string;
    name: string;
    handle: string;
  } | string; // Can be string or object depending on API
  fileHandles?: Array<{
    id: string;
    name: string;
    handle: string;
  }>;
  
  // Metadata
  tags?: string[];
  customFields?: Record<string, unknown>;
  applicationIds?: string[];
  source?: {
    id: string;
    title: string;
    isArchived: boolean;
    sourceType: {
      id: string;
      title: string;
      isArchived: boolean;
    };
  };
  creditedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    globalRole: string;
    isEnabled: boolean;
    updatedAt: string;
  } | null;
  profileUrl?: string;
}

export interface AshbyCandidateListRequest {
  includeArchived?: boolean;
  limit?: number;
  cursor?: string;
  customFields?: string[];
}

export interface AshbyCandidateListResponse {
  results: AshbyCandidate[];
  nextCursor?: string;
  moreDataAvailable: boolean;
}

// Application Types
export interface AshbyApplication {
  id: string;
  candidateId: string;
  jobId: string;
  status: string;
  stage: string;
  source?: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Resume/File Types
export interface AshbyResumeUploadRequest {
  candidateId: string;
  file: Buffer | ArrayBuffer;
  filename: string;
  contentType?: string;
}

export interface AshbyResumeUploadResponse {
  fileHandle: string;
  url?: string;
}

// Update Types
export interface AshbyCandidateUpdateRequest {
  candidateId: string;
  customFields?: Record<string, unknown>;
  tags?: {
    add?: string[];
    remove?: string[];
  };
}

export interface AshbyApplicationUpdateRequest {
  applicationId: string;
  source?: string;
  customFields?: Record<string, unknown>;
}

// Webhook Types
export interface AshbyWebhookEvent {
  id: string;
  type: AshbyWebhookEventType;
  timestamp: string;
  data: {
    candidateId?: string;
    applicationId?: string;
    previousStage?: string;
    currentStage?: string;
    [key: string]: unknown;
  };
}

export type AshbyWebhookEventType = 
  | 'candidate.created'
  | 'candidate.updated'
  | 'application.created'
  | 'application.stage_changed'
  | 'offer.accepted'
  | 'interview.scheduled';

// Integration-specific types for Unmask
export interface UnmaskAshbyIntegration {
  enabled: boolean;
  apiKey: string;
  webhookSecret?: string;
  customFieldMappings: {
    unmaskScore: string; // Ashby custom field name for credibility score
    unmaskFlags: string; // Ashby custom field name for verification flags
    unmaskReportUrl: string; // Ashby custom field name for report URL
    unmaskVerificationStatus: string; // Ashby custom field name for status
  };
  tagMappings: {
    verified: string; // Tag for verified candidates
    flagged: string; // Tag for candidates with red flags
    pending: string; // Tag for pending verification
  };
}

// Sync Status Types
export interface AshbySyncStatus {
  candidateId: string;
  ashbyId: string;
  lastSyncedAt: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncError?: string;
}

// API Response Types
export interface AshbyApiResponse<T> {
  success: boolean;
  results?: T;
  error?: {
    message: string;
    code?: string;
  };
}