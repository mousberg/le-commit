import { createClient } from '../supabase/client';
import { FileRecord, CreateFileData, DatabaseService } from '../interfaces/database';
import { browserDatabaseService } from './database';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';
import { string } from '@elevenlabs/elevenlabs-js/core/schemas';

export interface FileMetadata {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

export interface FileValidationConfig {
  maxSizeBytes: number;
  allowedTypes: string[];
  allowedExtensions: string[];
}

export interface StorageQuotaInfo {
  used: number;
  limit: number;
  available: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AccessControlContext {
  userId: string;
  workspaceId: string;
  userRole: 'owner' | 'admin' | 'read_only';
  operation: 'read' | 'write' | 'delete';
}

export interface UploadResult {
  path: string;
  fullPath: string;
  id?: string;
  fileRecord?: FileRecord;
}

export interface StorageService {
  uploadFile(bucket: string, path: string, file: File | Buffer, metadata?: FileMetadata): Promise<UploadResult>;
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string>;
  getPublicUrl(bucket: string, path: string): string;
  deleteFile(bucket: string, path: string): Promise<boolean>;
  moveFile(fromBucket: string, fromPath: string, toBucket: string, toPath: string): Promise<boolean>;
  listFiles(bucket: string, path?: string): Promise<string[]>;

  // High-level applicant file operations
  uploadApplicantFile(
    workspaceId: string,
    applicantId: string,
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string
  ): Promise<UploadResult>;

  getApplicantFileUrl(
    workspaceId: string,
    applicantId: string,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    filename: string,
    expiresIn?: number
  ): Promise<string>;

  deleteApplicantFile(
    workspaceId: string,
    applicantId: string,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    filename: string
  ): Promise<boolean>;

  // Additional file management operations
  deleteAllApplicantFiles(applicantId: string): Promise<boolean>;
  getApplicantFileUrls(applicantId: string, expiresIn?: number): Promise<Record<string, string>>;
  getApplicantFileMetadata(applicantId: string): Promise<FileRecord[]>;
  hasApplicantFile(
    applicantId: string,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    filename?: string
  ): Promise<boolean>;
  replaceApplicantFile(
    workspaceId: string,
    applicantId: string,
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string,
    oldFilename?: string
  ): Promise<UploadResult>;

  // File validation and access control operations
  validateFileBeforeUpload(
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string
  ): FileValidationResult;
  checkUserStorageQuota(workspaceId: string, userId: string, additionalSize: number): Promise<void>;
  getWorkspaceStorageUsage(workspaceId: string): Promise<StorageQuotaInfo>;
  getUserStorageUsage(userId: string): Promise<StorageQuotaInfo>;
  validateUserAccess(
    workspaceId: string,
    userId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void>;
}

export class SupabaseStorageService implements StorageService {
  private supabase = createClient();
  private dbService: DatabaseService;

  // Storage bucket names
  private readonly buckets = {
    cv: 'cv-files',
    linkedin: 'linkedin-files',
    github: 'github-files',
    other: 'other-files'
  } as const;

  // File validation configurations by type
  private readonly fileValidationConfigs: Record<string, FileValidationConfig> = {
    cv: {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ],
      allowedExtensions: ['pdf', 'doc', 'docx', 'txt']
    },
    linkedin: {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'application/pdf',
        'text/html',
        'text/plain'
      ],
      allowedExtensions: ['pdf', 'html', 'txt']
    },
    github: {
      maxSizeBytes: 5 * 1024 * 1024, // 5MB
      allowedTypes: [
        'application/json',
        'text/plain',
        'text/html'
      ],
      allowedExtensions: ['json', 'txt', 'html']
    },
    other: {
      maxSizeBytes: 20 * 1024 * 1024, // 20MB
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ],
      allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif']
    }
  };

  // Storage quota limits (in bytes)
  private readonly storageQuotaLimits = {
    perWorkspace: 1024 * 1024 * 1024, // 1GB per workspace
    perUser: 5 * 1024 * 1024 * 1024,  // 5GB per user
    perFile: 50 * 1024 * 1024         // 50MB per file (absolute max)
  };

