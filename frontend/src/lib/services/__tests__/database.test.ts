import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SupabaseDatabaseService } from '../database';
import { DatabaseClient } from '../../supabase/database';
import { CreateApplicantData, UpdateApplicantData, Applicant } from '../../interfaces/database';

// Mock the supabase modules first
vi.mock('../../supabase/database', () => {
    const mockDatabaseClient = {
        from: vi.fn(),
        getCurrentUser: vi.fn()
    };

    return {
        getBrowserDatabaseClient: () => mockDatabaseClient,
        getServerDatabaseClient: () => Promise.resolve(mockDatabaseClient),
        TABLES: {
            APPLICANTS: 'applicants',
            WORKSPACES: 'workspaces',
            WORKSPACE_MEMBERS: 'workspace_members',
            USERS: 'users',
            FILES: 'files'
        }
    };
});

vi.mock('../../supabase/errors', () => ({
    handleDatabaseError: (error: any) => error,
    safeExecute: (fn: Function) => fn(),
    safeExecuteOptional: (fn: Function) => fn(),
    safeExecuteArray: (fn: Function) => fn(),
    withRetry: (fn: Function) => fn(),
    logDatabaseError: vi.fn()
}));

describe('SupabaseDatabaseService - Applicant Operations', () => {
    let service: SupabaseDatabaseService;
    let mockQuery: any;
    let mockDatabaseClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock query chain - all methods return the query object for chaining
        mockQuery = {
            insert: vi.fn(),
            select: vi.fn(),
            single: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            eq: vi.fn(),
            or: vi.fn(),
            order: vi.fn(),
            limit: vi.fn(),
            range: vi.fn(),
            in: vi.fn()
        };

        // Set up all methods to return the query object for chaining
        mockQuery.insert.mockReturnValue(mockQuery);
        mockQuery.select.mockReturnValue(mockQuery);
        mockQuery.update.mockReturnValue(mockQuery);
        mockQuery.delete.mockReturnValue(mockQuery);
        mockQuery.eq.mockReturnValue(mockQuery);
        mockQuery.or.mockReturnValue(mockQuery);
        mockQuery.order.mockReturnValue(mockQuery);
        mockQuery.limit.mockReturnValue(mockQuery);
        mockQuery.range.mockReturnValue(mockQuery);
        mockQuery.in.mockReturnValue(mockQuery);

        // Create a fresh mock database client for each test
        mockDatabaseClient = {
            from: vi.fn().mockReturnValue(mockQuery),
            getCurrentUser: vi.fn()
        };

        service = new SupabaseDatabaseService(mockDatabaseClient);
    });

    describe('createApplicant', () => {
        it('should create an applicant with valid data', async () => {
            const mockDbApplicant = {
                id: 'test-id',
                workspace_id: 'workspace-1',
                name: 'John Doe',
                email: 'john@example.com',
                status: 'uploading',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z',
                original_filename: 'resume.pdf',
                original_github_url: null,
                score: null,
                role: 'Software Engineer',
                cv_data: null,
                linkedin_data: null,
                github_data: null,
                analysis_result: null,
                individual_analysis: null,
                cross_reference_analysis: null
            };

            mockQuery.single.mockResolvedValue(mockDbApplicant);

            const createData: CreateApplicantData = {
                name: 'John Doe',
                email: 'john@example.com',
                workspaceId: 'workspace-1',
                status: 'uploading',
                originalFileName: 'resume.pdf',
                role: 'Software Engineer'
            };

            const result = await service.createApplicant(createData);

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('applicants');
            expect(mockQuery.insert).toHaveBeenCalledWith({
                name: 'John Doe',
                email: 'john@example.com',
                workspace_id: 'workspace-1',
                status: 'uploading',
                original_filename: 'resume.pdf',
                original_github_url: undefined,
                role: 'Software Engineer',
                created_at: expect.any(String),
                updated_at: expect.any(String)
            });
            expect(mockQuery.select).toHaveBeenCalled();
            expect(mockQuery.single).toHaveBeenCalled();

            expect(result).toEqual({
                id: 'test-id',
                workspaceId: 'workspace-1',
                name: 'John Doe',
                email: 'john@example.com',
                status: 'uploading',
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z',
                originalFileName: 'resume.pdf',
                originalGithubUrl: null,
                score: null,
                role: 'Software Engineer',
                cvData: null,
                linkedinData: null,
                githubData: null,
                analysisResult: null,
                individualAnalysis: null,
                crossReferenceAnalysis: null
            });
        });

        it('should throw error for invalid status', async () => {
            const createData: CreateApplicantData = {
                name: 'John Doe',
                workspaceId: 'workspace-1',
                status: 'invalid-status' as any
            };

            await expect(service.createApplicant(createData)).rejects.toThrow(
                'Invalid applicant status: invalid-status'
            );
        });
    });

    describe('getApplicant', () => {
        it('should return an applicant when found', async () => {
            const mockDbApplicant = {
                id: 'test-id',
                workspace_id: 'workspace-1',
                name: 'John Doe',
                email: 'john@example.com',
                status: 'completed',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z',
                cv_data: { name: 'John Doe', skills: ['JavaScript'] },
                linkedin_data: null,
                github_data: null,
                analysis_result: { score: 85 },
                individual_analysis: null,
                cross_reference_analysis: null
            };

            mockQuery.single.mockResolvedValue(mockDbApplicant);

            const result = await service.getApplicant('test-id');

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('applicants');
            expect(mockQuery.select).toHaveBeenCalledWith('*');
            expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-id');
            expect(mockQuery.single).toHaveBeenCalled();

            expect(result).toEqual({
                id: 'test-id',
                workspaceId: 'workspace-1',
                name: 'John Doe',
                email: 'john@example.com',
                status: 'completed',
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z',
                cvData: { name: 'John Doe', skills: ['JavaScript'] },
                linkedinData: null,
                githubData: null,
                analysisResult: { score: 85 },
                individualAnalysis: null,
                crossReferenceAnalysis: null,
                originalFileName: undefined,
                originalGithubUrl: undefined,
                score: undefined,
                role: undefined
            });
        });

        it('should return null when applicant not found', async () => {
            mockQuery.single.mockResolvedValue(null);

            const result = await service.getApplicant('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('updateApplicant', () => {
        it('should update applicant with valid data', async () => {
            const mockDbApplicant = {
                id: 'test-id',
                workspace_id: 'workspace-1',
                name: 'John Doe Updated',
                email: 'john.updated@example.com',
                status: 'completed',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-02T00:00:00Z',
                cv_data: { name: 'John Doe', skills: ['JavaScript', 'TypeScript'] },
                analysis_result: { score: 90 }
            };

            mockQuery.single.mockResolvedValue(mockDbApplicant);

            const updateData: UpdateApplicantData = {
                name: 'John Doe Updated',
                email: 'john.updated@example.com',
                status: 'completed',
                cvData: { name: 'John Doe', skills: ['JavaScript', 'TypeScript'] },
                analysisResult: { score: 90 }
            };

            const result = await service.updateApplicant('test-id', updateData);

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('applicants');
            expect(mockQuery.update).toHaveBeenCalledWith({
                name: 'John Doe Updated',
                email: 'john.updated@example.com',
                status: 'completed',
                cv_data: { name: 'John Doe', skills: ['JavaScript', 'TypeScript'] },
                analysis_result: { score: 90 },
                updated_at: expect.any(String)
            });
            expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-id');
            expect(mockQuery.select).toHaveBeenCalled();
            expect(mockQuery.single).toHaveBeenCalled();

            expect(result.name).toBe('John Doe Updated');
            expect(result.email).toBe('john.updated@example.com');
            expect(result.status).toBe('completed');
        });

        it('should throw error for invalid status in update', async () => {
            const updateData: UpdateApplicantData = {
                status: 'invalid-status' as any
            };

            await expect(service.updateApplicant('test-id', updateData)).rejects.toThrow(
                'Invalid applicant status: invalid-status'
            );
        });
    });

    describe('deleteApplicant', () => {
        it('should delete an applicant successfully', async () => {
            // Mock the final result of the delete chain
            mockQuery.eq.mockResolvedValue({ data: null, error: null });

            const result = await service.deleteApplicant('test-id');

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('applicants');
            expect(mockQuery.delete).toHaveBeenCalled();
            expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-id');
            expect(result).toBe(true);
        });
    });

    describe('listApplicants', () => {
        it('should list applicants with basic options', async () => {
            const mockDbApplicants = [
                {
                    id: 'applicant-1',
                    workspace_id: 'workspace-1',
                    name: 'John Doe',
                    status: 'completed',
                    created_at: '2023-01-01T00:00:00Z'
                },
                {
                    id: 'applicant-2',
                    workspace_id: 'workspace-1',
                    name: 'Jane Smith',
                    status: 'processing',
                    created_at: '2023-01-02T00:00:00Z'
                }
            ];

            mockQuery.order.mockResolvedValue(mockDbApplicants);

            const result = await service.listApplicants({
                workspaceId: 'workspace-1'
            });

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('applicants');
            expect(mockQuery.select).toHaveBeenCalledWith('*');
            expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
            expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
            expect(result).toHaveLength(2);
        });

        it('should filter by status', async () => {
            const mockDbApplicants = [
                {
                    id: 'applicant-1',
                    workspace_id: 'workspace-1',
                    name: 'John Doe',
                    status: 'completed',
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            // Mock the final result after all chaining
            mockQuery.order.mockResolvedValue(mockDbApplicants);

            const result = await service.listApplicants({
                workspaceId: 'workspace-1',
                status: 'completed'
            });

            expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
            expect(mockQuery.eq).toHaveBeenCalledWith('status', 'completed');
            expect(result).toHaveLength(1);
        });

        it('should apply search filter', async () => {
            const mockDbApplicants = [];
            mockQuery.order.mockResolvedValue(mockDbApplicants);

            const result = await service.listApplicants({
                workspaceId: 'workspace-1',
                search: 'john'
            });

            expect(mockQuery.or).toHaveBeenCalledWith(
                'name.ilike.%john%,email.ilike.%john%,role.ilike.%john%'
            );
            expect(result).toEqual([]);
        });

        it('should apply limit and offset', async () => {
            const mockDbApplicants = [];
            mockQuery.range.mockResolvedValue(mockDbApplicants);

            await service.listApplicants({
                workspaceId: 'workspace-1',
                limit: 10,
                offset: 20
            });

            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
        });
    });

    describe('getApplicantsByStatus', () => {
        it('should get applicants by status', async () => {
            const mockDbApplicants = [
                {
                    id: 'applicant-1',
                    workspace_id: 'workspace-1',
                    name: 'John Doe',
                    status: 'completed'
                }
            ];

            mockQuery.order.mockResolvedValue(mockDbApplicants);

            const result = await service.getApplicantsByStatus('workspace-1', 'completed');

            expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
            expect(mockQuery.eq).toHaveBeenCalledWith('status', 'completed');
            expect(result).toHaveLength(1);
        });

        it('should throw error for invalid status', async () => {
            await expect(
                service.getApplicantsByStatus('workspace-1', 'invalid-status')
            ).rejects.toThrow('Invalid applicant status: invalid-status');
        });
    });

    describe('searchApplicants', () => {
        it('should search applicants by term', async () => {
            const mockDbApplicants = [];
            mockQuery.order.mockResolvedValue(mockDbApplicants);

            await service.searchApplicants('workspace-1', 'engineer');

            expect(mockQuery.or).toHaveBeenCalledWith(
                'name.ilike.%engineer%,email.ilike.%engineer%,role.ilike.%engineer%'
            );
        });

        it('should apply limit when provided', async () => {
            const mockDbApplicants = [];
            mockQuery.limit.mockReturnValue(mockDbApplicants);

            await service.searchApplicants('workspace-1', 'engineer', 5);

            expect(mockQuery.limit).toHaveBeenCalledWith(5);
        });
    });

    describe('updateApplicantStatus', () => {
        it('should update applicant status', async () => {
            const mockDbApplicant = {
                id: 'test-id',
                status: 'completed',
                updated_at: '2023-01-02T00:00:00Z'
            };

            mockQuery.single.mockResolvedValue(mockDbApplicant);

            const result = await service.updateApplicantStatus('test-id', 'completed');

            expect(mockQuery.update).toHaveBeenCalledWith({
                status: 'completed',
                updated_at: expect.any(String)
            });
            expect(result.status).toBe('completed');
        });

        it('should throw error for invalid status', async () => {
            await expect(
                service.updateApplicantStatus('test-id', 'invalid-status')
            ).rejects.toThrow('Invalid applicant status: invalid-status');
        });
    });

    describe('bulkUpdateApplicantStatus', () => {
        it('should bulk update applicant status', async () => {
            mockQuery.in.mockResolvedValue({ data: null, error: null });

            await service.bulkUpdateApplicantStatus(['id1', 'id2'], 'completed');

            expect(mockQuery.update).toHaveBeenCalledWith({
                status: 'completed',
                updated_at: expect.any(String)
            });
            expect(mockQuery.in).toHaveBeenCalledWith('id', ['id1', 'id2']);
        });

        it('should throw error for invalid status', async () => {
            await expect(
                service.bulkUpdateApplicantStatus(['id1'], 'invalid-status')
            ).rejects.toThrow('Invalid applicant status: invalid-status');
        });
    });

    describe('validateApplicantStatus', () => {
        it('should validate correct statuses', () => {
            const validStatuses = ['uploading', 'processing', 'analyzing', 'completed', 'failed'];

            validStatuses.forEach(status => {
                expect(() => (service as any).validateApplicantStatus(status)).not.toThrow();
            });
        });

        it('should throw error for invalid status', () => {
            expect(() => (service as any).validateApplicantStatus('invalid')).toThrow(
                'Invalid applicant status: invalid. Must be one of: uploading, processing, analyzing, completed, failed'
            );
        });
    });

    describe('transformDatabaseApplicantToInterface', () => {
        it('should transform database applicant to interface format', () => {
            const dbApplicant = {
                id: 'test-id',
                workspace_id: 'workspace-1',
                name: 'John Doe',
                email: 'john@example.com',
                status: 'completed',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-02T00:00:00Z',
                original_filename: 'resume.pdf',
                original_github_url: 'https://github.com/johndoe',
                score: 85,
                role: 'Software Engineer',
                cv_data: { name: 'John Doe' },
                linkedin_data: { company: 'Tech Corp' },
                github_data: { repos: 10 },
                analysis_result: { score: 85 },
                individual_analysis: { cv: { score: 80 } },
                cross_reference_analysis: { consistency: 90 }
            };

            const result = (service as any).transformDatabaseApplicantToInterface(dbApplicant);

            expect(result).toEqual({
                id: 'test-id',
                workspaceId: 'workspace-1',
                name: 'John Doe',
                email: 'john@example.com',
                status: 'completed',
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-02T00:00:00Z',
                originalFileName: 'resume.pdf',
                originalGithubUrl: 'https://github.com/johndoe',
                score: 85,
                role: 'Software Engineer',
                cvData: { name: 'John Doe' },
                linkedinData: { company: 'Tech Corp' },
                githubData: { repos: 10 },
                analysisResult: { score: 85 },
                individualAnalysis: { cv: { score: 80 } },
                crossReferenceAnalysis: { consistency: 90 }
            });
        });
    });
});
