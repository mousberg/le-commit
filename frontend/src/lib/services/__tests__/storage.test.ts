// Simple Storage Service Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStorageService } from '../storage';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
        remove: vi.fn()
      }))
    }
  }))
}));

// Mock the database service import
vi.mock('../database', () => ({
  SupabaseDatabaseService: vi.fn(() => mockDbService)
}));

// Mock database service
const mockDbService = {
  createFileRecord: vi.fn(),
  getApplicantFiles: vi.fn(),
  deleteFileRecord: vi.fn()
};

describe('SupabaseStorageService', () => {
  let storageService: SupabaseStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    storageService = new SupabaseStorageService(mockDbService as any);
  });

  describe('File Validation', () => {
    it('should accept valid PDF files', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = storageService.validateFile(file, 'cv');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      // Create a file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const result = storageService.validateFile(largeFile, 'cv');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File too large (max 10MB)');
    });

    it('should reject invalid file types for CV', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = storageService.validateFile(file, 'cv');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CV must be PDF, DOC, or DOCX');
    });
  });

  describe('File Upload', () => {
    it('should handle successful file upload', async () => {
      // Mock successful upload
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'test/path/file.pdf' },
        error: null
      });

      const mockStorage = {
        from: vi.fn(() => ({ upload: mockUpload }))
      };

      // Override the supabase client
      (storageService as any).supabase = { storage: mockStorage };

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      const result = await storageService.uploadApplicantFile(
        'workspace-1',
        'applicant-1',
        file,
        'cv',
        'test.pdf'
      );

      expect(result.path).toBe('test/path/file.pdf');
      expect(mockDbService.createFileRecord).toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      // Mock failed upload
      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' }
      });

      const mockStorage = {
        from: vi.fn(() => ({ upload: mockUpload }))
      };

      (storageService as any).supabase = { storage: mockStorage };

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await expect(storageService.uploadApplicantFile(
        'workspace-1',
        'applicant-1',
        file,
        'cv',
        'test.pdf'
      )).rejects.toThrow('Upload failed: Upload failed');
    });
  });

  describe('File Operations', () => {
    it('should get signed URLs', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed-url.com' },
        error: null
      });

      const mockStorage = {
        from: vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl }))
      };

      (storageService as any).supabase = { storage: mockStorage };

      const url = await storageService.getSignedUrl('bucket', 'path/file.pdf');

      expect(url).toBe('https://signed-url.com');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('path/file.pdf', 3600);
    });

    it('should delete files', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null });

      const mockStorage = {
        from: vi.fn(() => ({ remove: mockRemove }))
      };

      (storageService as any).supabase = { storage: mockStorage };

      const result = await storageService.deleteFile('bucket', 'path/file.pdf');

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(['path/file.pdf']);
    });

    it('should delete all applicant files', async () => {
      // Mock file records
      mockDbService.getApplicantFiles.mockResolvedValue([
        { id: '1', storageBucket: 'cv-files', storagePath: 'path1.pdf' },
        { id: '2', storageBucket: 'linkedin-files', storagePath: 'path2.pdf' }
      ]);

      const mockRemove = vi.fn().mockResolvedValue({ error: null });
      const mockStorage = {
        from: vi.fn(() => ({ remove: mockRemove }))
      };

      (storageService as any).supabase = { storage: mockStorage };

      const result = await storageService.deleteAllApplicantFiles('applicant-1');

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledTimes(2);
      expect(mockDbService.deleteFileRecord).toHaveBeenCalledTimes(2);
    });
  });
});
