'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { browserDatabaseService } from '@/lib/services/database';
import { Button } from '@/components/ui/button';
import { Building, Loader2 } from 'lucide-react';

export default function SetupWorkspacePage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const workspace = await browserDatabaseService.createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined
      });

      // Redirect to dashboard
      router.push('/board/dashboard');
    } catch (err) {
      console.error('Failed to create workspace:', err);
      setError('Failed to create workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center mb-6">
            <Building className="h-8 w-8 text-purple-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create your workspace</h1>
          <p className="mt-2 text-sm text-gray-600">
            Workspaces help you organize your hiring projects and collaborate with your team
          </p>
        </div>

        <div className="mt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="e.g., Engineering Team, Product Hiring"
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="A brief description of this workspace"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
