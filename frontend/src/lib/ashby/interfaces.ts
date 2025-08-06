// Shared ATS/Ashby interfaces
import { AnalysisResult } from '@/lib/interfaces/analysis';

export interface ATSCandidate {
  // Database primary fields
  id?: string;
  ashby_id: string;
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
  
  // UI specific fields (not in DB)
  action?: 'existing' | 'created' | 'not_created' | 'error';
  ready_for_processing?: boolean;
  analysis?: AnalysisResult;
  processed?: boolean;
}

export interface ATSPageData {
  candidates: ATSCandidate[];
  cached_count: number;
  auto_synced: boolean;
  sync_results?: {
    new_candidates?: number;
    message?: string;
  };
  last_sync: number | null;
  availableForImport?: number;
  importedCount?: number;
}