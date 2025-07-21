'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../interfaces/database';
import { browserDatabaseService } from '../services/database';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  isLoading: boolean;
  error: string | null;
  userRole: WorkspaceRole | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, data: { name?: string; description?: string }) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  inviteMember: (email: string, role: WorkspaceRole) => Promise<WorkspaceMember | null>;
  removeMember: (userId: string) => Promise<boolean>;
  updateMemberRole: (userId: string, role: WorkspaceRole) => Promise<WorkspaceMember | null>;
  refreshWorkspaces: () => Promise<void>;
  refreshWorkembers: () => Promise<void>;
  canCurrentUserModifyWorkspace: boolean;
  canCurrentUserInviteMembers: boolean;
  canCurrentUserDeleteWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<WorkspaceRole | null>(null);

  // Permissions based on user role
  const canCurrentUserModifyWorkspace = userRole === 'owner' || userRole === 'admin';
  const canCurrentUserInviteMembers = userRole === 'owner' || userRole === 'admin';
  const canCurrentUserDeleteWorkspace = userRole === 'owner';

  // Load user's workspaces
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadWorkspaces = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const userWorkspaces = await browserDatabaseService.getUserWorkspaces({
          userId: user.id
        });

        setWorkspaces(userWorkspaces);

        // If no current workspace is set but we have workspaces, set the first one
        if (!currentWorkspace && userWorkspaces.length > 0) {
          setCurrentWorkspace(userWorkspaces[0]);
        } else if (currentWorkspace) {
          // Update current workspace data if it exists in the new list
          const updatedCurrentWorkspace = userWorkspaces.find(w => w.id === currentWorkspace.id);
          if (updatedCurrentWorkspace) {
            setCurrentWorkspace(updatedCurrentWorkspace);
          } else if (userWorkspaces.length > 0) {
            // If current workspace no longer exists, set to first available
            setCurrentWorkspace(userWorkspaces[0]);
          } else {
            setCurrentWorkspace(null);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load workspaces:', err);
        setError('Failed to load workspaces');
        setIsLoading(false);
      }
    };

    loadWorkspaces();
  }, [user, currentWorkspace]);

  // Load workspace members when current workspace changes
  useEffect(() => {
    if (!currentWorkspace || !user) return;

    const loadWorkspaceMembers = async () => {
      try {
        const members = await browserDatabaseService.getWorkspaceMembers(currentWorkspace.id);
        setWorkspaceMembers(members);

        // Set user's role in current workspace
        const userMember = members.find(member => member.userId === user.id);
        setUserRole(userMember?.role || null);
      } catch (err) {
        console.error('Failed to load workspace members:', err);
      }
    };

    loadWorkspaceMembers();
  }, [currentWorkspace, user]);

  // Handle workspace creation
  const createWorkspace = async (name: string, description?: string): Promise<Workspace> => {
    try {
      const newWorkspace = await browserDatabaseService.createWorkspace({
        name,
        description
      });

      // Add the new workspace to the list
      setWorkspaces(prev => [...prev, newWorkspace]);

      // Set as current workspace
      setCurrentWorkspace(newWorkspace);

      // Set user role as owner for the new workspace
      setUserRole('owner');

      return newWorkspace;
    } catch (err) {
      console.error('Failed to create workspace:', err);
      throw new Error('Failed to create workspace');
    }
  };

  // Handle workspace update
  const updateWorkspace = async (id: string, data: { name?: string; description?: string }): Promise<Workspace> => {
    try {
      const updatedWorkspace = await browserDatabaseService.updateWorkspace(id, data);

      // Update workspaces list
      setWorkspaces(prev =>
        prev.map(workspace =>
          workspace.id === id ? updatedWorkspace : workspace
        )
      );

      // Update current workspace if it's the one being updated
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(updatedWorkspace);
      }

      return updatedWorkspace;
    } catch (err) {
      console.error('Failed to update workspace:', err);
      throw new Error('Failed to update workspace');
    }
  };

  // Handle workspace deletion
  const deleteWorkspace = async (id: string): Promise<boolean> => {
    try {
      const success = await browserDatabaseService.deleteWorkspace(id);

      if (success) {
        // Remove from workspaces list
        const updatedWorkspaces = workspaces.filter(workspace => workspace.id !== id);
        setWorkspaces(updatedWorkspaces);

        // If current workspace was deleted, set a new current workspace
        if (currentWorkspace?.id === id) {
          if (updatedWorkspaces.length > 0) {
            setCurrentWorkspace(updatedWorkspaces[0]);
          } else {
            setCurrentWorkspace(null);
          }
        }
      }

      return success;
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      throw new Error('Failed to delete workspace');
    }
  };

  // Handle member invitation
  const inviteMember = async (email: string, role: WorkspaceRole): Promise<WorkspaceMember | null> => {
    if (!currentWorkspace) return null;

    try {
      // In a real implementation, this would involve:
      // 1. Checking if user exists by email
      // 2. If not, creating a placeholder user
      // 3. Sending an invitation email
      // 4. Adding the user to the workspace with the specified role

      // For now, we'll assume the user exists and just add them directly
      // This is a simplified implementation
      const existingUser = await browserDatabaseService.getUserByAuthId(email);

      if (!existingUser) {
        throw new Error('User not found');
      }

      const newMember = await browserDatabaseService.addWorkspaceMember(
        currentWorkspace.id,
        existingUser.id,
        role
      );

      // Add to members list
      setWorkspaceMembers(prev => [...prev, newMember]);

      return newMember;
    } catch (err) {
      console.error('Failed to invite member:', err);
      throw new Error('Failed to invite member');
    }
  };

  // Handle member removal
  const removeMember = async (userId: string): Promise<boolean> => {
    if (!currentWorkspace) return false;

    try {
      const success = await browserDatabaseService.removeWorkspaceMember(
        currentWorkspace.id,
        userId
      );

      if (success) {
        // Remove from members list
        setWorkspaceMembers(prev => prev.filter(member => member.userId !== userId));
      }

      return success;
    } catch (err) {
      console.error('Failed to remove member:', err);
      throw new Error('Failed to remove member');
    }
  };

  // Handle member role update
  const updateMemberRole = async (userId: string, role: WorkspaceRole): Promise<WorkspaceMember | null> => {
    if (!currentWorkspace) return null;

    try {
      const updatedMember = await browserDatabaseService.updateWorkspaceMemberRole(
        currentWorkspace.id,
        userId,
        role
      );

      // Update members list
      setWorkspaceMembers(prev =>
        prev.map(member =>
          member.userId === userId ? updatedMember : member
        )
      );

      return updatedMember;
    } catch (err) {
      console.error('Failed to update member role:', err);
      throw new Error('Failed to update member role');
    }
  };

  // Refresh workspaces list
  const refreshWorkspaces = async (): Promise<void> => {
    if (!user) return;

    try {
      const userWorkspaces = await browserDatabaseService.getUserWorkspaces({
        userId: user.id
      });

      setWorkspaces(userWorkspaces);

      // Update current workspace if it exists in the new list
      if (currentWorkspace) {
        const updatedCurrentWorkspace = userWorkspaces.find(w => w.id === currentWorkspace.id);
        if (updatedCurrentWorkspace) {
          setCurrentWorkspace(updatedCurrentWorkspace);
        } else if (userWorkspaces.length > 0) {
          setCurrentWorkspace(userWorkspaces[0]);
        } else {
          setCurrentWorkspace(null);
        }
      } else if (userWorkspaces.length > 0) {
        setCurrentWorkspace(userWorkspaces[0]);
      }
    } catch (err) {
      console.error('Failed to refresh workspaces:', err);
      throw new Error('Failed to refresh workspaces');
    }
  };

  // Refresh workspace members
  const refreshWorkspaceMembers = async (): Promise<void> => {
    if (!currentWorkspace || !user) return;

    try {
      const members = await browserDatabaseService.getWorkspaceMembers(currentWorkspace.id);
      setWorkspaceMembers(members);

      // Update user's role
      const userMember = members.find(member => member.userId === user.id);
      setUserRole(userMember?.role || null);
    } catch (err) {
      console.error('Failed to refresh workspace members:', err);
      throw new Error('Failed to refresh workspace members');
    }
  };

  // Redirect to workspace creation if no workspaces exist
  useEffect(() => {
    if (user && !isLoading && workspaces.length === 0 && !pathname?.includes('/board/setup-workspace')) {
      router.push('/board/setup-workspace');
    }
  }, [user, isLoading, workspaces, pathname, router]);

  const value = {
    currentWorkspace,
    workspaces,
    workspaceMembers,
    isLoading,
    error,
    userRole,
    setCurrentWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    removeMember,
    updateMemberRole,
    refreshWorkspaces,
    refreshWorkspaceMembers,
    canCurrentUserModifyWorkspace,
    canCurrentUserInviteMembers,
    canCurrentUserDeleteWorkspace
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
