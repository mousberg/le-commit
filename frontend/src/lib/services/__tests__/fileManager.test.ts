import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FileManager } from '../fileManager';
import { DatabaseService, FileRecord, Applicant } from '../../interfaces/database';
import { storageService } from '../storage';

// Mock storage service
vi.mock('../storage', () => ({
  storageService: {
    uploadApplicantFile: vi.fn(),
    getSignedUrl: vi.fn(),
    deleteFile: vi.fn()
  }
}));

describe('FileManager', () => {
  let fileManager: FileManager;
  let mockDatabaseService: Partial<DatabaseService>;

  beforeEach(() => {
    // Create mock database service
    mockDatabaseService = {
      canUserModifyApplicant: vi.fn(),
      canUserViewApplicant: vi.fn(),
      validateApplicantAccess: vi.fn(),
      createFileRecord: vi.fn(),
      getFileRecord: vi.fn(),
      getApplicantFiles: vi.fn(),
      deleteFileRecord: vi.fn(),
      listApplicants: vi.fn()
    };

    fileManager = new FileManager(mockDatabaseService as DatabaseService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    const uploadOptions = {
      workspaceId: 'workspace-123',
      applicantId: 'applicant-456',
      fileType: 'cv' as const,
      originalFilename: 'resume.pdf',
      file: mockFile,
      userId: 'user-789'
    };

    it('should upload file successfully with proper access control', async () => {
      // Mock access control
      (mockDatabaseService.canUserModifyApplicant as any).mockResolvedValue(true);

      // Mock storage upload
      (storageService.uploadApplicantFile as any).mockResolvedValue({
        path: 'workspace-123/applicant-456/123_resume.pdf',
        fullPath: 'cv-files/workspace-123/applicant-456/123_resume.pdf',
        id: 'storage-id'
      });

      // Mock database record creation
      const mockFileRecord: FileRecord = {
        id: 'file-123',
        applicantId: 'applicant-456',
        fileType: 'cv',
        originalFilename: 'resume.pdf',
        storagePath: 'workspace-123/applicant-456/123_resume.pdf',
        storageBucket: 'cv-files',
        fileSize: mockFile.size,
        mimeType: 'application/pdf',
        uploadedAt: new Date().toISOString()
      };
      (mockDatabaseService.createFileRecord as any).mockResolvedValue(mockFileRecord);

      // Mock signed URL generation
      (storageService.getSignedUrl as any).mockResolvedValue('https://signed-url.com/file.pdf');

      // Mock workspace storage usage (for quota check)
      vi.spyOn(fileManager, 'getWorkspaceStorageUsage').mockResolvedValue({
        totalFiles: 5,
        totalSize: 50 * 1024 * 1024, // 50MB
        usageByType: { cv: { count: 2, size: 20 * 1024 * 1024 }, linkedin: { count: 1, size: 10 * 1024 * 1024 }, github: { count: 1, size: 5 * 1024 * 1024 }, other: { count: 1, size: 15 * 1024 * 1024 } },
        quota: {
          limit: 1024 * 1024 * 1024, // 1GB
          used: 50 * 1024 * 1024,
          available: 974 * 1024 * 1024,
          percentUsed: 4.88
        }
      });

      const result = await fileManager.uploadFile(uploadOptions);

      expect(mockDatabaseService.canUserModifyApplicant).toHaveBeenCalledWith('applicant-456', 'user-789');
      expect(storageService.uploadApplicantFile).toHaveBeenCalledWith(
        'workspace-123',
        'applicant-456',
        mockFile,
        'cv',
        'resume.pdf'
      );
      expect(mockDatabaseService.createFileRecord).toHaveBeenCalled();
      expect(result.fileRecord).toEqual(mockFileRecord);
      expect(result.signedUrl).toBe('https://signed-url.com/file.pdf');
    });

    it('should reject upload with insufficient permissions', async () => {
      (mockDatabaseService.canUserModifyApplicant as any).mockResolvedValue(false);

      await expect(fileManager.uploadFile(uploadOptions)).rejects.toThrow(
        'Insufficient permissions to upload files for this applicant'
      );

      expect(storageService.uploadApplicantFile).not.toHaveBeenCalled();
    });

    it('should reject invalid file types', async () => {
      const invalidFile = new File(['test'], 'malware.exe', { type: 'application/octet-stream' });
      const invalidOptions = { ...uploadOptions, file: invalidFile, originalFilename: 'malware.exe' };

      (mockDatabaseService.canUserModifyApplicant as any).mockResolvedValue(true);

      await expect(fileManager.uploadFile(invalidOptions)).rejects.toThrow(
        'File validation failed'
      );
    });

    it('should reject files exceeding size limits', async () => {
      // Create a mock file that's too large (15MB for CV which has 10MB limit)
      const largeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const largeOptions = { ...uploadOptions, file: largeFile };

      (mockDatabaseService.canUserModifyApplicant as any).mockResolvedValue(true);

      await expect(fileManager.uploadFile(largeOptions)).rejects.toThrow(
        'File validation failed'
      );
    });

    it('should reject upload when storage quota exceeded', async () => {
      (mockDatabaseService.canUserModifyApplicant as any).mockResolvedValue(true);

      // Mock validateStorageQuota to return invalid result
      vi.spyOn(fileManager, 'validateStorageQuota').mockResolvedValue({
        isValid: false,
        currentUsage: 1024 * 1024 * 1024 - 1000,
        limit: 1024 * 1024 * 1024,
        availableSpace: 1000,
        errors: ['Upload would exceed workspace storage limit by 0.01GB']
      });

      await expect(fileManager.uploadFile(uploadOptions)).rejects.toThrow(
        'Storage quota exceeded'
      );
    });
  });

  describe('getFile', () => {
    const mockFileRecord: FileRecord = {
      id: 'file-123',
      applicantId: 'applicant-456',
      fileType: 'cv',
      originalFilename: 'resume.pdf',
      storagePath: 'workspace-123/applicant-456/123_resume.pdf',
      storageBucket: 'cv-files',
      fileSize: 1024,
      mimeType: 'application/pdf',
      uploadedAt: new Date().toISOString()
    };

    it('should get file with proper access control', async () => {
      (mockDatabaseService.getFileRecord as any).mockResolvedValue(mockFileRecord);
      (mockDatabaseService.validateApplicantAccess as any).mockResolvedValue(true);
      (storageService.getSignedUrl as any).mockResolvedValue('https://signed-url.com/file.pdf');

      const result = await fileManager.getFile('file-123', { userId: 'user-789' });

      expect(mockDatabaseService.getFileRecord).toHaveBeenCalledWith('file-123');
      expect(mockDatabaseService.validateApplicantAccess).toHaveBeenCalledWith('applicant-456', 'user-789', undefined);
      expect(result.fileRecord).toEqual(mockFileRecord);
      expect(result.signedUrl).toBe('https://signed-url.com/file.pdf');
    });

    it('should reject access with insufficient permissions', async () => {
      (mockDatabaseService.getFileRecord as any).mockResolvedValue(mockFileRecord);
      (mockDatabaseService.validateApplicantAccess as any).mockResolvedValue(false);

      await expect(fileManager.getFile('file-123', { userId: 'user-789' })).rejects.toThrow(
        'Insufficient permissions to access this file'
      );
    });

    it('should handle non-existent files', async () => {
      (mockDatabaseService.getFileRecord as any).mockResolvedValue(null);

      await expect(fileManager.getFile('non-existent')).rejects.toThrow('File not found');
    });
  });

  describe('deleteFile', () => {
    const mockFileRecord: FileRecord = {
      id: 'file-123',
      applicantId: 'applicant-456',
      fileType: 'cv',
      originalFilename: 'resume.pdf',
      storagePath: 'workspace-123/applicant-456/123_resume.pdf',
      storageBucket: 'cv-files',
      fileSize: 1024,
      mimeType: 'application/pdf',
      uploadedAt: new Date().toISOString()
    };

    it('should delete file with proper access control', async () => {
      (mockDatabaseService.getFileRecord as any).mockResolvedValue(mockFileRecord);
      (mockDatabaseService.canUserModifyApplicant as any).mockResolvedValue(true);
      (storageService.deleteFile as any).mockResolvedValue(true);
      (mockDatabaseService.deleteFileRecord as any).mockResolvedValue(true);

      const result = await fileManager.deleteFile('file-123', 'user-789');

      expect(mockDatabaseService.canUserModifyApplicant).toHaveBeenCalledWith('applicant-456', 'user-789');
      expect(storageService.deleteFile).toHaveBeenCalledWith('cv-files', 'workspace-123/applicant-456/123_resume.pdf');
      expect(mockDatabaseService.deleteFileRecord).toHaveBeenCalledWith('file-123');
      expect(result).toBe(true);
    });

    it('should reject deletion with insufficient permissions', async () => {
      (mockDatabaseService.getFileRecord as any).mockResolvedValue(mockFileRecord);
      (mockDatabaseService.canUserModifyApplicant as any).mockResolvedValue(false);

      const result = await fileManager.deleteFile('file-123', 'user-789');
      expect(result).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should validate PDF files correctly', async () => {
      const validFile = new File(['test'], 'resume.pdf', { type: 'application/pdf' });

      const result = await fileManager.validateFile(validFile, 'cv');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files with invalid extensions', async () => {
      const invalidFile = new File(['test'], 'malware.exe', { type: 'application/octet-stream' });

      const result = await fileManager.validateFile(invalidFile, 'cv');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('not allowed for security reasons'))).toBe(true);
    });

    it('should reject oversized files', async () => {
      // Create a real File object that's too large
      const largeContent = new Array(15 * 1024 * 1024).fill('x').join('');
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });

      const result = await fileManager.validateFile(largeFile, 'cv');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds limit'))).toBe(true);
    });

    it('should reject empty files', async () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });

      const result = await fileManager.validateFile(emptyFile, 'cv');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should warn about large but acceptable files', async () => {
      // Create a real File object that's large but within limits
      const largeContent = new Array(7 * 1024 * 1024).fill('x').join('');
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });

      const result = await fileManager.validateFile(largeFile, 'cv');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('is large and may take longer'))).toBe(true);
    });
  });

  describe('getWorkspaceStorageUsage', () => {
    it('should calculate storage usage correctly', async () => {
      const mockApplicants: Applicant[] = [
        {
          id: 'applicant-1',
          workspaceId: 'workspace-123',
          name: 'John Doe',
          email: 'john@example.com',
          status: 'completed',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      ];

      const mockFiles: FileRecord[] = [
        {
          id: 'file-1',
          applicantId: 'applicant-1',
          fileType: 'cv',
          originalFilename: 'resume.pdf',
          storagePath: 'path1',
          storageBucket: 'cv-files',
          fileSize: 1024 * 1024, // 1MB
          uploadedAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 'file-2',
          applicantId: 'applicant-1',
          fileType: 'linkedin',
          originalFilename: 'linkedin.pdf',
          storagePath: 'path2',
          storageBucket: 'linkedin-files',
          fileSize: 2 * 1024 * 1024, // 2MB
          uploadedAt: '2023-01-01T00:00:00Z'
        }
      ];

      (mockDatabaseService.listApplicants as any).mockResolvedValue(mockApplicants);
      (mockDatabaseService.getApplicantFiles as any).mockResolvedValue(mockFiles);

      const result = await fileManager.getWorkspaceStorageUsage('workspace-123');

      expect(result.totalFiles).toBe(2);
      expect(result.totalSize).toBe(3 * 1024 * 1024); // 3MB
      expect(result.usageByType.cv.count).toBe(1);
      expect(result.usageByType.cv.size).toBe(1024 * 1024);
      expect(result.usageByType.linkedin.count).toBe(1);
      expect(result.usageByType.linkedin.size).toBe(2 * 1024 * 1024);
      expect(result.quota.used).toBe(3 * 1024 * 1024);
      expect(result.quota.available).toBe(1024 * 1024 * 1024 - 3 * 1024 * 1024);
    });
  });

  describe('validateStorageQuota', () => {
    it('should allow upload within quota', async () => {
      vi.spyOn(fileManager, 'getWorkspaceStorageUsage').mockResolvedValue({
        totalFiles: 5,
        totalSize: 100 * 1024 * 1024, // 100MB used
        usageByType: { cv: { count: 2, size: 50 * 1024 * 1024 }, linkedin: { count: 1, size: 25 * 1024 * 1024 }, github: { count: 1, size: 15 * 1024 * 1024 }, other: { count: 1, size: 10 * 1024 * 1024 } },
        quota: {
          limit: 1024 * 1024 * 1024, // 1GB limit
          used: 100 * 1024 * 1024,
          available: 924 * 1024 * 1024,
          percentUsed: 9.77
        }
      });

      const result = await fileManager.validateStorageQuota('workspace-123', 10 * 1024 * 1024); // 10MB file

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject upload exceeding quota', async () => {
      vi.spyOn(fileManager, 'getWorkspaceStorageUsage').mockResolvedValue({
        totalFiles: 100,
        totalSize: 1020 * 1024 * 1024, // 1020MB used (close to 1GB limit)
        usageByType: { cv: { count: 25, size: 255 * 1024 * 1024 }, linkedin: { count: 25, size: 255 * 1024 * 1024 }, github: { count: 25, size: 255 * 1024 * 1024 }, other: { count: 25, size: 255 * 1024 * 1024 } },
        quota: {
          limit: 1024 * 1024 * 1024,
          used: 1020 * 1024 * 1024,
          available: 4 * 1024 * 1024,
          percentUsed: 99.6
        }
      });

      const result = await fileManager.validateStorageQuota('workspace-123', 10 * 1024 * 1024); // 10MB file

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceed workspace storage limit'))).toBe(true);
    });
  });
});
