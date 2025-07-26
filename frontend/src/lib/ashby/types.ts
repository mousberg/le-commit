// Ashby API Types for Unmask Integration

// Authentication
export interface AshbyAuth {
  apiKey: string;
  baseUrl?: string; // Default: https://api.ashbyhq.com
}

// Candidate Types
export interface AshbyCandidate {
  id: string;
  email: string;
  name: string;
  linkedInUrl?: string;
  resumeFileHandle?: string;
  phoneNumber?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
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
  customFields?: Record<string, any>;
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
  customFields?: Record<string, any>;
  tags?: {
    add?: string[];
    remove?: string[];
  };
}

export interface AshbyApplicationUpdateRequest {
  applicationId: string;
  source?: string;
  customFields?: Record<string, any>;
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
    [key: string]: any;
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