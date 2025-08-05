// Ashby Candidates API - List and sync candidates
// GET: List cached candidates from database
// POST: Force refresh candidates from Ashby API

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AshbyClient } from '@/lib/ashby/client';
import { getAshbyApiKey, isAshbyConfigured } from '@/lib/ashby/server';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { ATSCandidate, ATSPageData } from '@/lib/ashby/interfaces';

interface DatabaseCandidate {
  user_id: string;
  ashby_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  company: string | null;
  school: string | null;
  location_summary: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  ashby_created_at: string;
  ashby_updated_at: string;
  emails: Array<Record<string, unknown>>;
  phone_numbers: Array<Record<string, unknown>>;
  social_links: Array<Record<string, unknown>>;
  tags: string[];
  application_ids: string[];
  all_file_handles: Array<Record<string, unknown>>;
  resume_file_handle: Record<string, unknown> | string | null;
  source: Record<string, unknown> | null;
  source_title: string | null;
  credited_to_user: Record<string, unknown> | null;
  credited_to_name: string | null;
  timezone: string | null;
  profile_url: string | null;
  location_details: Record<string, unknown> | null;
  last_synced_at: string;
}

interface SocialLink {
  type: string;
  url: string;
}

// Helper to transform Ashby API response to database format
function transformAshbyCandidate(ashbyCandidate: Record<string, unknown>, userId: string): DatabaseCandidate {
  const socialLinks = ashbyCandidate.socialLinks as SocialLink[] | undefined;
  
  const getLinkedInUrl = () => {
    const linkedInLink = socialLinks?.find((link) => 
      link.type?.toLowerCase() === 'linkedin'
    );
    return linkedInLink?.url || null;
  };

  const getGitHubUrl = () => {
    const githubLink = socialLinks?.find((link) => 
      link.type?.toLowerCase() === 'github'
    );
    return githubLink?.url || null;
  };

  const getWebsiteUrl = () => {
    const websiteLink = socialLinks?.find((link) => 
      link.type?.toLowerCase() === 'website' || link.type?.toLowerCase() === 'personal'
    );
    return websiteLink?.url || null;
  };

  return {
    user_id: userId,
    ashby_id: ashbyCandidate.id,
    name: ashbyCandidate.name,
    email: ashbyCandidate.primaryEmailAddress?.value || null,
    phone: ashbyCandidate.primaryPhoneNumber?.value || null,
    position: ashbyCandidate.position || null,
    company: ashbyCandidate.company || null,
    school: ashbyCandidate.school || null,
    location_summary: ashbyCandidate.location?.locationSummary || ashbyCandidate.locationSummary || null,
    linkedin_url: getLinkedInUrl(),
    github_url: getGitHubUrl(),
    website_url: getWebsiteUrl(),
    ashby_created_at: ashbyCandidate.createdAt,
    ashby_updated_at: ashbyCandidate.updatedAt,
    emails: ashbyCandidate.emailAddresses || [],
    phone_numbers: ashbyCandidate.phoneNumbers || [],
    social_links: ashbyCandidate.socialLinks || [],
    tags: ashbyCandidate.tags || [],
    application_ids: ashbyCandidate.applicationIds || [],
    all_file_handles: ashbyCandidate.fileHandles || [],
    resume_file_handle: ashbyCandidate.resumeFileHandle || null,
    source: ashbyCandidate.source || null,
    source_title: ashbyCandidate.source?.title || null,
    credited_to_user: ashbyCandidate.creditedToUser || null,
    credited_to_name: ashbyCandidate.creditedToUser ? 
      `${ashbyCandidate.creditedToUser.firstName} ${ashbyCandidate.creditedToUser.lastName}` : null,
    timezone: ashbyCandidate.timezone || null,
    profile_url: ashbyCandidate.profileUrl || null,
    location_details: ashbyCandidate.location || null,
    last_synced_at: new Date().toISOString()
  };
}


