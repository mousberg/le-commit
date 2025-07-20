'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Building, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function WorkspaceSettingsPage() {
  const { currentWorkspace, updateWorkspace, deleteWorkspace, canCurrentUserModifyWorkspace, canCurrentUserDeleteWorkspace } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const workspaceId = searchParams.get('id');

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setDescription(currentWorkspace.description || '');
    }
  }, [currentWorkspace]);

  // Redirect if no workspace ID or no permission
  useEffect(() => {
    if (!workspaceId) {
      router.push('/board/dashboard');
    } else if (currentWorkspace && !canCurrentUserModifyWorkspace) {
      router.push('/board/dashboard');
    }
  }, [workspaceId, currentWorkspace, canCurrentUserModifyWorkspace, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (!currentWorkspace) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await updateWorkspace(currentWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined
      });

      router.push('/board/dashboard');
    } catch (err) {
      console.error('Failed to update workspace:', err);
      setError('Failed to update workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace) return;

    if (deleteConfirmText !== currentWorkspace.name) {
      setError('Please type the workspace name to confirm deletion');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await deleteWorkspace(currentWorkspace.id);

      router.push('/board/dashboard');
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      setError('Failed to delete workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

      <div className="flex items-center mb-6">
        <div className="h-12 w-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center mr-4">
          <Building className="h-6 w-6 text-purple-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Workspace name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    disabled={!canCurrentUserModifyWorkspace}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    disabled={!canCurrentUserModifyWorkspace}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {canCurrentUserModifyWorkspace && (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {canCurrentUserDeleteWorkspace && (
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Delete workspace</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                Once you delete a workspace, all of its data will be permanently removed.
                This action cannot be undone.
              </p>
            </div>

            {showDeleteConfirm ? (
              <div className="mt-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        This action cannot be undone
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          Please type <strong>{currentWorkspace.name}</strong> to confirm deletion.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`Type "${currentWorkspace.name}" to confirm`}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />

                <div className="mt-4 flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isLoading || deleteConfirmText !== currentWorkspace.name}
                    onClick={handleDelete}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Workspace'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Workspace
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
