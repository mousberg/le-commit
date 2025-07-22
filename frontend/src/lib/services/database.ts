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
      () => this.dbClient.from(TABLES.USERS).select('*').eq('id', authUser.id).single(),
      'User lookup'
    );

    // If user doesn't exist, create them (should be handled by trigger, but fallback)
    if (!userRecord) {
      userRecord = await safeExecute(
        () => this.dbClient.from(TABLES.USERS).insert({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
        }).select('*').single(),
        'User creation'
      );
    }

    return userRecord as User;
  }

  // ============================================================================
  // APPLICANT OPERATIONS (Users own applicants directly)
  // ============================================================================

  async canUserViewApplicant(applicantId: string, userId: string): Promise<boolean> {
    try {
      const applicant = await safeExecuteOptional(
        () => this.dbClient.from(TABLES.APPLICANTS)
          .select('user_id')
          .eq('id', applicantId)
          .eq('user_id', userId)
          .single(),
        'Applicant access check'
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
    _workspaceId: string,
    _userId: string,
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
          () => this.dbClient.from(TABLES.APPLICANTS).insert({
            user_id: currentUser.id,
            name: data.name,
            email: data.email,
            status: data.status || 'uploading',
            original_filename: data.originalFileName,
            original_github_url: data.originalGithubUrl,
            role: data.role
          }).select().single(),
          'Applicant creation'
        );

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
        () => this.dbClient.from(TABLES.APPLICANTS).select('*').eq('id', id).single(),
        'Applicant lookup'
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
        const applicant = await safeExecute(
          () => this.dbClient.from(TABLES.APPLICANTS)
            .update({
              name: data.name,
              email: data.email,
              status: data.status,
              cv_data: data.cvData,
              linkedin_data: data.linkedinData,
              github_data: data.githubData,
              analysis_result: data.analysisResult,
              individual_analysis: data.individualAnalysis,
              cross_reference_analysis: data.crossReferenceAnalysis,
              score: data.score,
              role: data.role
            })
            .eq('id', id)
            .select()
            .single(),
          'Applicant update'
        );

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
        await safeExecute(
          () => this.dbClient.from(TABLES.APPLICANTS).delete().eq('id', id),
          'Applicant deletion'
        );
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

      const result = await safeExecuteArray(() => query, 'User applicants');
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
        () => this.dbClient.from(TABLES.FILES).select('*').eq('applicant_id', applicantId),
        'Applicant files'
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