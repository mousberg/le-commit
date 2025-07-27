// Ashby Candidates API - Cached candidate management with auto-sync
import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch cached candidates with auto-sync of new ones
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Get user ID
    const userResult = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }

    const userId = userResult.data.id;

    // Get cached candidates
    const cachedResult = await supabase
      .from('ashby_candidates')
      .select('*')
      .eq('user_id', userId)
      .order('ashby_created_at', { ascending: false, nullsFirst: false });

    if (cachedResult.error) {
      throw cachedResult.error;
    }

    const cachedCandidates = cachedResult.data || [];
    
    // Check if we should auto-sync (if no candidates or last sync was > 1 hour ago)
    const shouldAutoSync = cachedCandidates.length === 0 || 
      cachedCandidates.some(c => {
        const lastSync = new Date(c.last_synced_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return lastSync < oneHourAgo;
      });

    let syncResults = null;
    
    if (shouldAutoSync && process.env.ASHBY_API_KEY) {
      console.log('🔄 Auto-syncing new Ashby candidates');
      syncResults = await syncNewCandidates(userId, supabase);
      
      // Refetch cached candidates after sync
      const updatedResult = await supabase
        .from('ashby_candidates')
        .select('*')
        .eq('user_id', userId)
        .order('ashby_created_at', { ascending: false, nullsFirst: false });
      
      if (!updatedResult.error) {
        cachedCandidates.splice(0, cachedCandidates.length, ...updatedResult.data);
      }
    }

    // Transform cached candidates to match frontend interface
    const candidates = cachedCandidates.map(candidate => ({
      ashby_id: candidate.ashby_id,
      name: candidate.name,
      email: candidate.email,
      linkedin_url: candidate.linkedin_url,
      has_resume: candidate.has_resume,
      resume_url: candidate.resume_url,
      created_at: candidate.ashby_created_at,
      tags: candidate.tags || [],
      unmask_applicant_id: candidate.unmask_applicant_id,
      unmask_status: candidate.unmask_applicant_id ? 'linked' : 'not_linked',
      action: candidate.unmask_applicant_id ? 'existing' : 'not_created',
      ready_for_processing: !!(candidate.linkedin_url || candidate.has_resume),
      fraud_likelihood: candidate.fraud_likelihood,
      fraud_reason: candidate.fraud_reason,
      last_synced_at: candidate.last_synced_at
    }));

    return NextResponse.json({
      success: true,
      candidates,
      cached_count: cachedCandidates.length,
      auto_synced: !!syncResults,
      sync_results: syncResults,
      last_sync: cachedCandidates.length > 0 ? Math.max(...cachedCandidates.map(c => new Date(c.last_synced_at).getTime())) : null
    });

  } catch (error) {
    console.error('Error fetching Ashby candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates', success: false },
      { status: 500 }
    );
  }
}

// POST - Force refresh all candidates from Ashby
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    // Get user ID
    const userResult = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }

    const userId = userResult.data.id;

    console.log('🔄 Force refreshing all Ashby candidates');
    
    // Perform full refresh
    const refreshResults = await refreshAllCandidates(userId, supabase);

    return NextResponse.json({
      success: true,
      message: 'Candidates refreshed successfully',
      ...refreshResults
    });

  } catch (error) {
    console.error('Error refreshing Ashby candidates:', error);
    return NextResponse.json(
      { error: 'Failed to refresh candidates', success: false },
      { status: 500 }
    );
  }
}

