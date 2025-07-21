// Database-related interfaces for Supabase integration

import { Applicant } from './applicant';

// Re-export Applicant interface for database service
export type { Applicant } from './applicant';

// User interface
export interface User {
  id: string;
  authUserId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
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

// Database operation interfaces
export interface CreateApplicantData {
  name: string;
  email?: string;
  status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  originalFileName?: string;
  originalGithubUrl?: string;
  role?: string;
}

export interface UpdateApplicantData {
  name?: string;
  email?: string;
  status?: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  cvData?: Record<string, unknown>;
  linkedinData?: Record<string, unknown>;
  githubData?: Record<string, unknown>;
  analysisResult?: Record<string, unknown>;
  individualAnalysis?: Record<string, unknown>;
  crossReferenceAnalysis?: Record<string, unknown>;
  score?: number;
  role?: string;
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

// Database service interface (simplified - no workspace operations)
export interface DatabaseService {
  // Applicant operations (simplified - user owns applicants directly)
  createApplicant(data: CreateApplicantData): Promise<Applicant>;
  getApplicant(id: string): Promise<Applicant | null>;
  updateApplicant(id: string, data: UpdateApplicantData): Promise<Applicant>;
  deleteApplicant(id: string): Promise<boolean>;
  listApplicants(options: ListApplicantsOptions): Promise<Applicant[]>;

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
