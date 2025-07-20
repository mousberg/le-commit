'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Users, Loader2, ArrowLeft, UserPlus, MoreHorizontal, Check, X } from 'lucide-react';
import { WorkspaceMember, WorkspaceRole } from '@/lib/interfaces/database';

export default function WorkspaceMembersPage() {
  const {
    currentWorkspace,
    workspaceMembers,
    refreshWorkspaceMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
    userRole,
    canCurrentUserInviteMembers
  } = useWorkspace();

  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('read_only');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [memberActionsOpen, setMemberActionsOpen] = useState<string | null>(null);

  const workspaceId = searchParams.get('id');

  // Redirect if no workspace ID
  useEffect(() => {
    if (!workspaceId) {
      router.push('/board/dashboard');
    }
  }, [workspaceId, router]);

  // Refresh members list when page loads
  useEffect(() => {
    if (currentWorkspace) {
      refreshWorkspaceMembers();
    }
  }, [currentWorkspace, refreshWorkspaceMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      setError('Email address is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await inviteMember(inviteEmail.trim(), inviteRole);

      // Reset form
      setInviteEmail('');
      setInviteRole('read_only');
      setShowInviteForm(false);

      // Refresh members list
      await refreshWorkspaceMembers();
    } catch (err) {
      console.error('Failed to invite member:', err);
      setError('Failed to invite member. Please check the email address and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const hRemoveMember = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await removeMember(userId);

      // Close actions menu
      setMemberActionsOpen(null);

      // Refresh members list
      await refreshWorkspaceMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError('Failed to remove member. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: WorkspaceRole) => {
    try {
      setIsLoading(true);
      setError(null);

      await updateMemberRole(userId, role);

      // Close actions menu
      setMemberActionsOpen(null);

      // Refresh members list
      await refreshWorkspaceMembers();
    } catch (err) {
      console.error('Failed to update member role:', err);
      setError('Failed to update member role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to check if current user can manage this member
  const canManageMember = (member: WorkspaceMember) => {
    // Owners can manage anyone except themselves
    if (userRole === 'owner' && member.user.id !== currentWorkspace?.ownerId) {
      return true;
    }

    // Admins can manage read_only members
    if (userRole === 'admin' && member.role === 'read_only') {
      return true;
    }

    return false;
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/board/dashboard')}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center mr-4">
            <Users className="h-6 w-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workspace Members</h1>
            <p className="text-sm text-gray-500">{currentWorkspace.name}</p>
          </div>
        </div>

        {canCurrentUserInviteMembers && (
          <Button
            onClick={() => setShowInviteForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {showInviteForm && (
        <div className="mb-6 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Invite a new member</h3>
            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    placeholder="colleague@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <div className="mt-1">
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  >
                    <option value="read_only">Read Only</option>
                    <option value="admin">Admin</option>
                    {userRole === 'owner' && (
                      <option value="owner">Owner</option>
                    )}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {inviteRole === 'read_only' && 'Can view applicants but cannot modify data'}
                  {inviteRole === 'admin' && 'Can manage applicants and invite members'}
                  {inviteRole === 'owner' && 'Full control over the workspace, including deletion'}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {workspaceMembers.map((member) => (
            <li key={member.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {member.user.fullName?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {member.user.fullName || member.user.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${member.role === 'owner' ? 'bg-purple-100 text-purple-800' : ''}
                    ${member.role === 'admin' ? 'bg-blue-100 text-blue-800' : ''}
                    ${member.role === 'read_only' ? 'bg-gray-100 text-gray-800' : ''}
                  `}>
                    {member.role === 'owner' ? 'Owner' : ''}
                    {member.role === 'admin' ? 'Admin' : ''}
                    {member.role === 'read_only' ? 'Read Only' : ''}
                  </span>

                  {canManageMember(member) && (
                    <div className="ml-4 relative">
                      <button
                        onClick={() => setMemberActionsOpen(memberActionsOpen === member.id ? null : member.id)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 rounded-full p-1"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {memberActionsOpen === member.id && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            {/* Change role options */}
                            {member.role !== 'owner' && userRole === 'owner' && (
                              <button
                                onClick={() => handleUpdateRole(member.userId, 'owner')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem"
                              >
                                Make Owner
                              </button>
                            )}

                            {member.role !== 'admin' && (userRole === 'owner' || userRole === 'admin') && (
                              <button
                                onClick={() => handleUpdateRole(member.userId, 'admin')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem"
                              >
                                Make Admin
                              </button>
                            )}

                            {member.role !== 'read_only' && (
                              <button
                                onClick={() => handleUpdateRole(member.userId, 'read_only')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem"
                              >
                                Make Read Only
                              </button>
                            )}

                            {/* Remove member option */}
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Remove from Workspace
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}

          {workspaceMembers.length === 0 && (
            <li className="px-4 py-6 text-center text-gray-500">
              No members found in this workspace
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