  constructor(dbService?: DatabaseService) {
    this.dbService = dbService || browserDatabaseService;
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File | Buffer,
    metadata?: FileMetadata
  ): Promise<UploadResult> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: metadata?.contentType,
          cacheControl: metadata?.cacheControl || '3600',
          upsert: metadata?.upsert || false
        });

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      return {
        path: data.path,
        fullPath: data.fullPath,
        id: data.id
      };
    } catch (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
  }

  /**
   * Get a signed URL for private file access
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned from Supabase');
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Storage signed URL error:', error);
      throw error;
    }
  }

  /**
   * Get a public URL for public file access
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
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
        console.error(`Failed to delete file: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  }

  /**
   * Move a file between buckets or paths
   * Note: Supabase Storage move operation works within the same bucket
   */
  async moveFile(
    fromBucket: string,
    fromPath: string,
    toBucket: string,
    toPath: string
  ): Promise<boolean> {
    try {
      // If moving between different buckets, we need to copy and delete
      if (fromBucket !== toBucket) {
        // For cross-bucket moves, we'd need to download and re-upload
        // This is a limitation of Supabase Storage API
        console.warn('Cross-bucket moves require download/upload - not implemented');
        return false;
      }

      const { error } = await this.supabase.storage
        .from(fromBucket)
        .move(fromPath, toPath);

      if (error) {
        console.error(`Failed to move file: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Storage move error:', error);
      return false;
    }
  }

  /**
   * List files in a bucket/path
   */
  async listFiles(bucket: string, path: string = ''): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(path);

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      return data?.map(file => file.name) || [];
    } catch (error) {
      console.error('Storage list error:', error);
      return [];
    }
  }

  /**
   * Generate storage path for applicant files
   */
  private generateApplicantFilePath(
    workspaceId: string,
    applicantId: string,
    fileType: string,
    filename: string
  ): string {
    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${workspaceId}/${applicantId}/${timestamp}_${sanitizedFilename}`;
  }

  /**
   * Get the appropriate bucket for a file type
   */
  private getBucketForFileType(fileType: 'cv' | 'linkedin' | 'github' | 'other'): string {
    return this.buckets[fileType];
  }

  /**
   * Validate file type, size, and extension
   */
  private validateFile(
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string
  ): FileValidationResult {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const config = this.fileValidationConfigs[fileType];
    if (!config) {
      result.isValid = false;
      result.errors.push(`Unknown file type: ${fileType}`);
      return result;
    }

    // Check file size
    const fileSize = file instanceof File ? file.size : file.length;
    if (fileSize > config.maxSizeBytes) {
      result.isValid = false;
      result.errors.push(
        `File size (${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB) exceeds maximum allowed size (${Math.round(config.maxSizeBytes / 1024 / 1024 * 100) / 100}MB) for ${fileType} files`
      );
    }

    // Check absolute file size limit
    if (fileSize > this.storageQuotaLimits.perFile) {
      result.isValid = false;
      result.errors.push(
        `File size (${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB) exceeds absolute maximum file size limit (${Math.round(this.storageQuotaLimits.perFile / 1024 / 1024 * 100) / 100}MB)`
      );
    }

    // Check file extension
    const extension = originalFilename.toLowerCase().split('.').pop();
    if (!extension || !config.allowedExtensions.includes(extension)) {
      result.isValid = false;
      result.errors.push(
        `File extension '.${extension || 'unknown'}' is not allowed for ${fileType} files. Allowed extensions: ${config.allowedExtensions.join(', ')}`
      );
    }

    // Check MIME type if available
    if (file instanceof File && file.type) {
      if (!config.allowedTypes.includes(file.type)) {
        result.isValid = false;
        result.errors.push(
          `File type '${file.type}' is not allowed for ${fileType} files. Allowed types: ${config.allowedTypes.join(', ')}`
        );
      }
    }

    // Add warnings for large files
    if (fileSize > config.maxSizeBytes * 0.8) {
      result.warnings.push(
        `File size is approaching the maximum limit for ${fileType} files`
      );
    }

    return result;
  }

  /**
   * Check access control permissions for file operations
   */
  private async checkAccessControl(context: AccessControlContext): Promise<void> {
    try {
      // Get current user from Supabase Auth
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      if (user.id !== context.userId) {
        throw new Error('User ID mismatch in access control context');
      }

      // Check workspace membership and role
      const workspaceMember = await this.dbService.getWorkspaceMember(context.workspaceId, context.userId);

      if (!workspaceMember) {
        throw new Error(`User does not have access to workspace ${context.workspaceId}`);
      }

      // Check role-based permissions
      switch (context.operation) {
        case 'read':
          // All workspace members can read files
          break;

        case 'write':
          if (workspaceMember.role === 'read_only') {
            throw new Error('Read-only users cannot upload or modify files');
          }
          break;

        case 'delete':
          if (workspaceMember.role === 'read_only') {
            throw new Error('Read-only users cannot delete files');
          }
          break;

        default:
          throw new Error(`Unknown operation: ${context.operation}`);
      }
    } catch (error) {
      console.error('Access control check failed:', error);
      throw error;
    }
  }

  /**
   * Check storage quota for workspace and user
   */
  private async checkStorageQuota(
    workspaceId: string,
    userId: string,
    additionalSize: number
  ): Promise<void> {
    try {
      // Get current storage usage for workspace
      const workspaceUsage = await this.getWorkspaceStorageUsage(workspaceId);
      if (workspaceUsage.used + additionalSize > this.storageQuotaLimits.perWorkspace) {
        throw new Error(
          `Workspace storage quota exceeded. Current usage: ${Math.round(workspaceUsage.used / 1024 / 1024 * 100) / 100}MB, ` +
          `Limit: ${Math.round(this.storageQuotaLimits.perWorkspace / 1024 / 1024 * 100) / 100}MB, ` +
          `Additional size: ${Math.round(additionalSize / 1024 / 1024 * 100) / 100}MB`
        );
      }

      // Get current storage usage for user
      const userUsage = await this.getUserStorageUsage(userId);
      if (userUsage.used + additionalSize > this.storageQuotaLimits.perUser) {
        throw new Error(
          `User storage quota exceeded. Current usage: ${Math.round(userUsage.used / 1024 / 1024 * 100) / 100}MB, ` +
          `Limit: ${Math.round(this.storageQuotaLimits.perUser / 1024 / 1024 * 100) / 100}MB, ` +
          `Additional size: ${Math.round(additionalSize / 1024 / 1024 * 100) / 100}MB`
        );
      }
    } catch (error) {
      console.error('Storage quota check failed:', error);
      throw error;
    }
  }

  /**
   * Get storage usage for a workspace
   */
  private async getWorkspaceStorageUsage(workspaceId: string): Promise<StorageQuotaInfo> {
    try {
      const fileRecords = await this.dbService.getWorkspaceFiles(workspaceId);
      const used = fileRecords.reduce((total, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace - used
      };
    } catch (error) {
      console.error('Error getting workspace storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace
      };
    }
  }

  /**
   * Get storage usage for a user across all workspaces
   */
  private async getUserStorageUsage(userId: string): Promise<StorageQuotaInfo> {
    try {
      const fileRecords = await this.dbService.getUserFiles(userId);
      const used = fileRecords.reduce((total, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser - used
      };
    } catch (error) {
      console.error('Error getting user storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser
      };
    }
  }

  /**
   * Handle storage operation errors with detailed context
   */
  private handleStorageError(error: any, operation: string, context?: any): Error {
    let message = `Storage ${operation} failed`;
    let userMessage = `Failed to ${operation} file. Please try again.`;

    if (error?.message) {
      // Parse Supabase storage errors
      if (error.message.includes('Payload too large')) {
        userMessage = 'File is too large. Please choose a smaller file.';
      } else if (error.message.includes('Invalid file type')) {
        userMessage = 'File type is not supported. Please choose a different file.';
      } else if (error.message.includes('Storage quota exceeded')) {
        userMessage = 'Storage quota exceeded. Please delete some files or contact support.';
      } else if (error.message.includes('Permission denied')) {
        userMessage = 'You do not have permission to perform this action.';
      } else if (error.message.includes('File not found')) {
        userMessage = 'File not found. It may have been deleted or moved.';
      } else if (error.message.includes('Network error')) {
        userMessage = 'Network error. Please check your connection and try again.';
      }

      message = `${message}: ${error.message}`;
    }

    // Log detailed error information for debugging
    console.error('Storage operation error:', {
      operation,
      error: error?.message || error,
      context,
      timestamp: new Date().toISOString()
    });

    // Create error with user-friendly message
    const storageError = new Error(userMessage);
    (storageError as any).originalError = error;
    (storageError as any).operation = operation;
    (storageError as any).context = context;

    return storageError;
  }

  /**
   * Upload an applicant-specific file with proper organization and database tracking
   */
  async uploadApplicantFile(
    workspaceId: string,
    applicantId: string,
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string
  ): Promise<UploadResult> {
    try {
      // Step 1: Validate file
      const validation = this.validateFile(file, fileType, originalFilename);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn('File validation warnings:', validation.warnings);
      }

      // Step 2: Get current user and check access control
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const accessContext: AccessControlContext = {
        userId: user.id,
        workspaceId,
        userRole: 'admin', // This will be determined by checkAccessControl
        operation: 'write'
      };

      await this.checkAccessControl(accessContext);

      // Step 3: Check storage quota
      const fileSize = file instanceof File ? file.size : file.length;
      await this.checkStorageQuota(workspaceId, user.id, fileSize);

      // Step 4: Prepare file metadata
      const bucket = this.getBucketForFileType(fileType);
      const storagePath = this.generateApplicantFilePath(workspaceId, applicantId, fileType, originalFilename);

      let contentType: string | undefined;
      if (file instanceof File) {
        contentType = file.type;
      } else {
        // Infer from filename extension
        const ext = originalFilename.toLowerCase().split('.').pop();
        switch (ext) {
          case 'pdf':
            contentType = 'application/pdf';
            break;
          case 'doc':
            contentType = 'application/msword';
            break;
          case 'docx':
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
          default:
            contentType = 'application/octet-stream';
        }
      }

      // Step 5: Upload file to storage
      const uploadResult = await this.uploadFile(bucket, storagePath, file, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

      // Step 6: Create file record in database
      const fileRecord = await this.dbService.createFileRecord({
        applicantId,
        fileType,
        originalFilename,
        storagePath: uploadResult.path,
        storageBucket: bucket,
        fileSize,
        mimeType: contentType
      });

      return {
        ...uploadResult,
        fileRecord
      };
    } catch (error) {
      // Enhanced error handling with cleanup
      const storageError = this.handleStorageError(error, 'upload', {
        workspaceId,
        applicantId,
        fileType,
        originalFilename
      });

      // If upload succeeded but database record creation failed, clean up the uploaded file
      if (error instanceof Error && error.message.includes('database')) {
        try {
          const bucket = this.getBucketForFileType(fileType);
          const storagePath = this.generateApplicantFilePath(workspaceId, applicantId, fileType, originalFilename);
          await this.deleteFile(bucket, storagePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup file after database error:', cleanupError);
        }
      }

      throw storageError;
    }
  }

  /**
   * Get signed URL for an applicant file using database record
   */
  async getApplicantFileUrl(
    workspaceId: string,
    applicantId: string,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    filename: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      // Step 1: Check access control
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const accessContext: AccessControlContext = {
        userId: user.id,
        workspaceId,
        userRole: 'admin', // This will be determined by checkAccessControl
        operation: 'read'
      };

      await this.checkAccessControl(accessContext);

      // Step 2: Get file records for the applicant
      const fileRecords = await this.dbService.getApplicantFiles(applicantId);

      // Find the specific file record
      const fileRecord = fileRecords.find(record =>
        record.fileType === fileType &&
        record.originalFilename === filename
      );

      if (!fileRecord) {
        throw new Error(`File not found: ${filename} of type ${fileType} for applicant ${applicantId}`);
      }

      // Step 3: Generate signed URL
      return this.getSignedUrl(fileRecord.storageBucket, fileRecord.storagePath, expiresIn);
    } catch (error) {
      const storageError = this.handleStorageError(error, 'get file URL', {
        workspaceId,
        applicantId,
        fileType,
        filename
      });
      throw storageError;
    }
  }

  /**
   * Delete an applicant file and its database record
   */
  async deleteApplicantFile(
    workspaceId: string,
    applicantId: string,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    filename: string
  ): Promise<boolean> {
    try {
      // Step 1: Check access control
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const accessContext: AccessControlContext = {
        userId: user.id,
        workspaceId,
        userRole: 'admin', // This will be determined by checkAccessControl
        operation: 'delete'
      };

      await this.checkAccessControl(accessContext);

      // Step 2: Get file records for the applicant
      const fileRecords = await this.dbService.getApplicantFiles(applicantId);

      // Find the specific file record
      const fileRecord = fileRecords.find(record =>
        record.fileType === fileType &&
        record.originalFilename === filename
      );

      if (!fileRecord) {
        console.warn(`File record not found: ${filename} of type ${fileType} for applicant ${applicantId}`);
        return false;
      }

      // Step 3: Delete from storage
      const storageDeleted = await this.deleteFile(fileRecord.storageBucket, fileRecord.storagePath);

      // Step 4: Delete database record
      const dbDeleted = await this.dbService.deleteFileRecord(fileRecord.id);

      return storageDeleted && dbDeleted;
    } catch (error) {
      const storageError = this.handleStorageError(error, 'delete', {
        workspaceId,
        applicantId,
        fileType,
        filename
      });
      console.error('Error deleting applicant file:', storageError);
      return false;
    }
  }

  /**
   * Delete all files for an applicant (cleanup operation)
   */
  async deleteAllApplicantFiles(applicantId: string): Promise<boolean> {
    try {
      const fileRecords = await this.dbService.getApplicantFiles(applicantId);

      if (fileRecords.length === 0) {
        return true; // No files to delete
      }

      let allDeleted = true;

      // Delete each file from storage and database
      for (const fileRecord of fileRecords) {
        try {
          // Delete from storage
          const storageDeleted = await this.deleteFile(fileRecord.storageBucket, fileRecord.storagePath);

          // Delete database record
          const dbDeleted = await this.dbService.deleteFileRecord(fileRecord.id);

          if (!storageDeleted || !dbDeleted) {
            allDeleted = false;
            console.error(`Failed to delete file: ${fileRecord.originalFilename} for applicant ${applicantId}`);
          }
        } catch (error) {
          allDeleted = false;
          console.error(`Error deleting file ${fileRecord.originalFilename}:`, error);
        }
      }

      return allDeleted;
    } catch (error) {
      console.error('Error deleting all applicant files:', error);
      return false;
    }
  }

  /**
   * Get all file URLs for an applicant
   */
  async getApplicantFileUrls(applicantId: string, expiresIn: number = 3600): Promise<Record<string, string>> {
    try {
      const fileRecords = await this.dbService.getApplicantFiles(applicantId);
      const fileUrls: Record<string, string> = {};

      for (const fileRecord of fileRecords) {
        try {
          const url = await this.getSignedUrl(fileRecord.storageBucket, fileRecord.storagePath, expiresIn);
          const key = `${fileRecord.fileType}_${fileRecord.originalFilename}`;
          fileUrls[key] = url;
        } catch (error) {
          console.error(`Failed to get URL for file ${fileRecord.originalFilename}:`, error);
        }
      }

      return fileUrls;
    } catch (error) {
      console.error('Error getting applicant file URLs:', error);
      return {};
    }
  }

  /**
   * Get file metadata for an applicant
   */
  async getApplicantFileMetadata(applicantId: string): Promise<FileRecord[]> {
    try {
      return await this.dbService.getApplicantFiles(applicantId);
    } catch (error) {
      console.error('Error getting applicant file metadata:', error);
      return [];
    }
  }

  /**
   * Check if a file exists for an applicant
   */
  async hasApplicantFile(
    applicantId: string,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    filename?: string
  ): Promise<boolean> {
    try {
      const fileRecords = await this.dbService.getApplicantFiles(applicantId);

      if (filename) {
        return fileRecords.some(record =>
          record.fileType === fileType &&
          record.originalFilename === filename
        );
      } else {
        return fileRecords.some(record => record.fileType === fileType);
      }
    } catch (error) {
      console.error('Error checking if applicant has file:', error);
      return false;
    }
  }

  /**
   * Replace an existing file (delete old, upload new)
   */
  async replaceApplicantFile(
    workspaceId: string,
    applicantId: string,
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string,
    oldFilename?: string
  ): Promise<UploadResult> {
    try {
      // If old filename is provided, delete the old file first
      if (oldFilename) {
        await this.deleteApplicantFile(workspaceId, applicantId, fileType, oldFilename);
      } else {
        // Delete any existing file of the same type
        const fileRecords = await this.dbService.getApplicantFiles(applicantId);
        const existingFile = fileRecords.find(record => record.fileType === fileType);
        if (existingFile) {
          await this.deleteApplicantFile(workspaceId, applicantId, fileType, existingFile.originalFilename);
        }
      }

      // Upload the new file
      return await this.uploadApplicantFile(workspaceId, applicantId, file, fileType, originalFilename);
    } catch (error) {
      console.error('Error replacing applicant file:', error);
      throw error;
    }
  }

  // Public file validation and access control methods

  /**
   * Validate a file before upload without actually uploading it
   */
  validateFileBeforeUpload(
    file: File | Buffer,
    fileType: 'cv' | 'linkedin' | 'github' | 'other',
    originalFilename: string
  ): FileValidationResult {
    return this.validateFile(file, fileType, originalFilename);
  }

  /**
   * Check user storage quota before upload
   */
  async checkUserStorageQuota(workspaceId: string, userId: string, additionalSize: number): Promise<void> {
    await this.checkStorageQuota(workspaceId, userId, additionalSize);
  }

  /**
   * Get storage usage information for a workspace (public method)
   */
  async getWorkspaceStorageUsage(workspaceId: string): Promise<StorageQuotaInfo> {
    try {
      const fileRecords = await this.dbService.getWorkspaceFiles(workspaceId);
      const used = fileRecords.reduce((total, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace - used
      };
    } catch (error) {
      console.error('Error getting workspace storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace
      };
    }
  }

  /**
   * Get storage usage information for a user across all workspaces (public method)
   */
  async getUserStorageUsage(userId: string): Promise<StorageQuotaInfo> {
    try {
      const fileRecords = await this.dbService.getUserFiles(userId);
      const used = fileRecords.reduce((total, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser - used
      };
    } catch (error) {
      console.error('Error getting user storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser
      };
    }
  }

  /**
   * Validate user access to a workspace for file operations
   */
  async validateUserAccess(
    workspaceId: string,
    userId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    const accessContext: AccessControlContext = {
      userId,
      workspaceId,
      userRole: 'admin', // This will be determined by checkAccessControl
      operation
    };

    await this.checkAccessControl(accessContext);
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService();al, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace - used
      };
    } catch (error) {
      console.error('Error getting workspace storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace
      };
    }
  }

  /**
   * Get storage usage information for a user across all workspaces (public method)
   */
  async getUserStorageUsage(userId: string): Promise<StorageQuotaInfo> {
    try {
      const fileRecords = await this.dbService.getUserFiles(userId);
      const used = fileRecords.reduce((total, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser - used
      };
    } catch (error) {
      console.error('Error getting user storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser
      };
    }
  }

  /**
   * Validate user access to a workspace for file operations
   */
  async validateUserAccess(
    workspaceId: string,
    userId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    const accessContext: AccessControlContext = {
      userId,
      workspaceId,
      userRole: 'admin', // This will be determined by checkAccessControl
      operation
    };

    await this.checkAccessControl(accessContext);
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService();al, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace - used
      };
    } catch (error) {
      console.error('Error getting workspace storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace
      };
    }
  }

  /**
   * Get storage usage information for a user across all workspaces (public method)
   */
  async getUserStorageUsage(userId: string): Promise<StorageQuotaInfo> {
    try {
      const fileRecords = await this.dbService.getUserFiles(userId);
      const used = fileRecords.reduce((total, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser - used
      };
    } catch (error) {
      console.error('Error getting user storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser
      };
    }
  }

  /**
   * Validate user access to a workspace for file operations
   */
  async validateUserAccess(
    workspaceId: string,
    userId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    const accessContext: AccessControlContext = {
      userId,
      workspaceId,
      userRole: 'admin', // This will be determined by checkAccessControl
      operation
    };

    await this.checkAccessControl(accessContext);
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService();al, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace - used
      };
    } catch (error) {
      console.error('Error getting workspace storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace
      };
    }
  }

  /**
   * Get storage usage information for a user across all workspaces (public method)
   */
  async getUserStorageUsage(userId: string): Promise<StorageQuotaInfo> {
    try {
      const fileRecords = await this.dbService.getUserFiles(userId);
      const used = fileRecords.reduce((total, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser - used
      };
    } catch (error) {
      console.error('Error getting user storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser
      };
    }
  }

  /**
   * Validate user access to a workspace for file operations
   */
  async validateUserAccess(
    workspaceId: string,
    userId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    const accessContext: AccessControlContext = {
      userId,
      workspaceId,
      userRole: 'admin', // This will be determined by checkAccessControl
      operation
    };

    await this.checkAccessControl(accessContext);
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService();al, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace - used
      };
    } catch (error) {
      console.error('Error getting workspace storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perWorkspace,
        available: this.storageQuotaLimits.perWorkspace
      };
    }
  }

  /**
   * Get storage usage information for a user across all workspaces (public method)
   */
  async getUserStorageUsage(userId: string): Promise<StorageQuotaInfo> {
    try {
      const fileRecords = await this.dbService.getUserFiles(userId);
      const used = fileRecords.reduce((total, file) => total + (file.fileSize || 0), 0);

      return {
        used,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser - used
      };
    } catch (error) {
      console.error('Error getting user storage usage:', error);
      return {
        used: 0,
        limit: this.storageQuotaLimits.perUser,
        available: this.storageQuotaLimits.perUser
      };
    }
  }

  /**
   * Validate user access to a workspace for file operations
   */
  async validateUserAccess(
    workspaceId: string,
    userId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    const accessContext: AccessControlContext = {
      userId,
      workspaceId,
      userRole: 'admin', // This will be determined by checkAccessControl
      operation
    };

    await this.checkAccessControl(accessContext);
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService(); getUserStorageUsage(userId: string): Promise<StorageQuotaInfo> {
    return this.getUserStorageUsage(userId);
  }

  /**
   * Validate user access to a workspace for file operations
   */
  async validateUserAccess(
    workspaceId: string,
    userId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    const accessContext: AccessControlContext = {
      userId,
      workspaceId,
      userRole: 'admin', // This will be determined by checkAccessControl
      operation
    };

    await this.checkAccessControl(accessContext);
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService();,
      userRole: 'admin', // This will be determined by checkAccessControl
      operation
    };

    await this.checkAccessControl(accessContext);
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService();
