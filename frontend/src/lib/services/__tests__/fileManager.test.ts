// Simple File Manager Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileManager } from '../fileManager';

// Mock storage and database services
const mockStorageService = {
  uploadApplicantFile: vi.fn(),
  getSignedUrl: vi.fn(),
  deleteFile: vi.fn(),
  validateFile: vi.fn()
};

const mockDbService = {
  canUserModifyApplicant: vi.fn(),
  getApplicantFiles: vi.fn(),
  createFileRecord: vi.fn()
};

describe('FileManager', () => {
  let fileManager: FileManager;

  beforeEach(() => {
    vi.clearAllMocks();
    fileManager = new FileManager(mockStorageService as any, mockDbService as any);
  });

  describe('File Upload', () => {
    it('should upload file successfully', async () => {
      // Mock successful upload
      mockDbService.canUserModifyApplicant.mockResolvedValue(true);
      mockStorageService.validateFile.mockReturnValue({ isValid: true, errors: [], warnings: [] });
      mockStorageService.uploadApplicantFile.mockResolvedValue({
        path: 'test/path/file.pdf',
        fileRecord: { id: 'file-1' }
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      const result = await fileManager.uploadFile({
        workspaceId: 'workspace-1',
        applicantId: 'applicant-1',
        fileType: 'cv',
        originalFilename: 'test.pdf',
        file,
        userId: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe('test/path/file.pdf');
      expect(mockStorageService.uploadApplicantFile).toHaveBeenCalled();
    });

    it('should reject upload with insufficient permissions', async () => {
      mockDbService.canUserModifyApplicant.mockResolvedValue(false);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await expect(fileManager.uploadFile({
        workspaceId: 'workspace-1',
        applicantId: 'applicant-1',
        fileType: 'cv',
        originalFilename: 'test.pdf',
        file,
        userId: 'user-1'
      })).rejects.toThrow('Insufficient permissions');
    });

    it('should reject invalid file types', async () => {
      mockDbService.canUserModifyApplicant.mockResolvedValue(true);
      mockStorageService.validateFile.mockReturnValue({
        isValid: false,
        errors: ['Invalid file type'],
        warnings: []
      });

      const file = new File(['test'], 'test.exe', { type: 'application/octet-stream' });

      await expect(fileManager.uploadFile({
        workspaceId: 'workspace-1',
        applicantId: 'applicant-1',
        fileType: 'cv',
        originalFilename: 'test.exe',
        file,
        userId: 'user-1'
      })).rejects.toThrow('File validation failed');
    });

    it('should reject files exceeding size limits', async () => {
      mockDbService.canUserModifyApplicant.mockResolvedValue(true);
      mockStorageService.validateFile.mockReturnValue({
        isValid: false,
        errors: ['File too large'],
        warnings: []
      });

      // Large file
      const file = new File(['x'.repeat(15 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });

      await expect(fileManager.uploadFile({
        workspaceId: 'workspace-1',
        applicantId: 'applicant-1',
        fileType: 'cv',
        originalFilename: 'large.pdf',
        file,
        userId: 'user-1'
      })).rejects.toThrow('File validation failed');
    });
  });

  describe('File Access', () => {
    it('should get file successfully', async () => {
      mockDbService.canUserModifyApplicant.mockResolvedValue(true);
      mockDbService.getApplicantFiles.mockResolvedValue([
        { id: 'file-1', fileType: 'cv', originalFilename: 'test.pdf', storageBucket: 'cv-files', storagePath: 'path/test.pdf' }
      ]);
      mockStorageService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      const result = await fileManager.getFile({
        applicantId: 'applicant-1',
        fileType: 'cv',
        originalFilename: 'test.pdf',
        userId: 'user-1'
      });

      expect(result.url).toBe('https://signed-url.com');
      expect(mockStorageService.getSignedUrl).toHaveBeenCalled();
    });

    it('should reject access with insufficient permissions', async () => {
      mockDbService.canUserModifyApplicant.mockResolvedValue(false);

      await expect(fileManager.getFile({
        applicantId: 'applicant-1',
        fileType: 'cv',
        originalFilename: 'test.pdf',
        userId: 'user-1'
      })).rejects.toThrow('Insufficient permissions');
    });

    it('should handle non-existent files', async () => {
      mockDbService.canUserModifyApplicant.mockResolvedValue(true);
      mockDbService.getApplicantFiles.mockResolvedValue([]);

      await expect(fileManager.getFile({
        applicantId: 'applicant-1',
        fileType: 'cv',
        originalFilename: 'nonexistent.pdf',
        userId: 'user-1'
      })).rejects.toThrow('File not found');
    });
  });

  describe('File Operations', () => {
    it('should list all files for applicant', async () => {
      mockDbService.canUserModifyApplicant.mockResolvedValue(true);
      mockDbService.getApplicantFiles.mockResolvedValue([
        { id: 'file-1', fileType: 'cv', originalFilename: 'cv.pdf' },
        { id: 'file-2', fileType: 'linkedin', originalFilename: 'linkedin.pdf' }
      ]);

      const result = await fileManager.getAllFiles({
        applicantId: 'applicant-1',
        userId: 'user-1'
      });

      expect(result.files).toHaveLength(2);
      expect(result.files[0].fileType).toBe('cv');
      expect(result.files[1].fileType).toBe('linkedin');
    });

    it('should validate file types and sizes', () => {
      const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB

      const result = fileManager.validateFileBasic(validFile, 'cv');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
