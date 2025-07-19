import { storageService, UploadResult } from './storage';
import { DatabaseService, FileRecord, CreateFileData, WorkspaceRole } from '../interfaces/database';

export interface FileUploadOptions {
  workspaceId: string;
  applicantId: string;
  fileType: 'cv' | 'linkedin' | 'github' | 'other';
  originalFilename: string;
  file: File | Buffer;
  userId?: string; // For access control
}

export interface FileUploadResult {
  fileRecord: FileRecord;
  storageResult: UploadResult;
  signedUrl: string;
}

export interface FileAccessResult {
  fileRecord: FileRecord;
  signedUrl: string;
}

export interface FileAccessOptions {
  userId?: string;
  requiredRole?: WorkspaceRole;
  expiresIn?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface QuotaValidationResult {
  isValid: boolean;
  currentUsage: number;
  limit: number;
  availableSpace: number;
  errors: string[];
}

export interface StorageUsageResult {
  totalFiles: number;
  totalSize: number;
  usageByType: Record<string, { count: number; size: number }>;
  quota: {
    limit: number;
    used: number;
    available: number;
    percentUsed: number;
  };
}

export interface CleanupResult {
  orphanedFiles: number;
  deletedFiles: number;
  freedSpace: number;
  errors: string[];
}

export interface FileManagerService {
  uploadFile(options: FileUploadOptions): Promise<FileUploadResult>;
  getFile(fileId: string, options?: FileAccessOptions): Promise<FileAccessResult>;
  getApplicantFiles(applicantId: string, userId?: string): Promise<FileRecord[]>;
  deleteFile(fileId: string, userId?: string): Promise<boolean>;
  getFileUrl(fileId: string, options?: FileAccessOptions): Promise<string>;

  // Bulk operations
  uploadMultipleFiles(files: FileUploadOptions[]): Promise<FileUploadResult[]>;
  deleteApplicantFiles(applicantId: string, userId?: string): Promise<boolean>;

  // File validation and access control
  validateFile(file: File | Buffer, fileType: 'cv' | 'linkedin' | 'github' | 'other'): Promise<ValidationResult>;
  validateFileAccess(fileId: string, userId: string, requiredRole?: WorkspaceRole): Promise<boolean>;
  validateStorageQuota(workspaceId: string, fileSize: number): Promise<QuotaValidationResult>;

  // Storage management
  getWorkspaceStorageUsage(workspaceId: string): Promise<StorageUsageResult>;
  cleanupOrphanedFiles(workspaceId: string): Promise<CleanupResult>;
}

export class FileManager implements FileManagerService {
  // Storage quota limits (in bytes)
  private readonly STORAGE_LIMITS = {
    workspace: 1024 * 1024 * 1024, // 1GB per workspace
    file: {
      cv: 10 * 1024 * 1024, // 10MB
      linkedin: 10 * 1024 * 1024, // 10MB
      github: 5 * 1024 * 1024, // 5MB
      other: 20 * 1024 * 1024 // 20MB
    }
  };

  constructor(private databaseService: DatabaseService) {}

  /**
   * Upload a file with access control and validation
   */
  async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
    const { workspaceId, applicantId, fileType, originalFilename, file, userId } = options;

