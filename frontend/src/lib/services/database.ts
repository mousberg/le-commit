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
      // Validate status
      this.validateApplicantStatus(data.status);

      return await withRetry(async () => {
        const result = await safeExecute(
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

        return this.transformDatabaseApplicantToInterface(result);
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'createApplicant');
      throw error;
    }
  }

  async getApplicant(id: string): Promise<Applicant | null> {
    try {
      const result = await safeExecuteOptional(
        () => this.dbClient.from(TABLES.APPLICANTS)
          .select('*')
          .eq('id', id)
          .single(),
        'Applicant'
      );

      return result ? this.transformDatabaseApplicantToInterface(result) : null;
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getApplicant');
      throw error;
    }
  }

  async updateApplicant(id: string, data: UpdateApplicantData): Promise<Applicant> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      // Validate status if provided
      if (data.status !== undefined) {
        this.validateApplicantStatus(data.status);
      }

      // Map interface fields to database columns
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.cvData !== undefined) updateData.cv_data = data.cvData;
      if (data.linkedinData !== undefined) updateData.linkedin_data = data.linkedinData;
      if (data.githubData !== undefined) updateData.github_data = data.githubData;
      if (data.analysisResult !== undefined) updateData.analysis_result = data.analysisResult;
      if (data.individualAnalysis !== undefined) updateData.individual_analysis = data.individualAnalysis;
      if (data.crossReferenceAnalysis !== undefined) updateData.cross_reference_analysis = data.crossReferenceAnalysis;
      if (data.score !== undefined) updateData.score = data.score;
      if (data.role !== undefined) updateData.role = data.role;

      return await withRetry(async () => {
        const result = await safeExecute(
          () => this.dbClient.from(TABLES.APPLICANTS)
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          'Applicant'
        );

        return this.transformDatabaseApplicantToInterface(result);
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
        this.validateApplicantStatus(options.status);
        query = query.eq('status', options.status);
      }

      if (options.search) {
        // Enhanced search to include role and JSONB data
        query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,role.ilike.%${options.search}%`);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const results = await safeExecuteArray(() => query, 'Applicants');
      return results.map(result => this.transformDatabaseApplicantToInterface(result));
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'listApplicants');
      throw error;
    }
  }

  // Helper methods for applicant operations
  private validateApplicantStatus(status: string): void {
    const validStatuses = ['uploading', 'processing', 'analyzing', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid applicant status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  private transformDatabaseApplicantToInterface(dbApplicant: Record<string, unknown>): Applicant {
    return {
      id: dbApplicant.id,
      workspaceId: dbApplicant.workspace_id,
      name: dbApplicant.name,
      email: dbApplicant.email,
      status: dbApplicant.status,
      createdAt: dbApplicant.created_at,
      updatedAt: dbApplicant.updated_at,
      originalFileName: dbApplicant.original_filename,
      originalGithubUrl: dbApplicant.original_github_url,
      score: dbApplicant.score,
      role: dbApplicant.role,
      cvData: dbApplicant.cv_data,
      linkedinData: dbApplicant.linkedin_data,
      githubData: dbApplicant.github_data,
      analysisResult: dbApplicant.analysis_result,
      individualAnalysis: dbApplicant.individual_analysis,
      crossReferenceAnalysis: dbApplicant.cross_reference_analysis
    };
  }

  // Additional applicant query methods for enhanced filtering
  async getApplicantsByStatus(workspaceId: string, status: string): Promise<Applicant[]> {
    try {
      this.validateApplicantStatus(status);

      const results = await safeExecuteArray(
        () => this.dbClient.from(TABLES.APPLICANTS)
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('status', status)
          .order('created_at', { ascending: false }),
        'Applicants by status'
      );

      return results.map(result => this.transformDatabaseApplicantToInterface(result));
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'getApplicantsByStatus');
      throw error;
    }
  }

  async searchApplicants(workspaceId: string, searchTerm: string, limit?: number): Promise<Applicant[]> {
    try {
      let query = this.dbClient.from(TABLES.APPLICANTS)
        .select('*')
        .eq('workspace_id', workspaceId)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const results = await safeExecuteArray(() => query, 'Search applicants');
      return results.map(result => this.transformDatabaseApplicantToInterface(result));
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'searchApplicants');
      throw error;
    }
  }

  async updateApplicantStatus(id: string, status: string): Promise<Applicant> {
    try {
      this.validateApplicantStatus(status);

      return await this.updateApplicant(id, { status });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'updateApplicantStatus');
      throw error;
    }
  }

  async bulkUpdateApplicantStatus(ids: string[], status: string): Promise<void> {
    try {
      this.validateApplicantStatus(status);

      await withRetry(async () => {
        await safeExecute(
          () => this.dbClient.from(TABLES.APPLICANTS)
            .update({
              status,
              updated_at: new Date().toISOString()
            })
            .in('id', ids),
          'Bulk applicant status update'
        );
      });
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'bulkUpdateApplicantStatus');
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
      const updateData: Record<string, unknown> = {
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
      return result.map((item: Record<string, unknown>) => ({
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

  // Workspace access control validation functions
  async validateWorkspaceAccess(workspaceId: string, userId: string, requiredRole?: WorkspaceRole): Promise<boolean> {
    try {
      const userRole = await this.getUserWorkspaceRole(workspaceId, userId);

      if (!userRole) {
        return false;
      }

      if (!requiredRole) {
        return true; // User has some access
      }

      // Check role hierarchy: owner > admin > read_only
      const roleHierarchy: Record<WorkspaceRole, number> = {
        'owner': 3,
        'admin': 2,
        'read_only': 1
      };

      return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'validateWorkspaceAccess');
      return false;
    }
  }

  async validateWorkspaceOwnership(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      return workspace?.ownerId === userId;
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'validateWorkspaceOwnership');
      return false;
    }
  }

  async validateApplicantAccess(applicantId: string, userId: string, requiredRole?: WorkspaceRole): Promise<boolean> {
    try {
      const applicant = await this.getApplicant(applicantId);
      if (!applicant) {
        return false;
      }

      return await this.validateWorkspaceAccess(applicant.workspaceId, userId, requiredRole);
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'validateApplicantAccess');
      return false;
    }
  }

  async validateWorkspaceMemberManagement(workspaceId: string, userId: string, targetUserId: string): Promise<boolean> {
    try {
      // Only owners and admins can manage members
      const hasPermission = await this.validateWorkspaceAccess(workspaceId, userId, 'admin');
      if (!hasPermission) {
        return false;
      }

      // Owners can manage anyone, admins cannot manage owners
      const userRole = await this.getUserWorkspaceRole(workspaceId, userId);
      const targetRole = await this.getUserWorkspaceRole(workspaceId, targetUserId);

      if (userRole === 'owner') {
        return true;
      }

      if (userRole === 'admin' && targetRole !== 'owner') {
        return true;
      }

      return false;
    } catch (error) {
      logDatabaseError(handleDatabaseError(error), 'validateWorkspaceMemberManagement');
      return false;
    }
  }

  async canUserModifyWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    return await this.validateWorkspaceAccess(workspaceId, userId, 'admin');
  }

  async canUserDeleteWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    return await this.validateWorkspaceOwnership(workspaceId, userId);
  }

  async canUserInviteMembers(workspaceId: string, userId: string): Promise<boolean> {
    return await this.validateWorkspaceAccess(workspaceId, userId, 'admin');
  }

  async canUserRemoveMembers(workspaceId: string, userId: string, targetUserId: string): Promise<boolean> {
    return await this.validateWorkspaceMemberManagement(workspaceId, userId, targetUserId);
  }

  async canUserModifyApplicant(applicantId: string, userId: string): Promise<boolean> {
    return await this.validateApplicantAccess(applicantId, userId, 'admin');
  }

  async canUserViewApplicant(applicantId: string, userId: string): Promise<boolean> {
    return await this.validateApplicantAccess(applicantId, userId);
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
      const updateData: Record<string, unknown> = {
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
