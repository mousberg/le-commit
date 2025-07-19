// Database-related interfaces for Supabase integration

import { Applicant } from './applicant';

// Workspace-related interfaces
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  role?: WorkspaceRole; // User's role in this workspace
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  user: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
  joinedAt: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'read_only';

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
  workspaceId: string;
  status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  originalFileName?: string;
  originalGithubUrl?: string;
  role?: string;
}

export interface UpdateApplicantData {
  name?: string;
  email?: string;
  status?: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  cvData?: any;
  linkedinData?: any;
  githubData?: any;
  analysisResult?: any;
  individualAnalysis?: any;
  crossReferenceAnalysis?: any;
  score?: number;
  role?: string;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
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

// Query options
export interface ListApplicantsOptions {
  workspaceId: string;
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
}

export interface ListWorkspacesOptions {
  userId: string;
  limit?: number;
  offset?: number;
}

// Database service interface
export interface DatabaseService {
  // Applicant operations
  createApplicant(data: CreateApplicantData): Promise<Applicant>;
  getApplicant(id: string): Promise<Applicant | null>;
  updateApplicant(id: string, data: UpdateApplicantData): Promise<Applicant>;
  deleteApplicant(id: string): Promise<boolean>;
  listApplicants(options: ListApplicantsOptions): Promise<Applicant[]>;

  // Workspace operations
  createWorkspace(data: CreateWorkspaceData): Promise<Workspace>;
  getWorkspace(id: string): Promise<Workspace | null>;
  updateWorkspace(id: string, data: Partial<CreateWorkspaceData>): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<boolean>;
  getUserWorkspaces(options: ListWorkspacesOptions): Promise<Workspace[]>;

  // Workspace member operations
  addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember>;
  removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean>;
  updateWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember>;
  getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  getUserWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null>;

  // User operations
  createUser(authUserId: string, email: string, fullName?: string): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByAuthId(authUserId: string): Promise<User | null>;
  updateUser(id: string, data: Partial<User>): Promise<User>;

  // File operations
  createFileRecord(data: CreateFileData): Promise<FileRecord>;
  getFileRecord(id: string): Promise<FileRecord | null>;
  getApplicantFiles(applicantId: string): Promise<FileRecord[]>;
  deleteFileRecord(id: string): Promise<boolean>;
}
