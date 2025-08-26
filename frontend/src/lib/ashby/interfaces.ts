// Shared ATS/Ashby interfaces
import { AnalysisResult } from '@/lib/interfaces/analysis';

export interface ATSCandidate {
  // Database primary fields
  id: string; // Primary identifier - applicant ID
  ashby_id?: string; // Optional, for display/debug only
  name: string;
  email: string | null;
  phone?: string | null;
  
  // Professional info
  position?: string | null;
  company?: string | null;
  school?: string | null;
  
  // Location
  location_summary?: string | null;
  timezone?: string | null;
  
  // Social links
  linkedin_url?: string | null;
  github_url?: string | null;
  website_url?: string | null;
  
  // File/Resume info
  resume_file_handle?: Record<string, unknown> | string | null;
  has_resume: boolean;
  resume_url?: string;
  
  // Arrays stored as JSONB
  emails?: Array<Record<string, unknown>>;
  phone_numbers?: Array<Record<string, unknown>>;
  social_links?: Array<Record<string, unknown>>;
  tags: string[];
  application_ids?: string[];
  all_file_handles?: Array<Record<string, unknown>>;
  
  // Source info
  source?: Record<string, unknown> | null;
  source_title?: string | null;
  credited_to_user?: Record<string, unknown> | null;
  credited_to_name?: string | null;
  
  // Profile
  profile_url?: string | null;
  
  // Timestamps
  ashby_created_at?: string;
  ashby_updated_at?: string;
  created_at: string;
  updated_at?: string;
  last_synced_at?: string;
  
  // Integration with unmask
  unmask_applicant_id?: string | null;
  unmask_status?: string;
  cv_file_id?: string | null;
  
  // Processing status fields (from applicants table)
  ai_status?: string;
  cv_status?: string;
  li_status?: string;
  gh_status?: string;
  
  // Processed data fields (for checking dummy data)
  li_data?: import('@/lib/interfaces/applicant').LinkedInData;
  cv_data?: import('@/lib/interfaces/cv').CvData;
  gh_data?: import('@/lib/interfaces/github').GitHubData;
  
  // Manual assessment fields (UI only - no backend changes)
  manual_score?: number | null;
  notes?: string | null;
  edit_history?: string | null;
  score?: number | null;
  
  // UI specific fields (not in DB)
  action?: 'existing' | 'created' | 'not_created' | 'error';
  ready_for_processing?: boolean;
  analysis?: AnalysisResult;
  processed?: boolean;
  cv_priority?: 'immediate' | 'deferred';
}

export interface ATSPageData {
  candidates: ATSCandidate[];
  stored_count: number;
  auto_synced: boolean;
  sync_results?: {
    new_candidates?: number;
    message?: string;
  };
  last_sync: number | null;
  availableForImport?: number;
  importedCount?: number;
}

// Manual Assessment interfaces
export interface ManualAssessment {
  manual_score?: number | null;
  notes?: string | null;
  ashby_note_id?: string | null;
}

export interface ManualAssessmentUpdate {
  applicantId: string;
  manual_score?: number | null;
  notes?: string | null;
}

export interface AshbyPushResult {
  success: boolean;
  message?: string;
  error?: string;
  ashbyNoteId?: string;
  ashbyScoreSet?: boolean;
}