// Database-related interfaces for Supabase integration

// User interface
export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  preferred_name?: string | null;
  avatar_url?: string | null;
  preferences?: Record<string, unknown> | null;
  ashby_api_key?: string | null;
  ashby_sync_cursor?: string | null;
  ashby_features?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

// File interface
export interface FileRecord {
  id: string;
  user_id: string;
  file_type: 'cv' | 'linkedin' | 'github' | 'other';
  original_filename: string;
  storage_path: string;
  storage_bucket: string;
  file_size?: number | null;
  mime_type?: string | null;
  created_at: string;
  updated_at: string;
}

// Database operation interfaces (updated for robust schema with generated columns)
export interface CreateApplicantData {
  name: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  github_url?: string;
  cv_file_id?: string;
  // Note: status and score are generated columns - do not include in create operations
}

export interface UpdateApplicantData {
  name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  github_url?: string;
  cv_file_id?: string;
  cv_status?: 'pending' | 'processing' | 'ready' | 'error';
  li_status?: 'pending' | 'processing' | 'ready' | 'error' | 'not_provided';
  gh_status?: 'pending' | 'processing' | 'ready' | 'error' | 'not_provided';
  ai_status?: 'pending' | 'processing' | 'ready' | 'error';
  cv_data?: Record<string, unknown>;
  li_data?: Record<string, unknown>;
  gh_data?: Record<string, unknown>;
  ai_data?: Record<string, unknown>;
  // Note: status and score are generated columns - automatically derived from sub-statuses and ai_data
}

export interface CreateFileData {
  user_id: string;
  file_type: 'cv' | 'linkedin' | 'github' | 'other';
  original_filename: string;
  storage_path: string;
  storage_bucket: string;
  file_size?: number | null;
  mime_type?: string | null;
}

// Query options (simplified - no workspace needed)
export interface ListApplicantsOptions {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
}

// Generic applicant type for database operations
export interface DatabaseApplicant {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // Allow additional fields
}

// Database service interface (simplified - no workspace operations)
export interface DatabaseService {
  // Applicant operations (simplified - user owns applicants directly)
  createApplicant(data: CreateApplicantData): Promise<DatabaseApplicant>;
  getApplicant(id: string): Promise<DatabaseApplicant | null>;
  updateApplicant(id: string, data: UpdateApplicantData): Promise<DatabaseApplicant>;
  deleteApplicant(id: string): Promise<boolean>;
  listApplicants(options: ListApplicantsOptions): Promise<DatabaseApplicant[]>;

  // User operations
  createUser(authUserId: string, email: string, fullName?: string): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByAuthId(authUserId: string): Promise<User | null>;
  updateUser(id: string, data: Partial<User>): Promise<User>;

  // File operations (simplified - no workspace context)
  createFileRecord(data: CreateFileData): Promise<FileRecord>;
  getFileRecord(id: string): Promise<FileRecord | null>;
  getUserFiles(userId: string): Promise<FileRecord[]>;
  deleteFileRecord(id: string): Promise<boolean>;
}
