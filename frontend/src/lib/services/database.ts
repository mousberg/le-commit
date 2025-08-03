// Simplified Database Service - No Workspaces, Just Users → Applicants

import { DatabaseClient } from '../supabase/database';
import { TABLES } from '../supabase/database';
import { Applicant } from '../interfaces/applicant';
import { User, CreateApplicantData, UpdateApplicantData } from '../interfaces/database';
import { withRetry, safeExecute, safeExecuteOptional, safeExecuteArray } from '../supabase/errors';

class SimpleSupabaseDatabaseService {
  private dbClient: DatabaseClient;

  constructor() {
    this.dbClient = DatabaseClient.createBrowserClient();
  }

  // ============================================================================
  // USER OPERATIONS (Simple profile management)
  // ============================================================================

  async ensureUserExists(): Promise<User> {
    const authUser = await this.dbClient.getCurrentUser();
    if (!authUser) {
      throw new Error('User must be authenticated');
    }

    // Try to get existing user record
    let userRecord = await safeExecuteOptional(
      async () => await this.dbClient.from(TABLES.USERS).select('*').eq('id', authUser.id).single()
    );

    // If user doesn't exist, create them (should be handled by trigger, but fallback)
    if (!userRecord) {
      userRecord = await safeExecute(
        async () => await this.dbClient.from(TABLES.USERS).insert({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
        }).select('*').single(),
        'User creation'
      );
    }

    if (!userRecord) {
      throw new Error('Failed to create user record');
    }
    return userRecord as User;
  }

  async updateUserProfile(updates: { full_name?: string }): Promise<User> {
    try {
      const authUser = await this.dbClient.getCurrentUser();
      if (!authUser) {
        throw new Error('User must be authenticated');
      }

      const updatedUser = await safeExecute(
        async () => await this.dbClient.from(TABLES.USERS)
          .update(updates)
          .eq('id', authUser.id)
          .select('*')
          .single(),
        'User profile update'
      );

      if (!updatedUser) {
        throw new Error('Failed to update user profile');
      }
      return updatedUser as User;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // ============================================================================
  // APPLICANT OPERATIONS (Users own applicants directly)
  // ============================================================================

  async canUserViewApplicant(applicantId: string, userId: string): Promise<boolean> {
    try {
      const applicant = await safeExecuteOptional(
        async () => await this.dbClient.from(TABLES.APPLICANTS)
          .select('user_id')
          .eq('id', applicantId)
          .eq('user_id', userId)
          .single()
      );
      return applicant !== null;
    } catch (error) {
      console.error('Access check failed:', error);
      return false;
    }
  }

  async canUserModifyApplicant(applicantId: string, userId: string): Promise<boolean> {
    // For the simplified service, modify access is the same as view access
    return this.canUserViewApplicant(applicantId, userId);
  }

  async validateWorkspaceAccess(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _workspaceId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _requiredRole?: 'admin' | 'owner'
  ): Promise<boolean> {
    // In the simplified architecture, users have direct access to their data
    // This method is kept for backward compatibility but always returns true
    return true;
  }

  async createApplicant(data: CreateApplicantData): Promise<Applicant> {
    try {
      await this.ensureUserExists();
      const currentUser = await this.dbClient.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated');
      }

      return await withRetry(async () => {
        const applicant = await safeExecute(
          async () => await this.dbClient.from(TABLES.APPLICANTS).insert({
            user_id: currentUser.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            linkedin_url: data.linkedin_url,
            github_url: data.github_url,
            cv_file_id: data.cv_file_id,
            status: data.status || 'uploading'
          }).select().single(),
          'Applicant creation'
        );

        if (!applicant) {
          throw new Error('Failed to create applicant');
        }
        return applicant as Applicant;
      });
    } catch (error) {
      console.error('Error creating applicant:', error);
      throw error;
    }
  }

  async getApplicant(id: string): Promise<Applicant | null> {
    try {
      const dbApplicant = await safeExecuteOptional(
        async () => await this.dbClient.from(TABLES.APPLICANTS).select('*').eq('id', id).single()
      );

      return dbApplicant as Applicant | null;
    } catch (error) {
      console.error('Error getting applicant:', error);
      throw error;
    }
  }

  async updateApplicant(id: string, data: UpdateApplicantData): Promise<Applicant> {
    try {
      return await withRetry(async () => {
        // Only update fields that are not generated columns
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.linkedin_url !== undefined) updateData.linkedin_url = data.linkedin_url;
        if (data.github_url !== undefined) updateData.github_url = data.github_url;
        if (data.cv_file_id !== undefined) updateData.cv_file_id = data.cv_file_id;
        if (data.cv_status !== undefined) updateData.cv_status = data.cv_status;
        if (data.li_status !== undefined) updateData.li_status = data.li_status;
        if (data.gh_status !== undefined) updateData.gh_status = data.gh_status;
        if (data.ai_status !== undefined) updateData.ai_status = data.ai_status;
        if (data.cv_data !== undefined) updateData.cv_data = data.cv_data;
        if (data.li_data !== undefined) updateData.li_data = data.li_data;
        if (data.gh_data !== undefined) updateData.gh_data = data.gh_data;
        if (data.ai_data !== undefined) updateData.ai_data = data.ai_data;
        // Note: status and score are generated columns - they update automatically

        const applicant = await safeExecute(
          async () => await this.dbClient.from(TABLES.APPLICANTS)
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          'Applicant update'
        );

        if (!applicant) {
          throw new Error('Failed to update applicant');
        }
        return applicant as Applicant;
      });
    } catch (error) {
      console.error('Error updating applicant:', error);
      throw error;
    }
  }

  async deleteApplicant(id: string): Promise<boolean> {
    try {
      await withRetry(async () => {
        const { error } = await this.dbClient.from(TABLES.APPLICANTS).delete().eq('id', id);
        if (error) {
          throw error;
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting applicant:', error);
      throw error;
    }
  }

  async listUserApplicants(options: { limit?: number; offset?: number; status?: string; search?: string } = {}): Promise<Applicant[]> {
    try {
      let query = this.dbClient.from(TABLES.APPLICANTS)
        .select('*')
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

      const result = await safeExecuteArray(async () => await query);
      return result as Applicant[];
    } catch (error) {
      console.error('Error listing applicants:', error);
      throw error;
    }
  }

  // ============================================================================
  // FILE OPERATIONS (Simple applicant file management)
  // ============================================================================

  async getApplicantFiles(applicantId: string) {
    try {
      return await safeExecuteArray(
        async () => await this.dbClient.from(TABLES.FILES).select('*').eq('applicant_id', applicantId)
      );
    } catch (error) {
      console.error('Error getting applicant files:', error);
      throw error;
    }
  }
}

// Export the class and singleton instance
export { SimpleSupabaseDatabaseService as SupabaseDatabaseService };
export const simpleDatabaseService = new SimpleSupabaseDatabaseService();
export default simpleDatabaseService;
