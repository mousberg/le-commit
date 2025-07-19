// Database service implementation using Supabase

import {
  DatabaseService,
  Applicant,
  CreateApplicantData,
  UpdateApplicantData,
  Workspace,
  CreateWorkspaceData,
  WorkspaceMember,
  WorkspaceRole,
  User,
  FileRecord,
  CreateFileData,
  ListApplicantsOptions,
  ListWorkspacesOptions
} from '../interfaces/database';

import {
  DatabaseClient,
  TABLES,
  getBrowserDatabaseClient,
  getServerDatabaseClient
} from '../supabase/database';

import {
  handleDatabaseError,
  safeExecute,
  safeExecuteOptional,
  safeExecuteArray,
  withRetry,
  logDatabaseError
} from '../supabase/errors';

export class SupabaseDatabaseService implements DatabaseService {
  private dbClient: DatabaseClient;

  constructor(dbClient: DatabaseClient) {
    this.dbClient = dbClient;
  }

  // Static factory methods
  static createBrowserService(): SupabaseDatabaseService {
    return new SupabaseDatabaseService(getBrowserDatabaseClient());
  }

  static async createServerService(): Promise<SupabaseDatabaseService> {
    const dbClient = await getServerDatabaseClient();
    return new SupabaseDatabaseService(dbClient);
  }