// Helper function to sync only new candidates
async function syncNewCandidates(userId: string, supabase: any) {
  const ashbyClient = new AshbyClient({
    apiKey: process.env.ASHBY_API_KEY!
  });

  // Get existing candidate IDs to avoid duplicates
  const existingResult = await supabase
    .from('ashby_candidates')
    .select('ashby_id')
    .eq('user_id', userId);

  const existingIds = new Set(existingResult.data?.map((c: any) => c.ashby_id) || []);

  // Fetch recent candidates from Ashby (last 50)
  const candidatesResponse = await ashbyClient.listCandidates({
    limit: 50,
    includeArchived: false
  });

  if (!candidatesResponse.success) {
    throw new Error(`Failed to fetch candidates: ${candidatesResponse.error?.message}`);
  }

  const allCandidates = candidatesResponse.results?.results || [];
  const newCandidates = allCandidates.filter(c => !existingIds.has(c.id));

  if (newCandidates.length === 0) {
    return { new_candidates: 0, message: 'No new candidates found' };
  }

  // Process and cache new candidates
  const insertData = [];
  for (const candidate of newCandidates) {
    if (process.env.ASHBY_DEBUG_LOG === 'true') {
      console.log('🆕 New Ashby candidate:', {
        id: candidate.id,
        name: candidate.name,
        linkedInUrl: candidate.linkedInUrl,
        resumeFileHandle: candidate.resumeFileHandle
      });
    }

    let resumeUrl = null;
    if (candidate.resumeFileHandle) {
      try {
        const resumeResponse = await ashbyClient.getResumeUrl(candidate.resumeFileHandle);
        if (resumeResponse.success) {
          resumeUrl = resumeResponse.results?.url;
        }
      } catch (error) {
        console.warn(`Failed to get resume URL for ${candidate.id}:`, error);
      }
    }

    insertData.push({
      user_id: userId,
      ashby_id: candidate.id,
      name: candidate.name || 'Unknown',
      email: candidate.email,
      linkedin_url: candidate.linkedInUrl,
      has_resume: !!candidate.resumeFileHandle,
      resume_file_handle: candidate.resumeFileHandle,
      resume_url: resumeUrl,
      tags: candidate.tags || [],
      custom_fields: candidate.customFields || {},
      ashby_created_at: candidate.createdAt,
      last_synced_at: new Date().toISOString()
    });
  }

  // Bulk insert new candidates
  const insertResult = await supabase
    .from('ashby_candidates')
    .insert(insertData);

  if (insertResult.error) {
    throw insertResult.error;
  }

  return {
    new_candidates: newCandidates.length,
    message: `Synced ${newCandidates.length} new candidates`
  };
}

// Helper function to refresh all candidates
async function refreshAllCandidates(userId: string, supabase: any) {
  const ashbyClient = new AshbyClient({
    apiKey: process.env.ASHBY_API_KEY!
  });

  let allCandidates: any[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  // Fetch all candidates with pagination
  while (hasMore) {
    const response = await ashbyClient.listCandidates({
      limit: 100,
      cursor,
      includeArchived: false
    });

    if (!response.success) {
      throw new Error(`Failed to fetch candidates: ${response.error?.message}`);
    }

    const candidates = response.results?.results || [];
    allCandidates.push(...candidates);

    cursor = response.results?.nextCursor;
    hasMore = response.results?.moreDataAvailable || false;
  }

  // Clear existing cache for this user
  await supabase
    .from('ashby_candidates')
    .delete()
    .eq('user_id', userId);

  // Process and insert all candidates
  const insertData = [];
  for (const candidate of allCandidates) {
    if (process.env.ASHBY_DEBUG_LOG === 'true') {
      console.log('🔄 Refreshing candidate:', {
        id: candidate.id,
        name: candidate.name,
        linkedInUrl: candidate.linkedInUrl,
        resumeFileHandle: candidate.resumeFileHandle
      });
    }

    let resumeUrl = null;
    if (candidate.resumeFileHandle) {
      try {
        const resumeResponse = await ashbyClient.getResumeUrl(candidate.resumeFileHandle);
        if (resumeResponse.success) {
          resumeUrl = resumeResponse.results?.url;
        }
      } catch (error) {
        console.warn(`Failed to get resume URL for ${candidate.id}:`, error);
      }
    }

    insertData.push({
      user_id: userId,
      ashby_id: candidate.id,
      name: candidate.name || 'Unknown',
      email: candidate.email,
      linkedin_url: candidate.linkedInUrl,
      has_resume: !!candidate.resumeFileHandle,
      resume_file_handle: candidate.resumeFileHandle,
      resume_url: resumeUrl,
      tags: candidate.tags || [],
      custom_fields: candidate.customFields || {},
      ashby_created_at: candidate.createdAt,
      last_synced_at: new Date().toISOString()
    });
  }

  // Bulk insert all candidates
  const insertResult = await supabase
    .from('ashby_candidates')
    .insert(insertData);

  if (insertResult.error) {
    throw insertResult.error;
  }

  return {
    total_candidates: allCandidates.length,
    refreshed_at: new Date().toISOString(),
    message: `Refreshed ${allCandidates.length} candidates`
  };
}