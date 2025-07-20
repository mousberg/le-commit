// Simplified Supabase Storage Service

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseDatabaseService } from './database';

// Storage configuration
export const STORAGE_BUCKETS = {
  CV_FILES: 'cv-files',
  LINKEDIN_FILES: 'linkedin-files',
  OTHER_FILES: 'other-files',
} as const;

// Simple interfaces
export interface FileUploadResult {
  path: string;
  publicUrl?: string;
}

export interface StorageQuotaInfo {
  used: number;
  limit: number;
  available: number;
}

export interface StorageService {
  uploadApplicantFile(
    workspaceId: string,
    applicantId: string,
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string
  ): Promise<FileUploadResult>;

  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string>;
  deleteFile(bucket: string, path: string): Promise<boolean>;
  deleteAllApplicantFiles(applicantId: string): Promise<boolean>;
}

export class SupabaseStorageService implements StorageService {
  private supabase: SupabaseClient;
  private dbService: SupabaseDatabaseService;

  // Storage limits (10MB per file, 1GB per workspace)
  private readonly limits = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxWorkspaceStorage: 1024 * 1024 * 1024, // 1GB
  };

  constructor(dbService?: SupabaseDatabaseService) {
    // Initialize with temp values - will be properly set in initializeClients
    this.supabase = {} as SupabaseClient;
    this.dbService = {} as SupabaseDatabaseService;
    this.initializeClients(dbService);
  }

  private async initializeClients(dbService?: SupabaseDatabaseService) {
    this.supabase = await createClient();
    if (dbService) {
      this.dbService = dbService;
    } else {
      const { getServerDatabaseClient } = await import('../supabase/database');
      const dbClient = await getServerDatabaseClient();
      this.dbService = new SupabaseDatabaseService(dbClient);
    }
  }

  /**
   * Upload a file for an applicant with proper organization
   */
  async uploadApplicantFile(
    workspaceId: string,
    applicantId: string,
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string
  ): Promise<FileUploadResult> {
    // Basic validation
    const fileSize = file instanceof File ? file.size : file.length;
    if (fileSize > this.limits.maxFileSize) {
      throw new Error(`File size (${Math.round(fileSize / (1024 * 1024))}MB) exceeds limit (10MB)`);
    }

    // Generate file path
    const bucket = this.getBucketForFileType(fileType);
    const path = `${workspaceId}/${applicantId}/${Date.now()}_${originalFilename}`;

    try {
      // Upload to Supabase Storage
      const fileBuffer = file instanceof File ?
        Buffer.from(await file.arrayBuffer()) :
        file;

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, fileBuffer, {
          contentType: this.getMimeType(originalFilename),
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Store file record in database
      await this.dbService.createFileRecord({
        applicantId,
        fileType,
        originalFilename,
        storagePath: data.path,
        storageBucket: bucket,
        fileSize,
        mimeType: this.getMimeType(originalFilename)
      });

      return {
        path: data.path
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Get a signed URL for file access
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Get signed URL error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete file error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  /**
   * Delete all files for an applicant
   */
  async deleteAllApplicantFiles(applicantId: string): Promise<boolean> {
    try {
      // Get all file records for the applicant
      const fileRecords = await this.dbService.getApplicantFiles(applicantId);

      // Delete files from storage
      const deletePromises = fileRecords.map(file =>
        this.deleteFile(file.storageBucket, file.storagePath)
      );

      await Promise.all(deletePromises);

      // Delete file records from database
      const dbDeletePromises = fileRecords.map(file =>
        this.dbService.deleteFileRecord(file.id)
      );

      await Promise.all(dbDeletePromises);

      return true;
    } catch (error) {
      console.error('Delete applicant files error:', error);
      return false;
    }
  }

  /**
   * Get storage bucket for file type
   */
  private getBucketForFileType(fileType: string): string {
    switch (fileType) {
      case 'cv':
        return STORAGE_BUCKETS.CV_FILES;
      case 'linkedin':
        return STORAGE_BUCKETS.LINKEDIN_FILES;
      default:
        return STORAGE_BUCKETS.OTHER_FILES;
    }
  }

  /**
   * Get MIME type for file
   */
  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Basic file validation
   */
  validateFile(file: File, fileType: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Size check
    if (file.size > this.limits.maxFileSize) {
      errors.push(`File too large (max 10MB)`);
    }

    // Type check for CV files
    if (fileType === 'cv' && !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      errors.push('CV must be PDF, DOC, or DOCX');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService();
