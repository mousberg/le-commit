import { createClient } from '@/lib/supabase/server';
import { isAshbyConfigured } from '@/lib/ashby/config';
import { ATSPageContent } from './ATSPageContent';
import { fetchCandidatesServer } from './actions';
import { redirect } from 'next/navigation';

// Mark as dynamic since we use authentication
export const dynamic = 'force-dynamic';

// Server component that handles authentication and API key validation
export default async function ATSPage() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Handle unauthenticated users
    if (authError || !user) {
      redirect('/login');
    }

    // Check if Ashby API key is configured - if not, hide the view
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', user.id)
      .single();

    if (!isAshbyConfigured(userData?.ashby_api_key)) {
      // Hide view if no API key is configured
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">ATS Integration Not Configured</h1>
            <p className="text-gray-600 mb-6">
              Please configure your Ashby API key in settings to access ATS features.
            </p>
            <a 
              href="/board/settings" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Settings
            </a>
          </div>
        </div>
      );
    }

    // Fetch data using server action
    const candidatesData = await fetchCandidatesServer(user.id);

    // Return content
    return <ATSPageContent initialData={candidatesData} user={user} />;
  } catch (error) {
    console.error('Error in ATSPage server component:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Fallback to empty state
    return <ATSPageContent initialData={{
      candidates: [],
      cached_count: 0,
      auto_synced: false,
      last_sync: null
    }} user={{ id: '', email: '' }} />;
  }
}