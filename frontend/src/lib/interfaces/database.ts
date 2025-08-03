// Database-related interfaces for Supabase integration

// User interface
export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// File interface
export interface FileRecord {
  id: string;
  applicantId: string;
  fileType: 'cv' | 'linkedin' | 'github' | 'other';
  originalFilename: string;
  storagePath: string;
  storageBucket: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
}

// Database operation interfaces (updated for new data model)
export interface CreateApplicantData {
  name: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  github_url?: string;
  cv_file_id?: string;
  status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
}

export interface UpdateApplicantData {
  name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  github_url?: string;
  cv_file_id?: string;
  cv_status?: 'pending' | 'processing' | 'ready' | 'error';
  li_status?: 'pending' | 'processing' | 'ready' | 'error';
  gh_status?: 'pending' | 'processing' | 'ready' | 'error';
  ai_status?: 'pending' | 'processing' | 'ready' | 'error';
  cv_data?: Record<string, unknown>;
  li_data?: Record<string, unknown>;
  gh_data?: Record<string, unknown>;
  ai_data?: Record<string, unknown>;
  status?: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  score?: number;
}

export interface CreateFileData {
  applicantId: string;
  fileType: 'cv' | 'linkedin' | 'github' | 'other';
  originalFilename: string;
  storagePath: string;
  storageBucket: string;
  fileSize?: number;
  mimeType?: string;
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
  getApplicantFiles(applicantId: string): Promise<FileRecord[]>;
  getUserFiles(userId: string): Promise<FileRecord[]>;
  deleteFileRecord(id: string): Promise<boolean>;
}
