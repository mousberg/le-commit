import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SupabaseDatabaseService } from '../database';
import { DatabaseClient } from '../../supabase/database';
import { WorkspaceMember, WorkspaceRole } from '../../interfaces/database';

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

describe('SupabaseDatabaseService - Workspace Member Operations', () => {
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

    describe('getWorkspaceMembers', () => {
        it('should get all members of a workspace', async () => {
            const mockMembers = [
                {
                    id: 'member-1',
                    workspace_id: 'workspace-1',
                    user_id: 'user-1',
                    role: 'owner',
                    joined_at: '2023-01-01T00:00:00Z',
                    users: {
                        id: 'user-1',
                        email: 'user1@example.com',
                        full_name: 'User One',
                        avatar_url: null
                    }
                },
                {
                    id: 'member-2',
                    workspace_id: 'workspace-1',
                    user_id: 'user-2',
                    role: 'admin',
                    joined_at: '2023-01-02T00:00:00Z',
                    users: {
                        id: 'user-2',
                        email: 'user2@example.com',
                        full_name: 'User Two',
                        avatar_url: null
                    }
                }
            ];

            mockQuery.order.mockResolvedValue(mockMembers);

            const result = await service.getWorkspaceMembers('workspace-1');

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('workspace_members');
            expect(mockQuery.select).toHaveBeenCalledWith(`
            *,
            users (
              id,
              email,
              full_name,
              avatar_url
            )
          `);
            expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
            expect(mockQuery.order).toHaveBeenCalledWith('joined_at', { ascending: true });
            expect(result).toEqual(mockMembers);
        });
    });

    describe('getWorkspaceMember', () => {
        it('should get a specific workspace member', async () => {
            const mockMember = {
                id: 'member-1',
                workspace_id: 'workspace-1',
                user_id: 'user-1',
                role: 'owner',
                joined_at: '2023-01-01T00:00:00Z',
                users: {
                    id: 'user-1',
                    email: 'user1@example.com',
                    full_name: 'User One',
                    avatar_url: null
                }
            };

            mockQuery.single.mockResolvedValue(mockMember);

            const result = await service.getWorkspaceMember('workspace-1', 'user-1');

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('workspace_members');
            expect(mockQuery.select).toHaveBeenCalledWith(`
            *,
            users (
              id,
              email,
              full_name,
              avatar_url
            )
          `);
            expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
            expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
            expect(mockQuery.single).toHaveBeenCalled();
            expect(result).toEqual(mockMember);
        });

        it('should return null when member not found', async () => {
            mockQuery.single.mockResolvedValue(null);

            const result = await service.getWorkspaceMember('workspace-1', 'non-existent-user');

            expect(result).toBeNull();
        });
    });

    describe('addWorkspaceMember', () => {
        it('should add a workspace member successfully', async () => {
            const mockMember = {
                id: 'member-1',
                workspace_id: 'workspace-1',
                user_id: 'user-2',
                role: 'admin',
                joined_at: '2023-01-01T00:00:00Z',
                users: {
                    id: 'user-2',
                    email: 'user2@example.com',
                    full_name: 'User Two',
                    avatar_url: null
                }
            };

            mockQuery.single.mockResolvedValue(mockMember);

            const result = await service.addWorkspaceMember('workspace-1', 'user-2', 'admin');

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('workspace_members');
            expect(mockQuery.insert).toHaveBeenCalledWith({
                workspace_id: 'workspace-1',
                user_id: 'user-2',
                role: 'admin',
                joined_at: expect.any(String)
            });
            expect(mockQuery.select).toHaveBeenCalledWith(`
            *,
            users (
              id,
              email,
              full_name,
              avatar_url
            )
          `);
            expect(mockQuery.single).toHaveBeenCalled();
            expect(result).toEqual(mockMember);
        });
    });

    describe('updateWorkspaceMemberRole', () => {
        it('should update a workspace member role', async () => {
            const mockMember = {
                id: 'member-1',
                workspace_id: 'workspace-1',
                user_id: 'user-2',
                role: 'owner', // Updated role
                joined_at: '2023-01-01T00:00:00Z',
                users: {
                    id: 'user-2',
                    email: 'user2@example.com',
                    full_name: 'User Two',
                    avatar_url: null
                }
            };

            mockQuery.single.mockResolvedValue(mockMember);

            const result = await service.updateWorkspaceMemberRole('workspace-1', 'user-2', 'owner');

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('workspace_members');
            expect(mockQuery.update).toHaveBeenCalledWith({ role: 'owner' });
            expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
            expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-2');
            expect(mockQuery.select).toHaveBeenCalledWith(`
              *,
              users (
                id,
                email,
                full_name,
                avatar_url
              )
            `);
            expect(mockQuery.single).toHaveBeenCalled();
            expect(result).toEqual(mockMember);
        });
    });

    describe('removeWorkspaceMember', () => {
        it('should remove a workspace member successfully', async () => {
            // Mock the chained eq calls - the second eq call should return the resolved value
            const mockSecondEq = vi.fn().mockResolvedValue({ data: null, error: null });
            mockQuery.eq.mockReturnValueOnce({ eq: mockSecondEq });

            const result = await service.removeWorkspaceMember('workspace-1', 'user-2');

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('workspace_members');
            expect(mockQuery.delete).toHaveBeenCalled();
            expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
            expect(mockSecondEq).toHaveBeenCalledWith('user_id', 'user-2');
            expect(result).toBe(true);
        });
    });

    describe('getUserWorkspaceRole', () => {
        it('should get user role in workspace', async () => {
            mockQuery.single.mockResolvedValue({ role: 'admin' });

            const result = await service.getUserWorkspaceRole('workspace-1', 'user-1');

            expect(mockDatabaseClient.from).toHaveBeenCalledWith('workspace_members');
            expect(mockQuery.select).toHaveBeenCalledWith('role');
            expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
            expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
            expect(mockQuery.single).toHaveBeenCalled();
            expect(result).toBe('admin');
        });

        it('should return null when user has no role', async () => {
            mockQuery.single.mockResolvedValue(null);

            const result = await service.getUserWorkspaceRole('workspace-1', 'user-1');

            expect(result).toBeNull();
        });
    });

    describe('validateWorkspaceAccess', () => {
        it('should validate access based on role hierarchy', async () => {
            // Mock getUserWorkspaceRole to return different roles
            vi.spyOn(service, 'getUserWorkspaceRole').mockImplementation(async (workspaceId, userId) => {
                if (userId === 'owner-user') return 'owner';
                if (userId === 'admin-user') return 'admin';
                if (userId === 'read-only-user') return 'read_only';
                return null;
            });

            // Owner should have access to all roles
            expect(await service.validateWorkspaceAccess('workspace-1', 'owner-user')).toBe(true);
            expect(await service.validateWorkspaceAccess('workspace-1', 'owner-user', 'owner')).toBe(true);
            expect(await service.validateWorkspaceAccess('workspace-1', 'owner-user', 'admin')).toBe(true);
            expect(await service.validateWorkspaceAccess('workspace-1', 'owner-user', 'read_only')).toBe(true);

            // Admin should have access to admin and read_only roles
            expect(await service.validateWorkspaceAccess('workspace-1', 'admin-user')).toBe(true);
            expect(await service.validateWorkspaceAccess('workspace-1', 'admin-user', 'owner')).toBe(false);
            expect(await service.validateWorkspaceAccess('workspace-1', 'admin-user', 'admin')).toBe(true);
            expect(await service.validateWorkspaceAccess('workspace-1', 'admin-user', 'read_only')).toBe(true);

            // Read-only should only have read_only access
            expect(await service.validateWorkspaceAccess('workspace-1', 'read-only-user')).toBe(true);
            expect(await service.validateWorkspaceAccess('workspace-1', 'read-only-user', 'owner')).toBe(false);
            expect(await service.validateWorkspaceAccess('workspace-1', 'read-only-user', 'admin')).toBe(false);
            expect(await service.validateWorkspaceAccess('workspace-1', 'read-only-user', 'read_only')).toBe(true);

            // Non-member should have no access
            expect(await service.validateWorkspaceAccess('workspace-1', 'non-member')).toBe(false);
        });
    });

    describe('validateWorkspaceMemberManagement', () => {
        it('should validate member management permissions', async () => {
            // Mock validateWorkspaceAccess
            vi.spyOn(service, 'validateWorkspaceAccess').mockImplementation(async (workspaceId, userId, role) => {
                if (userId === 'owner-user') return true;
                if (userId === 'admin-user' && role !== 'owner') return true;
                return false;
            });

            // Mock getUserWorkspaceRole
            vi.spyOn(service, 'getUserWorkspaceRole').mockImplementation(async (workspaceId, userId) => {
                if (userId === 'owner-user') return 'owner';
                if (userId === 'admin-user') return 'admin';
                if (userId === 'member-user') return 'read_only';
                return null;
            });

            // Owner should be able to manage anyone
            expect(await service.validateWorkspaceMemberManagement('workspace-1', 'owner-user', 'admin-user')).toBe(true);
            expect(await service.validateWorkspaceMemberManagement('workspace-1', 'owner-user', 'member-user')).toBe(true);

            // Admin should be able to manage regular members but not owners
            expect(await service.validateWorkspaceMemberManagement('workspace-1', 'admin-user', 'owner-user')).toBe(false);
            expect(await service.validateWorkspaceMemberManagement('workspace-1', 'admin-user', 'member-user')).toBe(true);

            // Regular members should not be able to manage anyone
            expect(await service.validateWorkspaceMemberManagement('workspace-1', 'member-user', 'admin-user')).toBe(false);
        });
    });

    describe('canUserInviteMembers', () => {
        it('should check if user can invite members', async () => {
            // Mock validateWorkspaceAccess
            vi.spyOn(service, 'validateWorkspaceAccess').mockImplementation(async (workspaceId, userId, role) => {
                if (role === 'admin') {
                    return userId === 'owner-user' || userId === 'admin-user';
                }
                return false;
            });

            expect(await service.canUserInviteMembers('workspace-1', 'owner-user')).toBe(true);
            expect(await service.canUserInviteMembers('workspace-1', 'admin-user')).toBe(true);
            expect(await service.canUserInviteMembers('workspace-1', 'member-user')).toBe(false);
        });
    });

    describe('canUserRemoveMembers', () => {
        it('should check if user can remove members', async () => {
            // Mock validateWorkspaceMemberManagement
            vi.spyOn(service, 'validateWorkspaceMemberManagement').mockImplementation(async (workspaceId, userId, targetUserId) => {
                if (userId === 'owner-user') return true;
                if (userId === 'admin-user' && targetUserId !== 'owner-user') return true;
                return false;
            });

            expect(await service.canUserRemoveMembers('workspace-1', 'owner-user', 'admin-user')).toBe(true);
            expect(await service.canUserRemoveMembers('workspace-1', 'admin-user', 'owner-user')).toBe(false);
            expect(await service.canUserRemoveMembers('workspace-1', 'admin-user', 'member-user')).toBe(true);
            expect(await service.canUserRemoveMembers('workspace-1', 'member-user', 'admin-user')).toBe(false);
        });
    });
});
