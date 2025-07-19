import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SupabaseStorageService } from '../storage';
import { createClient } from '../../supabase/client';
import { DatabaseService, FileRecord } from '../../interfaces/database';

// Mock Supabase client
vi.mock('../../supabase/client', () => ({
  createClient: vi.fn()
}));

// Mock database service
vi.mock('../database', () => ({
  browserDatabaseService: {
    createFileRecord: vi.fn(),
    getApplicantFiles: vi.fn(),
    deleteFileRecord: vi.fn()
  }
}));

describe('SupabaseStorageService', () => {
  let storageService: SupabaseStorageService;
  let mockSupabaseClient: any;
  let mockStorage: any;
  let mockDatabaseService: any;

  beforeEach(() => {
    // Create mock storage methods
    mockStorage = {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      createSignedUrl: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
      move: vi.fn(),
      list: vi.fn()
    };

    // Create mock auth methods
    const mockAuth = {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null
      })
    };

    // Create mock Supabase client
    mockSupabaseClient = {
      storage: mockStorage,
      auth: mockAuth
    };

    // Create mock database service
    mockDatabaseService = {
      createFileRecord: vi.fn(),
      getApplicantFiles: vi.fn(),
      deleteFileRecord: vi.fn(),
      getWorkspaceMember: vi.fn(),
      getWorkspaceFiles: vi.fn(),
      getUserFiles: vi.fn()
    };

    // Mock the createClient function
    (createClient as any).mockReturnValue(mockSupabaseClient);

    // Create service instance with mock database service
    storageService = new SupabaseStorageService(mockDatabaseService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = Buffer.from('test file content');
      const mockResponse = {
        data: {
          path: 'test/path/file.pdf',
          fullPath: 'bucket/test/path/file.pdf',
          id: 'file-id-123'
        },
        error: null
      };

      mockStorage.upload.mockResolvedValue(mockResponse);

      const result = await storageService.uploadFile(
        'test-bucket',
        'test/path/file.pdf',
        mockFile,
        { contentType: 'application/pdf' }
      );

      expect(mockStorage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockStorage.upload).toHaveBeenCalledWith(
        'test/path/file.pdf',
        mockFile,
        {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        }
      );
      expect(result).toEqual({
        path: 'test/path/file.pdf',
        fullPath: 'bucket/test/path/file.pdf',
        id: 'file-id-123'
      });
    });

    it('should handle upload errors', async () => {
      const mockFile = Buffer.from('test file content');
      const mockResponse = {
        data: null,
        error: { message: 'Upload failed' }
      };

      mockStorage.upload.mockResolvedValue(mockResponse);

      await expect(
        storageService.uploadFile('test-bucket', 'test/path/file.pdf', mockFile)
      ).rejects.toThrow('Failed to upload file: Upload failed');
    });
  });

  describe('getSignedUrl', () => {
    it('should create signed URL successfully', async () => {
      const mockResponse = {
        data: { signedUrl: 'https://signed-url.com/file.pdf' },
        error: null
      };

      mockStorage.createSignedUrl.mockResolvedValue(mockResponse);

      const result = await storageService.getSignedUrl('test-bucket', 'test/path/file.pdf', 7200);

      expect(mockStorage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith('test/path/file.pdf', 7200);
      expect(result).toBe('https://signed-url.com/file.pdf');
    });

    it('should handle signed URL errors', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'Access denied' }
      };

      mockStorage.createSignedUrl.mockResolvedValue(mockResponse);

      await expect(
        storageService.getSignedUrl('test-bucket', 'test/path/file.pdf')
      ).rejects.toThrow('Failed to create signed URL: Access denied');
    });

    it('should handle missing signed URL in response', async () => {
      const mockResponse = {
        data: { signedUrl: null },
        error: null
      };

      mockStorage.createSignedUrl.mockResolvedValue(mockResponse);

      await expect(
        storageService.getSignedUrl('test-bucket', 'test/path/file.pdf')
      ).rejects.toThrow('No signed URL returned from Supabase');
    });
  });

  describe('getPublicUrl', () => {
    it('should return public URL', () => {
      const mockResponse = {
        data: { publicUrl: 'https://public-url.com/file.pdf' }
      };

      mockStorage.getPublicUrl.mockReturnValue(mockResponse);

      const result = storageService.getPublicUrl('test-bucket', 'test/path/file.pdf');

      expect(mockStorage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockStorage.getPublicUrl).toHaveBeenCalledWith('test/path/file.pdf');
      expect(result).toBe('https://public-url.com/file.pdf');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const mockResponse = { error: null };
      mockStorage.remove.mockResolvedValue(mockResponse);

      const result = await storageService.deleteFile('test-bucket', 'test/path/file.pdf');

      expect(mockStorage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockStorage.remove).toHaveBeenCalledWith(['test/path/file.pdf']);
      expect(result).toBe(true);
    });

    it('should handle delete errors gracefully', async () => {
      const mockResponse = { error: { message: 'File not found' } };
      mockStorage.remove.mockResolvedValue(mockResponse);

      const result = await storageService.deleteFile('test-bucket', 'test/path/file.pdf');

      expect(result).toBe(false);
    });
  });

  describe('moveFile', () => {
    it('should move file successfully within same bucket', async () => {
      const mockResponse = { error: null };
      mockStorage.move.mockResolvedValue(mockResponse);

      const result = await storageService.moveFile(
        'same-bucket',
        'source/path/file.pdf',
        'same-bucket',
        'dest/path/file.pdf'
      );

      expect(mockStorage.from).toHaveBeenCalledWith('same-bucket');
      expect(mockStorage.move).toHaveBeenCalledWith('source/path/file.pdf', 'dest/path/file.pdf');
      expect(result).toBe(true);
    });

    it('should return false for cross-bucket moves', async () => {
      const result = await storageService.moveFile(
        'source-bucket',
        'source/path/file.pdf',
        'dest-bucket',
        'dest/path/file.pdf'
      );

      expect(result).toBe(false);
    });

    it('should handle move errors gracefully', async () => {
      const mockResponse = { error: { message: 'Move failed' } };
      mockStorage.move.mockResolvedValue(mockResponse);

      const result = await storageService.moveFile(
        'same-bucket',
        'source/path/file.pdf',
        'same-bucket',
        'dest/path/file.pdf'
      );

      expect(result).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const mockResponse = {
        data: [
          { name: 'file1.pdf' },
          { name: 'file2.pdf' }
        ],
        error: null
      };

      mockStorage.list.mockResolvedValue(mockResponse);

      const result = await storageService.listFiles('test-bucket', 'test/path');

      expect(mockStorage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockStorage.list).toHaveBeenCalledWith('test/path');
      expect(result).toEqual(['file1.pdf', 'file2.pdf']);
    });

    it('should handle list errors gracefully', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'Access denied' }
      };

      mockStorage.list.mockResolvedValue(mockResponse);

      const result = await storageService.listFiles('test-bucket', 'test/path');

      expect(result).toEqual([]);
    });
  });

  describe('uploadApplicantFile', () => {
    it('should upload applicant file with proper path structure and create database record', async () => {
      const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
      const mockUploadResponse = {
        data: {
          path: 'workspace-123/applicant-456/1234567890_resume.pdf',
          fullPath: 'cv-files/workspace-123/applicant-456/1234567890_resume.pdf',
          id: 'file-id-123'
        },
        error: null
      };

      const mockFileRecord: FileRecord = {
        id: 'db-file-id-123',
        applicantId: 'applicant-456',
        fileType: 'cv',
        originalFilename: 'resume.pdf',
        storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
        storageBucket: 'cv-files',
        fileSize: 12,
        mimeType: 'application/pdf',
        uploadedAt: '2023-01-01T00:00:00Z'
      };

      // Mock successful auth and access control
      const mockUser = { id: 'user-123' };
      const mockWorkspaceMember = { id: 'member-123', workspaceId: 'workspace-123', userId: 'user-123', role: 'admin' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockDatabaseService.getWorkspaceMember.mockResolvedValue(mockWorkspaceMember);
      mockDatabaseService.getWorkspaceFiles.mockResolvedValue([]);
      mockDatabaseService.getUserFiles.mockResolvedValue([]);

      mockStorage.upload.mockResolvedValue(mockUploadResponse);
      mockDatabaseService.createFileRecord.mockResolvedValue(mockFileRecord);

      // Mock Date.now() to get predictable timestamp
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const result = await storageService.uploadApplicantFile(
        'workspace-123',
        'applicant-456',
        mockFile,
        'cv',
        'resume.pdf'
      );

      expect(mockStorage.from).toHaveBeenCalledWith('cv-files');
      expect(mockStorage.upload).toHaveBeenCalledWith(
        'workspace-123/applicant-456/1234567890_resume.pdf',
        mockFile,
        {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        }
      );
      expect(mockDatabaseService.createFileRecord).toHaveBeenCalledWith({
        applicantId: 'applicant-456',
        fileType: 'cv',
        originalFilename: 'resume.pdf',
        storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
        storageBucket: 'cv-files',
        fileSize: 12,
        mimeType: 'application/pdf'
      });
      expect(result.path).toBe('workspace-123/applicant-456/1234567890_resume.pdf');
      expect(result.fileRecord).toEqual(mockFileRecord);

      vi.restoreAllMocks();
    });

    it('should handle different file types with correct buckets', async () => {
      const mockFile = Buffer.from('linkedin content');
      const mockResponse = {
        data: {
          path: 'workspace-123/applicant-456/1234567890_linkedin.pdf',
          fullPath: 'linkedin-files/workspace-123/applicant-456/1234567890_linkedin.pdf',
          id: 'file-id-123'
        },
        error: null
      };

      // Mock successful auth and access control
      const mockUser = { id: 'user-123' };
      const mockWorkspaceMember = { id: 'member-123', workspaceId: 'workspace-123', userId: 'user-123', role: 'admin' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockDatabaseService.getWorkspaceMember.mockResolvedValue(mockWorkspaceMember);
      mockDatabaseService.getWorkspaceFiles.mockResolvedValue([]);
      mockDatabaseService.getUserFiles.mockResolvedValue([]);

      mockStorage.upload.mockResolvedValue(mockResponse);

      await storageService.uploadApplicantFile(
        'workspace-123',
        'applicant-456',
        mockFile,
        'linkedin',
        'linkedin.pdf'
      );

      expect(mockStorage.from).toHaveBeenCalledWith('linkedin-files');
    });

    it('should sanitize filenames', async () => {
      const mockFile = Buffer.from('test content');
      const mockResponse = {
        data: {
          path: 'workspace-123/applicant-456/1234567890_my_resume__with_spaces_.pdf',
          fullPath: 'cv-files/workspace-123/applicant-456/1234567890_my_resume__with_spaces_.pdf',
          id: 'file-id-123'
        },
        error: null
      };

      // Mock successful auth and access control
      const mockUser = { id: 'user-123' };
      const mockWorkspaceMember = { id: 'member-123', workspaceId: 'workspace-123', userId: 'user-123', role: 'admin' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockDatabaseService.getWorkspaceMember.mockResolvedValue(mockWorkspaceMember);
      mockDatabaseService.getWorkspaceFiles.mockResolvedValue([]);
      mockDatabaseService.getUserFiles.mockResolvedValue([]);

      mockStorage.upload.mockResolvedValue(mockResponse);

      // Mock Date.now() to get predictable timestamp
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      await storageService.uploadApplicantFile(
        'workspace-123',
        'applicant-456',
        mockFile,
        'cv',
        'my resume (with spaces).pdf'
      );

      expect(mockStorage.upload).toHaveBeenCalledWith(
        'workspace-123/applicant-456/1234567890_my_resume__with_spaces_.pdf',
        mockFile,
        expect.any(Object)
      );

      vi.restoreAllMocks();
    });
  });

  describe('getApplicantFileUrl', () => {
    it('should generate signed URL for applicant file using database record', async () => {
      const mockFileRecord: FileRecord = {
        id: 'db-file-id-123',
        applicantId: 'applicant-456',
        fileType: 'cv',
        originalFilename: 'resume.pdf',
        storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
        storageBucket: 'cv-files',
        fileSize: 12,
        mimeType: 'application/pdf',
        uploadedAt: '2023-01-01T00:00:00Z'
      };

      const mockSignedUrlResponse = {
        data: { signedUrl: 'https://signed-url.com/file.pdf' },
        error: null
      };

      // Mock successful auth and access control
      const mockUser = { id: 'user-123' };
      const mockWorkspaceMember = { id: 'member-123', workspaceId: 'workspace-123', userId: 'user-123', role: 'admin' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockDatabaseService.getWorkspaceMember.mockResolvedValue(mockWorkspaceMember);

      mockDatabaseService.getApplicantFiles.mockResolvedValue([mockFileRecord]);
      mockStorage.createSignedUrl.mockResolvedValue(mockSignedUrlResponse);

      const result = await storageService.getApplicantFileUrl(
        'workspace-123',
        'applicant-456',
        'cv',
        'resume.pdf',
        7200
      );

      expect(mockDatabaseService.getApplicantFiles).toHaveBeenCalledWith('applicant-456');
      expect(mockStorage.from).toHaveBeenCalledWith('cv-files');
      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(
        'workspace-123/applicant-456/1234567890_resume.pdf',
        7200
      );
      expect(result).toBe('https://signed-url.com/file.pdf');
    });

    it('should throw error when file record not found', async () => {
      // Mock successful auth and access control
      const mockUser = { id: 'user-123' };
      const mockWorkspaceMember = { id: 'member-123', workspaceId: 'workspace-123', userId: 'user-123', role: 'admin' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockDatabaseService.getWorkspaceMember.mockResolvedValue(mockWorkspaceMember);

      mockDatabaseService.getApplicantFiles.mockResolvedValue([]);

      await expect(
        storageService.getApplicantFileUrl(
          'workspace-123',
          'applicant-456',
          'cv',
          'resume.pdf',
          7200
        )
      ).rejects.toThrow('File not found: resume.pdf of type cv for applicant applicant-456');
    });
  });

  describe('deleteApplicantFile', () => {
    it('should delete applicant file and database record', async () => {
      const mockFileRecord: FileRecord = {
        id: 'db-file-id-123',
        applicantId: 'applicant-456',
        fileType: 'cv',
        originalFilename: 'resume.pdf',
        storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
        storageBucket: 'cv-files',
        fileSize: 12,
        mimeType: 'application/pdf',
        uploadedAt: '2023-01-01T00:00:00Z'
      };

      const mockStorageResponse = { error: null };

      mockDatabaseService.getApplicantFiles.mockResolvedValue([mockFileRecord]);
      mockStorage.remove.mockResolvedValue(mockStorageResponse);
      mockDatabaseService.deleteFileRecord.mockResolvedValue(true);

      const result = await storageService.deleteApplicantFile(
        'workspace-123',
        'applicant-456',
        'cv',
        'resume.pdf'
      );

      expect(mockDatabaseService.getApplicantFiles).toHaveBeenCalledWith('applicant-456');
      expect(mockStorage.from).toHaveBeenCalledWith('cv-files');
      expect(mockStorage.remove).toHaveBeenCalledWith(['workspace-123/applicant-456/1234567890_resume.pdf']);
      expect(mockDatabaseService.deleteFileRecord).toHaveBeenCalledWith('db-file-id-123');
      expect(result).toBe(true);
    });

    it('should return false when file record not found', async () => {
      mockDatabaseService.getApplicantFiles.mockResolvedValue([]);

      const result = await storageService.deleteApplicantFile(
        'workspace-123',
        'applicant-456',
        'cv',
        'resume.pdf'
      );

      expect(result).toBe(false);
    });
  });

  describe('deleteAllApplicantFiles', () => {
    it('should delete all files for an applicant', async () => {
      const mockFileRecords: FileRecord[] = [
        {
          id: 'db-file-id-1',
          applicantId: 'applicant-456',
          fileType: 'cv',
          originalFilename: 'resume.pdf',
          storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
          storageBucket: 'cv-files',
          fileSize: 12,
          mimeType: 'application/pdf',
          uploadedAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 'db-file-id-2',
          applicantId: 'applicant-456',
          fileType: 'linkedin',
          originalFilename: 'linkedin.pdf',
          storagePath: 'workspace-123/applicant-456/1234567891_linkedin.pdf',
          storageBucket: 'linkedin-files',
          fileSize: 24,
          mimeType: 'application/pdf',
          uploadedAt: '2023-01-01T00:00:00Z'
        }
      ];

      const mockStorageResponse = { error: null };

      mockDatabaseService.getApplicantFiles.mockResolvedValue(mockFileRecords);
      mockStorage.remove.mockResolvedValue(mockStorageResponse);
      mockDatabaseService.deleteFileRecord.mockResolvedValue(true);

      const result = await storageService.deleteAllApplicantFiles('applicant-456');

      expect(mockDatabaseService.getApplicantFiles).toHaveBeenCalledWith('applicant-456');
      expect(mockStorage.from).toHaveBeenCalledTimes(2);
      expect(mockStorage.remove).toHaveBeenCalledTimes(2);
      expect(mockDatabaseService.deleteFileRecord).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });

    it('should return true when no files to delete', async () => {
      mockDatabaseService.getApplicantFiles.mockResolvedValue([]);

      const result = await storageService.deleteAllApplicantFiles('applicant-456');

      expect(result).toBe(true);
    });
  });

  describe('getApplicantFileUrls', () => {
    it('should get URLs for all applicant files', async () => {
      const mockFileRecords: FileRecord[] = [
        {
          id: 'db-file-id-1',
          applicantId: 'applicant-456',
          fileType: 'cv',
          originalFilename: 'resume.pdf',
          storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
          storageBucket: 'cv-files',
          fileSize: 12,
          mimeType: 'application/pdf',
          uploadedAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 'db-file-id-2',
          applicantId: 'applicant-456',
          fileType: 'linkedin',
          originalFilename: 'linkedin.pdf',
          storagePath: 'workspace-123/applicant-456/1234567891_linkedin.pdf',
          storageBucket: 'linkedin-files',
          fileSize: 24,
          mimeType: 'application/pdf',
          uploadedAt: '2023-01-01T00:00:00Z'
        }
      ];

      const mockSignedUrlResponse = {
        data: { signedUrl: 'https://signed-url.com/file.pdf' },
        error: null
      };

      mockDatabaseService.getApplicantFiles.mockResolvedValue(mockFileRecords);
      mockStorage.createSignedUrl.mockResolvedValue(mockSignedUrlResponse);

      const result = await storageService.getApplicantFileUrls('applicant-456', 7200);

      expect(mockDatabaseService.getApplicantFiles).toHaveBeenCalledWith('applicant-456');
      expect(mockStorage.createSignedUrl).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        'cv_resume.pdf': 'https://signed-url.com/file.pdf',
        'linkedin_linkedin.pdf': 'https://signed-url.com/file.pdf'
      });
    });
  });

  describe('getApplicantFileMetadata', () => {
    it('should return file metadata for an applicant', async () => {
      const mockFileRecords: FileRecord[] = [
        {
          id: 'db-file-id-1',
          applicantId: 'applicant-456',
          fileType: 'cv',
          originalFilename: 'resume.pdf',
          storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
          storageBucket: 'cv-files',
          fileSize: 12,
          mimeType: 'application/pdf',
          uploadedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockDatabaseService.getApplicantFiles.mockResolvedValue(mockFileRecords);

      const result = await storageService.getApplicantFileMetadata('applicant-456');

      expect(mockDatabaseService.getApplicantFiles).toHaveBeenCalledWith('applicant-456');
      expect(result).toEqual(mockFileRecords);
    });
  });

  describe('hasApplicantFile', () => {
    it('should check if applicant has specific file', async () => {
      const mockFileRecords: FileRecord[] = [
        {
          id: 'db-file-id-1',
          applicantId: 'applicant-456',
          fileType: 'cv',
          originalFilename: 'resume.pdf',
          storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
          storageBucket: 'cv-files',
          fileSize: 12,
          mimeType: 'application/pdf',
          uploadedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockDatabaseService.getApplicantFiles.mockResolvedValue(mockFileRecords);

      const result = await storageService.hasApplicantFile('applicant-456', 'cv', 'resume.pdf');

      expect(mockDatabaseService.getApplicantFiles).toHaveBeenCalledWith('applicant-456');
      expect(result).toBe(true);
    });

    it('should check if applicant has any file of type', async () => {
      const mockFileRecords: FileRecord[] = [
        {
          id: 'db-file-id-1',
          applicantId: 'applicant-456',
          fileType: 'cv',
          originalFilename: 'resume.pdf',
          storagePath: 'workspace-123/applicant-456/1234567890_resume.pdf',
          storageBucket: 'cv-files',
          fileSize: 12,
          mimeType: 'application/pdf',
          uploadedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockDatabaseService.getApplicantFiles.mockResolvedValue(mockFileRecords);

      const result = await storageService.hasApplicantFile('applicant-456', 'cv');

      expect(result).toBe(true);
    });

    it('should return false when file not found', async () => {
      mockDatabaseService.getApplicantFiles.mockResolvedValue([]);

      const result = await storageService.hasApplicantFile('applicant-456', 'cv', 'resume.pdf');

      expect(result).toBe(false);
    });
  });

  describe('replaceApplicantFile', () => {
    it('should replace existing file', async () => {
      const mockFile = new File(['new content'], 'new-resume.pdf', { type: 'application/pdf' });
      const mockExistingFileRecord: FileRecord = {
        id: 'db-file-id-1',
        applicantId: 'applicant-456',
        fileType: 'cv',
        originalFilename: 'old-resume.pdf',
        storagePath: 'workspace-123/applicant-456/1234567890_old-resume.pdf',
        storageBucket: 'cv-files',
        fileSize: 12,
        mimeType: 'application/pdf',
        uploadedAt: '2023-01-01T00:00:00Z'
      };

      const mockUploadResponse = {
        data: {
          path: 'workspace-123/applicant-456/1234567891_new-resume.pdf',
          fullPath: 'cv-files/workspace-123/applicant-456/1234567891_new-resume.pdf',
          id: 'file-id-456'
        },
        error: null
      };

      const mockNewFileRecord: FileRecord = {
        id: 'db-file-id-2',
        applicantId: 'applicant-456',
        fileType: 'cv',
        originalFilename: 'new-resume.pdf',
        storagePath: 'workspace-123/applicant-456/1234567891_new-resume.pdf',
        storageBucket: 'cv-files',
        fileSize: 11,
        mimeType: 'application/pdf',
        uploadedAt: '2023-01-01T00:00:01Z'
      };

      // Mock for deletion
      mockDatabaseService.getApplicantFiles.mockResolvedValueOnce([mockExistingFileRecord]);
      mockStorage.remove.mockResolvedValue({ error: null });
      mockDatabaseService.deleteFileRecord.mockResolvedValue(true);

      // Mock for upload
      mockStorage.upload.mockResolvedValue(mockUploadResponse);
      mockDatabaseService.createFileRecord.mockResolvedValue(mockNewFileRecord);

      const result = await storageService.replaceApplicantFile(
        'workspace-123',
        'applicant-456',
        mockFile,
        'cv',
        'new-resume.pdf',
        'old-resume.pdf'
      );

      expect(mockDatabaseService.getApplicantFiles).toHaveBeenCalledWith('applicant-456');
      expect(mockStorage.remove).toHaveBeenCalled();
      expect(mockDatabaseService.deleteFileRecord).toHaveBeenCalled();
      expect(mockStorage.upload).toHaveBeenCalled();
      expect(mockDatabaseService.createFileRecord).toHaveBeenCalled();
      expect(result.fileRecord).toEqual(mockNewFileRecord);
    });
  });

  describe('File Validation and Access Control', () => {
    beforeEach(() => {
      // Mock auth for access control tests
      mockSupabaseClient.auth = {
        getUser: vi.fn()
      };

      // Add missing methods to mock database service
      mockDatabaseService.getWorkspaceMember = vi.fn();
      mockDatabaseService.getWorkspaceFiles = vi.fn();
      mockDatabaseService.getUserFiles = vi.fn();
    });

    describe('validateFileBeforeUpload', () => {
      it('should validate file size within limits', () => {
        const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
        Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

        const result = storageService.validateFileBeforeUpload(mockFile, 'cv', 'resume.pdf');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject file that exceeds size limit', () => {
        const mockFile = new File(['test content'], 'huge-resume.pdf', { type: 'application/pdf' });
        Object.defineProperty(mockFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB (exceeds 10MB limit for CV)

        const result = storageService.validateFileBeforeUpload(mockFile, 'cv', 'huge-resume.pdf');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('File size'));
        expect(result.errors).toContain(expect.stringContaining('exceeds maximum allowed size'));
      });

      it('should reject file with invalid extension', () => {
        const mockFile = new File(['test content'], 'resume.exe', { type: 'application/octet-stream' });
        Object.defineProperty(mockFile, 'size', { value: 1024 });

        const result = storageService.validateFileBeforeUpload(mockFile, 'cv', 'resume.exe');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('File extension'));
        expect(result.errors).toContain(expect.stringContaining('not allowed'));
      });

      it('should reject file with invalid MIME type', () => {
        const mockFile = new File(['test content'], 'resume.pdf', { type: 'image/jpeg' });
        Object.defineProperty(mockFile, 'size', { value: 1024 });

        const result = storageService.validateFileBeforeUpload(mockFile, 'cv', 'resume.pdf');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('File type'));
        expect(result.errors).toContain(expect.stringContaining('not allowed'));
      });

      it('should add warning for large files approaching limit', () => {
        const mockFile = new File(['test content'], 'large-resume.pdf', { type: 'application/pdf' });
        Object.defineProperty(mockFile, 'size', { value: 9 * 1024 * 1024 }); // 9MB (90% of 10MB limit)

        const result = storageService.validateFileBeforeUpload(mockFile, 'cv', 'large-resume.pdf');

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(expect.stringContaining('approaching the maximum limit'));
      });

      it('should validate different file types with appropriate limits', () => {
        // Test LinkedIn file type
        const linkedinFile = new File(['linkedin content'], 'profile.pdf', { type: 'application/pdf' });
        Object.defineProperty(linkedinFile, 'size', { value: 1024 * 1024 });

        const linkedinResult = storageService.validateFileBeforeUpload(linkedinFile, 'linkedin', 'profile.pdf');
        expect(linkedinResult.isValid).toBe(true);

        // Test GitHub file type with JSON
        const githubFile = new File(['{"data": "test"}'], 'data.json', { type: 'application/json' });
        Object.defineProperty(githubFile, 'size', { value: 1024 });

        const githubResult = storageService.validateFileBeforeUpload(githubFile, 'github', 'data.json');
        expect(githubResult.isValid).toBe(true);
      });

      it('should reject file exceeding absolute maximum size', () => {
        const mockFile = new File(['test content'], 'huge-file.pdf', { type: 'application/pdf' });
        Object.defineProperty(mockFile, 'size', { value: 60 * 1024 * 1024 }); // 60MB (exceeds 50MB absolute limit)

        const result = storageService.validateFileBeforeUpload(mockFile, 'other', 'huge-file.pdf');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('absolute maximum file size limit'));
      });
    });

    describe('validateUserAccess', () => {
      it('should validate user access for read operations', async () => {
        const mockUser = { id: 'user-123' };
        const mockWorkspaceMember = {
          id: 'member-123',
          workspaceId: 'workspace-123',
          userId: 'user-123',
          role: 'admin'
        };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });
        mockDatabaseService.getWorkspaceMember.mockResolvedValue(mockWorkspaceMember);

        await expect(
          storageService.validateUserAccess('workspace-123', 'user-123', 'read')
        ).resolves.not.toThrow();

        expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
        expect(mockDatabaseService.getWorkspaceMember).toHaveBeenCalledWith('workspace-123', 'user-123');
      });

      it('should reject access for unauthenticated users', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' }
        });

        await expect(
          storageService.validateUserAccess('workspace-123', 'user-123', 'read')
        ).rejects.toThrow('User not authenticated');
      });

      it('should reject access for users not in workspace', async () => {
        const mockUser = { id: 'user-123' };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });
        mockDatabaseService.getWorkspaceMember.mockResolvedValue(null);

        await expect(
          storageService.validateUserAccess('workspace-123', 'user-123', 'read')
        ).rejects.toThrow('User does not have access to workspace');
      });

      it('should reject write operations for read-only users', async () => {
        const mockUser = { id: 'user-123' };
        const mockWorkspaceMember = {
          id: 'member-123',
          workspaceId: 'workspace-123',
          userId: 'user-123',
          role: 'read_only'
        };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });
        mockDatabaseService.getWorkspaceMember.mockResolvedValue(mockWorkspaceMember);

        await expect(
          storageService.validateUserAccess('workspace-123', 'user-123', 'write')
        ).rejects.toThrow('Read-only users cannot upload or modify files');
      });

      it('should reject delete operations for read-only users', async () => {
        const mockUser = { id: 'user-123' };
        const mockWorkspaceMember = {
          id: 'member-123',
          workspaceId: 'workspace-123',
          userId: 'user-123',
          role: 'read_only'
        };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });
        mockDatabaseService.getWorkspaceMember.mockResolvedValue(mockWorkspaceMember);

        await expect(
          storageService.validateUserAccess('workspace-123', 'user-123', 'delete')
        ).rejects.toThrow('Read-only users cannot delete files');
      });
    });

    describe('checkUserStorageQuota', () => {
      it('should pass when storage usage is within limits', async () => {
        const mockWorkspaceFiles = [
          { fileSize: 100 * 1024 * 1024 }, // 100MB
          { fileSize: 200 * 1024 * 1024 }  // 200MB
        ];
        const mockUserFiles = [
          { fileSize: 500 * 1024 * 1024 }, // 500MB
          { fileSize: 300 * 1024 * 1024 }  // 300MB
        ];

        mockDatabaseService.getWorkspaceFiles.mockResolvedValue(mockWorkspaceFiles);
        mockDatabaseService.getUserFiles.mockResolvedValue(mockUserFiles);

        const additionalSize = 50 * 1024 * 1024; // 50MB

        await expect(
          storageService.checkUserStorageQuota('workspace-123', 'user-123', additionalSize)
        ).resolves.not.toThrow();

        expect(mockDatabaseService.getWorkspaceFiles).toHaveBeenCalledWith('workspace-123');
        expect(mockDatabaseService.getUserFiles).toHaveBeenCalledWith('user-123');
      });

      it('should reject when workspace quota would be exceeded', async () => {
        const mockWorkspaceFiles = [
          { fileSize: 900 * 1024 * 1024 }, // 900MB (close to 1GB limit)
        ];
        const mockUserFiles = [
          { fileSize: 1 * 1024 * 1024 * 1024 }, // 1GB
        ];

        mockDatabaseService.getWorkspaceFiles.mockResolvedValue(mockWorkspaceFiles);
        mockDatabaseService.getUserFiles.mockResolvedValue(mockUserFiles);

        const additionalSize = 200 * 1024 * 1024; // 200MB (would exceed 1GB workspace limit)

        await expect(
          storageService.checkUserStorageQuota('workspace-123', 'user-123', additionalSize)
        ).rejects.toThrow('Workspace storage quota exceeded');
      });

      it('should reject when user quota would be exceeded', async () => {
        const mockWorkspaceFiles = [
          { fileSize: 100 * 1024 * 1024 }, // 100MB
        ];
        const mockUserFiles = [
          { fileSize: 4.8 * 1024 * 1024 * 1024 }, // 4.8GB (close to 5GB limit)
        ];

        mockDatabaseService.getWorkspaceFiles.mockResolvedValue(mockWorkspaceFiles);
        mockDatabaseService.getUserFiles.mockResolvedValue(mockUserFiles);

        const additionalSize = 300 * 1024 * 1024; // 300MB (would exceed 5GB user limit)

        await expect(
          storageService.checkUserStorageQuota('workspace-123', 'user-123', additionalSize)
        ).rejects.toThrow('User storage quota exceeded');
      });
    });

    describe('getWorkspaceStorageUsage', () => {
      it('should calculate workspace storage usage correctly', async () => {
        const mockWorkspaceFiles = [
          { fileSize: 100 * 1024 * 1024 }, // 100MB
          { fileSize: 200 * 1024 * 1024 }, // 200MB
          { fileSize: undefined },         // Should handle undefined
          { fileSize: 50 * 1024 * 1024 }   // 50MB
        ];

        mockDatabaseService.getWorkspaceFiles.mockResolvedValue(mockWorkspaceFiles);

        const result = await storageService.getWorkspaceStorageUsage('workspace-123');

        expect(result.used).toBe(350 * 1024 * 1024); // 350MB
        expect(result.limit).toBe(1024 * 1024 * 1024); // 1GB
        expect(result.available).toBe(674 * 1024 * 1024); // ~674MB
        expect(mockDatabaseService.getWorkspaceFiles).toHaveBeenCalledWith('workspace-123');
      });

      it('should handle errors gracefully', async () => {
        mockDatabaseService.getWorkspaceFiles.mockRejectedValue(new Error('Database error'));

        const result = await storageService.getWorkspaceStorageUsage('workspace-123');

        expect(result.used).toBe(0);
        expect(result.limit).toBe(1024 * 1024 * 1024);
        expect(result.available).toBe(1024 * 1024 * 1024);
      });
    });

    describe('getUserStorageUsage', () => {
      it('should calculate user storage usage correctly', async () => {
        const mockUserFiles = [
          { fileSize: 500 * 1024 * 1024 }, // 500MB
          { fileSize: 300 * 1024 * 1024 }, // 300MB
          { fileSize: null },              // Should handle null
          { fileSize: 200 * 1024 * 1024 }  // 200MB
        ];

        mockDatabaseService.getUserFiles.mockResolvedValue(mockUserFiles);

        const result = await storageService.getUserStorageUsage('user-123');

        expect(result.used).toBe(1000 * 1024 * 1024); // 1000MB
        expect(result.limit).toBe(5 * 1024 * 1024 * 1024); // 5GB
        expect(result.available).toBe(4 * 1024 * 1024 * 1024); // 4GB
        expect(mockDatabaseService.getUserFiles).toHaveBeenCalledWith('user-123');
      });

      it('should handle errors gracefully', async () => {
        mockDatabaseService.getUserFiles.mockRejectedValue(new Error('Database error'));

        const result = await storageService.getUserStorageUsage('user-123');

        expect(result.used).toBe(0);
        expect(result.limit).toBe(5 * 1024 * 1024 * 1024);
        expect(result.available).toBe(5 * 1024 * 1024 * 1024);
      });
    });
  });
});