    try {
      // Access control check
      if (userId) {
        const hasAccess = await this.databaseService.canUserModifyApplicant(applicantId, userId);
        if (!hasAccess) {
          throw new Error('Insufficient permissions to upload files for this applicant');
        }
      }

      // Validate file
      const validation = await this.validateFile(file, fileType);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Check storage quota
      const fileSize = file instanceof File ? file.size : file.length;
      const quotaValidation = await this.validateStorageQuota(workspaceId, fileSize);
      if (!quotaValidation.isValid) {
        throw new Error(`Storage quota exceeded: ${quotaValidation.errors.join(', ')}`);
      }

      // Upload to storage
      const storageResult = await storageService.uploadApplicantFile(
        workspaceId,
        applicantId,
        file,
        fileType,
        originalFilename
      );

      // Determine MIME type
      let mimeType: string | undefined;
      if (file instanceof File) {
        mimeType = file.type;
      } else {
        mimeType = this.inferMimeType(originalFilename);
      }

      // Create database record
      const fileData: CreateFileData = {
        applicantId,
        fileType,
        originalFilename,
        storagePath: storageResult.path,
        storageBucket: this.getBucketForFileType(fileType),
        fileSize,
        mimeType
      };

      const fileRecord = await this.databaseService.createFileRecord(fileData);

      // Generate signed URL for immediate access
      const signedUrl = await storageService.getSignedUrl(
        fileData.storageBucket,
        storageResult.path,
        3600 // 1 hour
      );

      return {
        fileRecord,
        storageResult,
        signedUrl
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Get file with access control
   */
  async getFile(fileId: string, options: FileAccessOptions = {}): Promise<FileAccessResult> {
    const { userId, requiredRole, expiresIn = 3600 } = options;

    try {
      const fileRecord = await this.databaseService.getFileRecord(fileId);
      if (!fileRecord) {
        throw new Error('File not found');
      }

      // Access control check
      if (userId) {
        const hasAccess = await this.validateFileAccess(fileId, userId, requiredRole);
        if (!hasAccess) {
          throw new Error('Insufficient permissions to access this file');
        }
      }

      const signedUrl = await storageService.getSignedUrl(
        fileRecord.storageBucket,
        fileRecord.storagePath,
        expiresIn
      );

      return {
        fileRecord,
        signedUrl
      };
    } catch (error) {
      console.error('Get file error:', error);
      throw error;
    }
  }

  /**
   * Get all files for an applicant with access control
   */
  async getApplicantFiles(applicantId: string, userId?: string): Promise<FileRecord[]> {
    try {
      // Access control check
      if (userId) {
        const hasAccess = await this.databaseService.canUserViewApplicant(applicantId, userId);
        if (!hasAccess) {
          throw new Error('Insufficient permissions to view files for this applicant');
        }
      }

      return await this.databaseService.getApplicantFiles(applicantId);
    } catch (error) {
      console.error('Get applicant files error:', error);
      throw error;
    }
  }

  /**
   * Delete file with access control
   */
  async deleteFile(fileId: string, userId?: string): Promise<boolean> {
    try {
      const fileRecord = await this.databaseService.getFileRecord(fileId);
      if (!fileRecord) {
        console.warn(`File record ${fileId} not found`);
        return false;
      }

      // Access control check
      if (userId) {
        const hasAccess = await this.databaseService.canUserModifyApplicant(fileRecord.applicantId, userId);
        if (!hasAccess) {
          return false; // Return false instead of throwing for access control
        }
      }

      // Delete from storage
      const storageDeleted = await storageService.deleteFile(
        fileRecord.storageBucket,
        fileRecord.storagePath
      );

      // Delete database record
      const dbDeleted = await this.databaseService.deleteFileRecord(fileId);

      if (!storageDeleted) {
        console.warn(`Failed to delete file from storage: ${fileRecord.storagePath}`);
      }

      return dbDeleted;
    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  /**
   * Get signed URL for a file with access control
   */
  async getFileUrl(fileId: string, options: FileAccessOptions = {}): Promise<string> {
    const { userId, requiredRole, expiresIn = 3600 } = options;

    try {
      const fileRecord = await this.databaseService.getFileRecord(fileId);
      if (!fileRecord) {
        throw new Error('File not found');
      }

      // Access control check
      if (userId) {
        const hasAccess = await this.validateFileAccess(fileId, userId, requiredRole);
        if (!hasAccess) {
          throw new Error('Insufficient permissions to access this file');
        }
      }

      return await storageService.getSignedUrl(
        fileRecord.storageBucket,
        fileRecord.storagePath,
        expiresIn
      );
    } catch (error) {
      console.error('Get file URL error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files with access control
   */
  async uploadMultipleFiles(files: FileUploadOptions[]): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];
    const errors: Error[] = [];

    for (const fileOptions of files) {
      try {
        const result = await this.uploadFile(fileOptions);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${fileOptions.originalFilename}:`, error);
        errors.push(error as Error);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`All file uploads failed: ${errors.map(e => e.message).join(', ')}`);
    }

    return results;
  }

  /**
   * Delete all files for an applicant with access control
   */
  async deleteApplicantFiles(applicantId: string, userId?: string): Promise<boolean> {
    try {
      // Access control check
      if (userId) {
        const hasAccess = await this.databaseService.canUserModifyApplicant(applicantId, userId);
        if (!hasAccess) {
          throw new Error('Insufficient permissions to delete files for this applicant');
        }
      }

      const files = await this.databaseService.getApplicantFiles(applicantId);
      let allDeleted = true;

      for (const file of files) {
        const deleted = await this.deleteFile(file.id);
        if (!deleted) {
          allDeleted = false;
          console.warn(`Failed to delete file ${file.id} for applicant ${applicantId}`);
        }
      }

      return allDeleted;
    } catch (error) {
      console.error('Delete applicant files error:', error);
      return false;
    }
  }

  /**
   * Validate file before upload
   */
  async validateFile(file: File | Buffer, fileType: 'cv' | 'linkedin' | 'github' | 'other'): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get file size and name
      let fileSize: number;
      let fileName: string = '';

      if (file instanceof File) {
        fileSize = file.size;
        fileName = file.name;
      } else if (Buffer.isBuffer(file)) {
        fileSize = file.length;
      } else {
        errors.push('Invalid file type provided');
        return { isValid: false, errors, warnings };
      }

      // Size limits validation
      if (fileSize > this.STORAGE_LIMITS.file[fileType]) {
        errors.push(`File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds limit of ${(this.STORAGE_LIMITS.file[fileType] / 1024 / 1024)}MB for ${fileType} files`);
      }

      if (fileSize === 0) {
        errors.push('File is empty');
      }

      // File type validation based on extension
      if (fileName) {
        const allowedExtensions = this.getAllowedExtensions(fileType);
        const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
          errors.push(`File extension ${fileExtension} not allowed for ${fileType} files. Allowed: ${allowedExtensions.join(', ')}`);
        }
      }

      // MIME type validation for File objects
      if (file instanceof File && file.type) {
        const allowedMimeTypes = this.getAllowedMimeTypes(fileType);

        if (!allowedMimeTypes.includes(file.type)) {
          errors.push(`MIME type ${file.type} not allowed for ${fileType} files`);
        }
      }

      // Security validation
      const securityValidation = await this.validateFileSecurity(file, fileName);
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);

      // Size warnings
      const warningSizes = {
        cv: 5 * 1024 * 1024, // 5MB
        linkedin: 5 * 1024 * 1024, // 5MB
        github: 2 * 1024 * 1024, // 2MB
        other: 10 * 1024 * 1024 // 10MB
      };

      if (fileSize > warningSizes[fileType]) {
        warnings.push(`File size ${(fileSize / 1024 / 1024).toFixed(2)}MB is large and may take longer to upload`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('File validation error:', error);
      return {
        isValid: false,
        errors: ['File validation failed due to unexpected error'],
        warnings
      };
    }
  }

  /**
   * Validate file access permissions
   */
  async validateFileAccess(fileId: string, userId: string, requiredRole?: WorkspaceRole): Promise<boolean> {
    try {
      const fileRecord = await this.databaseService.getFileRecord(fileId);
      if (!fileRecord) {
        return false;
      }

      return await this.databaseService.validateApplicantAccess(fileRecord.applicantId, userId, requiredRole);
    } catch (error) {
      console.error('File access validation error:', error);
      return false;
    }
  }

  /**
   * Validate storage quota
   */
  async validateStorageQuota(workspaceId: string, fileSize: number): Promise<QuotaValidationResult> {
    try {
      const usage = await this.getWorkspaceStorageUsage(workspaceId);
      const newTotal = usage.quota.used + fileSize;
      const limit = this.STORAGE_LIMITS.workspace;

      const errors: string[] = [];

      if (newTotal > limit) {
        const overageGB = ((newTotal - limit) / (1024 * 1024 * 1024)).toFixed(2);
        errors.push(`Upload would exceed workspace storage limit by ${overageGB}GB`);
      }

      return {
        isValid: errors.length === 0,
        currentUsage: usage.quota.used,
        limit,
        availableSpace: Math.max(0, limit - usage.quota.used),
        errors
      };
    } catch (error) {
      console.error('Storage quota validation error:', error);
      return {
        isValid: false,
        currentUsage: 0,
        limit: this.STORAGE_LIMITS.workspace,
        availableSpace: 0,
        errors: ['Failed to validate storage quota']
      };
    }
  }

  /**
   * Get workspace storage usage statistics
   */
  async getWorkspaceStorageUsage(workspaceId: string): Promise<StorageUsageResult> {
    try {
      // Get all applicants in workspace
      const applicants = await this.databaseService.listApplicants({ workspaceId });

      let totalFiles = 0;
      let totalSize = 0;
      const usageByType: Record<string, { count: number; size: number }> = {
        cv: { count: 0, size: 0 },
        linkedin: { count: 0, size: 0 },
        github: { count: 0, size: 0 },
        other: { count: 0, size: 0 }
      };

      // Aggregate file statistics
      for (const applicant of applicants) {
        const files = await this.databaseService.getApplicantFiles(applicant.id);

        for (const file of files) {
          totalFiles++;
          const fileSize = file.fileSize || 0;
          totalSize += fileSize;

          if (usageByType[file.fileType]) {
            usageByType[file.fileType].count++;
            usageByType[file.fileType].size += fileSize;
          }
        }
      }

      const limit = this.STORAGE_LIMITS.workspace;
      const available = Math.max(0, limit - totalSize);
      const percentUsed = (totalSize / limit) * 100;

      return {
        totalFiles,
        totalSize,
        usageByType,
        quota: {
          limit,
          used: totalSize,
          available,
          percentUsed
        }
      };
    } catch (error) {
      console.error('Get workspace storage usage error:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles(workspaceId: string): Promise<CleanupResult> {
    const errors: string[] = [];
    let orphanedFiles = 0;
    let deletedFiles = 0;
    let freedSpace = 0;

    try {
      // Get all applicants in workspace
      const applicants = await this.databaseService.listApplicants({ workspaceId });
      const applicantIds = new Set(applicants.map(a => a.id));

      // Get all file records for the workspace
      const allFiles: FileRecord[] = [];
      for (const applicant of applicants) {
        const files = await this.databaseService.getApplicantFiles(applicant.id);
        allFiles.push(...files);
      }

      // Find orphaned files (files without corresponding applicants)
      for (const file of allFiles) {
        if (!applicantIds.has(file.applicantId)) {
          orphanedFiles++;

          try {
            const deleted = await this.deleteFile(file.id);
            if (deleted) {
              deletedFiles++;
              freedSpace += file.fileSize || 0;
            }
          } catch (error) {
            errors.push(`Failed to delete orphaned file ${file.id}: ${error}`);
          }
        }
      }

      return {
        orphanedFiles,
        deletedFiles,
        freedSpace,
        errors
      };
    } catch (error) {
      console.error('Cleanup orphaned files error:', error);
      errors.push(`Cleanup failed: ${error}`);
      return {
        orphanedFiles,
        deletedFiles,
        freedSpace,
        errors
      };
    }
  }

  /**
   * Security validation for files
   */
  private async validateFileSecurity(file: File | Buffer, fileName: string): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar', '.js', '.vbs', '.ps1'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    if (suspiciousExtensions.includes(fileExtension)) {
      errors.push(`File extension ${fileExtension} is not allowed for security reasons`);
    }

    // Check for double extensions
    const extensionCount = (fileName.match(/\./g) || []).length;
    if (extensionCount > 1) {
      const parts = fileName.toLowerCase().split('.');
      if (parts.length > 2) {
        warnings.push('File has multiple extensions, please verify it is safe');
      }
    }

    // Basic content validation for buffers
    if (Buffer.isBuffer(file)) {
      // Check for executable signatures
      const executableSignatures = [
        Buffer.from([0x4D, 0x5A]), // PE executable
        Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
        Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Java class file
      ];

      for (const signature of executableSignatures) {
        if (file.subarray(0, signature.length).equals(signature)) {
          errors.push('File appears to be an executable and is not allowed');
          break;
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Get allowed file extensions for file type
   */
  private getAllowedExtensions(fileType: 'cv' | 'linkedin' | 'github' | 'other'): string[] {
    const extensions = {
      cv: ['.pdf', '.doc', '.docx'],
      linkedin: ['.pdf'],
      github: ['.pdf', '.txt', '.md'],
      other: ['.pdf', '.doc', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg']
    };
    return extensions[fileType];
  }

  /**
   * Get allowed MIME types for file type
   */
  private getAllowedMimeTypes(fileType: 'cv' | 'linkedin' | 'github' | 'other'): string[] {
    const mimeTypes = {
      cv: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      linkedin: ['application/pdf'],
      github: ['application/pdf', 'text/plain', 'text/markdown'],
      other: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg']
    };
    return mimeTypes[fileType];
  }

  /**
   * Infer MIME type from filename
   */
  private inferMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt':
        return 'text/plain';
      case 'md':
        return 'text/markdown';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Get bucket name for file type
   */
  private getBucketForFileType(fileType: 'cv' | 'linkedin' | 'github' | 'other'): string {
    const buckets = {
      cv: 'cv-files',
      linkedin: 'linkedin-files',
      github: 'github-files',
      other: 'other-files'
    };
    return buckets[fileType];
  }
}

// Export types
export type {
  FileUploadOptions,
  FileUploadResult,
  FileAccessResult,
  FileAccessOptions,
  ValidationResult,
  QuotaValidationResult,
  StorageUsageResult,
  CleanupResult
};