// GET handler - List cached candidates
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getCandidatesHandler(_context: ApiHandlerContext) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Get user's Ashby API key
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', success: false },
        { status: 500 }
      );
    }

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    
    if (!isAshbyConfigured(userData?.ashby_api_key)) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 400 }
      );
    }

    // Check if we should auto-sync (last sync > 1 hour ago)
    const { data: syncCheckData } = await supabase
      .from('ashby_candidates')
      .select('last_synced_at')
      .eq('user_id', user.id)
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single();

    let autoSynced = false;
    let syncResults = null;
    const lastSync = syncCheckData?.last_synced_at ? new Date(syncCheckData.last_synced_at).getTime() : null;
    
    const hourInMs = 60 * 60 * 1000;
    const shouldAutoSync = !lastSync || (Date.now() - lastSync) > hourInMs;

    if (shouldAutoSync && apiKey) {
      // Perform auto-sync
      const ashbyClient = new AshbyClient({ apiKey });
      const response = await ashbyClient.listCandidates({ 
        limit: 50,
        includeArchived: false 
      });

      if (response.success && response.results) {
        const candidates = response.results as Record<string, unknown>;
        const candidatesList = candidates.results || candidates;
        
        if (Array.isArray(candidatesList)) {
          // Upsert candidates
          const transformedCandidates = candidatesList.map(c => 
            transformAshbyCandidate(c, user.id)
          );

          const { error: upsertError } = await supabase
            .from('ashby_candidates')
            .upsert(transformedCandidates, {
              onConflict: 'user_id,ashby_id',
              ignoreDuplicates: false
            });
          
          console.log('Upserted:', upsertError);
            
          if (!upsertError) {
            autoSynced = true;
            syncResults = {
              new_candidates: candidatesList.length,
              message: `Auto-synced ${candidatesList.length} candidates`
            };
          }
        }
      }
    }

    // Fetch applicants from Ashby source with their linked ashby_candidates data
    const { data: candidates, error: candidatesError } = await supabase
      .from('applicants')
      .select(`
        *,
        ashby_candidates!ashby_candidates_unmask_applicant_id_fkey(
          ashby_id,
          name,
          email,
          phone,
          position,
          company,
          school,
          location_summary,
          linkedin_url,
          github_url,
          website_url,
          resume_file_handle,
          ashby_created_at,
          ashby_updated_at,
          tags,
          application_ids,
          source_title,
          credited_to_name,
          profile_url
        )
      `)
      .eq('user_id', user.id)
      .eq('source', 'ashby')
      .order('created_at', { ascending: false });

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return NextResponse.json(
        { error: 'Failed to fetch candidates', success: false },
        { status: 500 }
      );
    }

    // Transform applicants for frontend (now querying applicants, not ashby_candidates)
    const transformedCandidates = (candidates || []).map(applicant => {
      const ashbyData = applicant.ashby_candidates;
      
      // Create ATSCandidate format using applicant as base and ashby_candidates for additional data
      const frontendCandidate: ATSCandidate = {
        id: applicant.id,
        ashby_id: ashbyData?.ashby_id || '',
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        position: ashbyData?.position || null,
        company: ashbyData?.company || null,
        school: ashbyData?.school || null,
        location_summary: ashbyData?.location_summary || null,
        timezone: null,
        linkedin_url: applicant.linkedin_url,
        github_url: applicant.github_url,
        website_url: ashbyData?.website_url || null,
        resume_file_handle: ashbyData?.resume_file_handle || null,
        has_resume: !!(ashbyData?.resume_file_handle || ashbyData?.resume_url),
        emails: [],
        phone_numbers: [],
        social_links: [],
        tags: ashbyData?.tags || [],
        application_ids: ashbyData?.application_ids || [],
        all_file_handles: [],
        source: null,
        source_title: ashbyData?.source_title || null,
        credited_to_user: null,
        credited_to_name: ashbyData?.credited_to_name || null,
        profile_url: ashbyData?.profile_url || null,
        ashby_created_at: ashbyData?.ashby_created_at || applicant.created_at,
        ashby_updated_at: ashbyData?.ashby_updated_at || applicant.updated_at,
        created_at: applicant.created_at,
        updated_at: applicant.updated_at,
        last_synced_at: applicant.updated_at,
        unmask_applicant_id: applicant.id,
        unmask_status: applicant.status,
        action: 'existing',
        ready_for_processing: !!(applicant.linkedin_url || ashbyData?.resume_file_handle)
      };
      
      return frontendCandidate;
    });

    const responseData: ATSPageData = {
      success: true,
      candidates: transformedCandidates,
      cached_count: transformedCandidates.length,
      auto_synced: autoSynced,
      sync_results: syncResults,
      last_sync: lastSync
    } as ATSPageData & { success: boolean };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in getCandidates:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// POST handler - Force refresh from Ashby
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function refreshCandidatesHandler(_context: ApiHandlerContext) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Get user's Ashby API key
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', success: false },
        { status: 500 }
      );
    }

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ashby API key not configured', success: false },
        { status: 400 }
      );
    }

    // Initialize Ashby client
    const ashbyClient = new AshbyClient({ apiKey });
    
    // Fetch candidates from Ashby with pagination
    const allCandidates: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;
    let totalFetched = 0;
    const maxCandidates = 500; // Safety limit

    do {
      const response = await ashbyClient.listCandidates({
        limit: 100,
        cursor,
        includeArchived: false
      });

      if (!response.success) {
        console.error('Ashby API error:', response.error);
        return NextResponse.json(
          { 
            error: response.error?.message || 'Failed to fetch from Ashby', 
            success: false 
          },
          { status: 500 }
        );
      }

      const results = response.results as Record<string, unknown>;
      const candidatesList = results.results || results.candidates || results;
      const moreDataAvailable = results.moreDataAvailable;
      const nextCursor = results.nextCursor || results.cursor;
      
      if (Array.isArray(candidatesList)) {
        allCandidates.push(...candidatesList);
        totalFetched += candidatesList.length;
      }

      cursor = moreDataAvailable && nextCursor && totalFetched < maxCandidates ? nextCursor : undefined;

    } while (cursor);

    // Transform and upsert all candidates
    if (allCandidates.length > 0) {
      const transformedCandidates = allCandidates.map(candidate => 
        transformAshbyCandidate(candidate, user.id)
      );

      const { error: upsertError } = await supabase
        .from('ashby_candidates')
        .upsert(transformedCandidates, {
          onConflict: 'user_id,ashby_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error upserting candidates:', upsertError);
        return NextResponse.json(
          { error: 'Failed to save candidates', success: false },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${allCandidates.length} candidates from Ashby`,
      candidates_synced: allCandidates.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error refreshing candidates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh candidates', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export route handlers
export const GET = withApiMiddleware(getCandidatesHandler, {
  requireAuth: true,
  requireATSAccess: true, // Add ATS access check
  enableCors: true,
  enableLogging: true,
  rateLimit: { 
    maxRequests: 60,
    windowMs: 60000 // 1-minute window
  }
});

export const POST = withApiMiddleware(refreshCandidatesHandler, {
  requireAuth: true,
  requireATSAccess: true, // Add ATS access check
  enableCors: true,
  enableLogging: true,
  rateLimit: { 
    maxRequests: 10,
    windowMs: 60000 // 1-minute window
  }
});