  // Applicant operations
  async createApplicant(data: CreateApplicantData): Promise<Applicant> {
    try {
      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.APPLICANTS).insert({
            name: data.name,
            email: data.email,
            workspace_id: data.workspaceId,
            status: data.status,
            original_filename: data.originalFileName,
            original_github_url: data.originalGithubUrl,
            role: data.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).select().single(),
          'Applicant'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'createApplicant');
      throw error;
    }
  }

  async getApplicant(id: string): Promise<Applicant | null> {
    try {
      return await safeExecuteOptional(
        () => this.dbClient.from(TABLES.APPLICANTS)
          .select('*')
          .eq('id', id)
          .single(),
        'Applicant'
      );
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getApplicant');
      throw error;
    }
  }

  async updateApplicant(id: string, data: UpdateApplicantData): Promise<Applicant> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map interface fields to database columns
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.cvData !== undefined) updateData.cv_data = data.cvData;
      if (data.linkedinData !== undefined) updateData.linkedin_data = data.linkedinData;
      if (data.githubData !== undefined) updateData.github_data = data.githubData;
      if (data.analysisResult !== undefined) updateData.analysis_re = data.analysisResult;
      if (data.individualAnalysis !== undefined) updateData.individual_analysis = data.individualAnalysis;
      if (data.crossReferenceAnalysis !== undefined) updateData.cross_reference_analysis = data.crossReferenceAnalysis;
      if (data.score !== undefined) updateData.score = data.score;
      if (data.role !== undefined) updateData.role = data.role;

      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.APPLICANTS)
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          'Applicant'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'updateApplicant');
      throw error;
    }
  }

  async deleteApplicant(id: string): Promise<boolean> {
    try {
      await withRetry(async () => {
        await safeExecute(
          () => this.dbClient.from(TABLES.APPLICANTS)
            .delete()
            .eq('id', id),
          'Applicant deletion'
        );
      });
      return true;
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'deleteApplicant');
      throw error;
    }
  }

  async listApplicants(options: ListApplicantsOptions): Promise<Applicant[]> {
    try {
      let query = this.dbClient.from(TABLES.APPLICANTS)
        .select('*')
        .eq('workspace_id', options.workspaceId)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      return await safeExecuteArray(() => query, 'Applicants');
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'listApplicants');
      throw error;
    }
  }

  // Workspace operations
  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    try {
      const user = await this.dbClient.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to create workspace');
      }

      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.WORKSPACES).insert({
            name: data.name,
            description: data.description,
            owner_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).select().single(),
          'Workspace'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'createWorkspace');
      throw error;
    }
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    try {
      return await safeExecuteOptional(
        () => this.dbClient.from(TABLES.WORKSPACES)
          .select('*')
          .eq('id', id)
          .single(),
        'Workspace'
      );
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getWorkspace');
      throw error;
    }
  }

  async updateWorkspace(id: string, data: Partial<CreateWorkspaceData>): Promise<Workspace> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;

      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.WORKSPACES)
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          'Workspace'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'updateWorkspace');
      throw error;
    }
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    try {
      await withRetry(async () => {
        await safeExecute(
          () => this.dbClient.from(TABLES.WORKSPACES)
            .delete()
            .eq('id', id),
          'Workspace deletion'
        );
      });
      return true;
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'deleteWorkspace');
      throw error;
    }
  }

  async getUserWorkspaces(options: ListWorkspacesOptions): Promise<Workspace[]> {
    try {
      let query = this.dbClient.from(TABLES.WORKSPACE_MEMBERS)
        .select(`
          workspace_id,
          role,
          workspaces (
            id,
            name,
            description,
            owner_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', options.userId)
        .order('joined_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const result = await safeExecuteArray(() => query, 'User workspaces');

      // Transform the result to match Workspace interface
      return result.map((item: any) => ({
        ...item.workspaces,
        role: item.role
      }));
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getUserWorkspaces');
      throw error;
    }
  }

  // Workspace member operations
  async addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    try {
      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.WORKSPACE_MEMBERS).insert({
            workspace_id: workspaceId,
            user_id: userId,
            role: role,
            joined_at: new Date().toISOString()
          }).select(`
            *,
            users (
              id,
              email,
              full_name,
              avatar_url
            )
          `).single(),
          'Workspace member'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'addWorkspaceMember');
      throw error;
    }
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    try {
      await withRetry(async () => {
        await safeExecute(
          () => this.dbClient.from(TABLES.WORKSPACE_MEMBERS)
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId),
          'Workspace member removal'
        );
      });
      return true;
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'removeWorkspaceMember');
      throw error;
    }
  }

  async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    try {
      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.WORKSPACE_MEMBERS)
            .update({ role })
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .select(`
              *,
              users (
                id,
                email,
                full_name,
                avatar_url
              )
            `)
            .single(),
          'Workspace member'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'updateWorkspaceMemberRole');
      throw error;
    }
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      return await safeExecuteArray(
        () => this.dbClient.from(TABLES.WORKSPACE_MEMBERS)
          .select(`
            *,
            users (
              id,
              email,
              full_name,
              avatar_url
            )
          `)
          .eq('workspace_id', workspaceId)
          .order('joined_at', { ascending: true }),
        'Workspace members'
      );
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getWorkspaceMembers');
      throw error;
    }
  }

  async getUserWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    try {
      const result = await safeExecuteOptional(
        () => this.dbClient.from(TABLES.WORKSPACE_MEMBERS)
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .single(),
        'Workspace member role'
      );
      return result?.role || null;
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getUserWorkspaceRole');
      throw error;
    }
  }

  // User operations
  async createUser(authUserId: string, email: string, fullName?: string): Promise<User> {
    try {
      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.USERS).insert({
            auth_user_id: authUserId,
            email: email,
            full_name: fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).select().single(),
          'User'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'createUser');
      throw error;
    }
  }

  async getUser(id: string): Promise<User | null> {
    try {
      return await safeExecuteOptional(
        () => this.dbClient.from(TABLES.USERS)
          .select('*')
          .eq('id', id)
          .single(),
        'User'
      );
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getUser');
      throw error;
    }
  }

  async getUserByAuthId(authUserId: string): Promise<User | null> {
    try {
      return await safeExecuteOptional(
        () => this.dbClient.from(TABLES.USERS)
          .select('*')
          .eq('auth_user_id', authUserId)
          .single(),
        'User'
      );
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getUserByAuthId');
      throw error;
    }
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.email !== undefined) updateData.email = data.email;
      if (data.fullName !== undefined) updateData.full_name = data.fullName;
      if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;

      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.USERS)
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          'User'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'updateUser');
      throw error;
    }
  }

  // File operations
  async createFileRecord(data: CreateFileData): Promise<FileRecord> {
    try {
      return await withRetry(async () => {
        return await safeExecute(
          () => this.dbClient.from(TABLES.FILES).insert({
            applicant_id: data.applicantId,
            file_type: data.fileType,
            original_filename: data.originalFilename,
            storage_path: data.storagePath,
            storage_bucket: data.storageBucket,
            file_size: data.fileSize,
            mime_type: data.mimeType,
            uploaded_at: new Date().toISOString()
          }).select().single(),
          'File record'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'createFileRecord');
      throw error;
    }
  }

  async getFileRecord(id: string): Promise<FileRecord | null> {
    try {
      return await safeExecuteOptional(
        () => this.dbClient.from(TABLES.FILES)
          .select('*')
          .eq('id', id)
          .single(),
        'File record'
      );
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getFileRecord');
      throw error;
    }
  }

  async getApplicantFiles(applicantId: string): Promise<FileRecord[]> {
    try {
      return await safeExecuteArray(
        () => this.dbClient.from(TABLES.FILES)
          .select('*')
          .eq('applicant_id', applicantId)
          .order('uploaded_at', { ascending: false }),
        'Applicant files'
      );
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getApplicantFiles');
      throw error;
    }
  }

  async deleteFileRecord(id: string): Promise<boolean> {
    try {
      await withRetry(async () => {
        await safeExecute(
          () => this.dbClient.from(TABLES.FILES)
            .delete()
            .eq('id', id),
          'File record deletion'
        );
      });
      return true;
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'deleteFileRecord');
      throw error;
    }
  }
}

// Export singleton instances for common usage
export const browserDatabaseService = SupabaseDatabaseService.createBrowserService();

export async function getServerDatabaseService(): Promise<SupabaseDatabaseService> {
  return await SupabaseDatabaseService.createServerService();
}
