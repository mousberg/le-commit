// Ashby Candidates API - List and sync candidates
// GET: List stored candidates from database
// POST: Force refresh candidates from Ashby API

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AshbyClient } from '@/lib/ashby/client';
import { getAshbyApiKey, isAshbyConfigured } from '@/lib/ashby/server';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { ATSCandidate, ATSPageData } from '@/lib/ashby/interfaces';
import { calculateApplicantScore } from '@/lib/scoring';
import { calculateBaseScore } from '@/lib/ashby/applicant-creation';

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
  base_score: number;
  cv_priority: 'immediate' | 'deferred';
}

interface SocialLink {
  type: string;
  url: string;
}

interface AshbyCandidate {
  id: string;
  name: string;
  primaryEmailAddress?: { value: string };
  primaryPhoneNumber?: { value: string };
  position?: string;
  company?: string;
  school?: string;
  location?: { locationSummary?: string };
  locationSummary?: string;
  createdAt: string;
  updatedAt: string;
  emailAddresses?: Array<Record<string, unknown>>;
  phoneNumbers?: Array<Record<string, unknown>>;
  socialLinks?: SocialLink[];
  tags?: string[];
  applicationIds?: string[];
  fileHandles?: Array<Record<string, unknown>>;
  resumeFileHandle?: Record<string, unknown>;
  source?: { title?: string };
  creditedToUser?: { firstName: string; lastName: string };
  timezone?: string;
  profileUrl?: string;
}

// Helper to transform Ashby API response to database format
function transformAshbyCandidate(ashbyCandidate: Record<string, unknown>, userId: string): DatabaseCandidate {
  const candidate = ashbyCandidate as unknown as AshbyCandidate;
  const socialLinks = candidate.socialLinks;

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

  // Try to extract position/company from source or tags if not directly available
  const extractPositionFromTags = () => {
    const tags = candidate.tags || [];
    const positionTag = tags.find(tag => 
      tag.toLowerCase().includes('position:') || 
      tag.toLowerCase().includes('role:') ||
      tag.toLowerCase().includes('title:')
    );
    return positionTag ? positionTag.split(':')[1]?.trim() : null;
  };

  const extractCompanyFromSource = () => {
    if (candidate.source?.title) {
      // Some sources might include company name
      const sourceTitle = candidate.source.title;
      if (sourceTitle.includes('Company:') || sourceTitle.includes('Employer:')) {
        return sourceTitle.split(':')[1]?.trim();
      }
    }
    return null;
  };

  const position = candidate.position || extractPositionFromTags() || null;
  const company = candidate.company || extractCompanyFromSource() || null;

  // Calculate base score for this candidate
  const baseScore = calculateBaseScore(
    getLinkedInUrl(),
    candidate.resumeFileHandle || null
  );

  // Determine CV processing priority based on score
  const shouldProcessCVImmediately = baseScore >= 30 && Boolean(candidate.resumeFileHandle);
  const cvPriority = shouldProcessCVImmediately ? 'immediate' : 'deferred';

  if (cvPriority === 'immediate') {
    console.log(`🚀 High priority candidate (score ${baseScore}): ${candidate.name} - CV will be processed immediately`);
  } else if (candidate.resumeFileHandle) {
    console.log(`⏳ Deferred candidate (score ${baseScore}): ${candidate.name} - CV stored for on-demand processing`);
  }

  return {
    user_id: userId,
    ashby_id: candidate.id,
    name: candidate.name,
    email: candidate.primaryEmailAddress?.value || null,
    phone: candidate.primaryPhoneNumber?.value || null,
    position,
    company,
    school: candidate.school || null,
    location_summary: candidate.location?.locationSummary || candidate.locationSummary || null,
    linkedin_url: getLinkedInUrl(),
    github_url: getGitHubUrl(),
    website_url: getWebsiteUrl(),
    ashby_created_at: candidate.createdAt,
    ashby_updated_at: candidate.updatedAt,
    emails: candidate.emailAddresses || [],
    phone_numbers: candidate.phoneNumbers || [],
    social_links: (socialLinks as unknown as Array<Record<string, unknown>>) || [],
    tags: candidate.tags || [],
    application_ids: candidate.applicationIds || [],
    all_file_handles: candidate.fileHandles || [],
    resume_file_handle: candidate.resumeFileHandle || null,
    source: candidate.source || null,
    source_title: candidate.source?.title || null,
    credited_to_user: candidate.creditedToUser || null,
    credited_to_name: candidate.creditedToUser ?
      `${candidate.creditedToUser.firstName} ${candidate.creditedToUser.lastName}` : null,
    timezone: candidate.timezone || null,
    profile_url: candidate.profileUrl || null,
    location_details: candidate.location || null,
    last_synced_at: new Date().toISOString(),
    base_score: baseScore,
    cv_priority: cvPriority
  };
}


// GET handler - List stored candidates
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
      // Perform auto-sync with pagination (limit to reasonable amount for auto-sync)
      const ashbyClient = new AshbyClient({ apiKey });
      const allCandidates: Array<Record<string, unknown>> = [];
      let cursor: string | undefined;
      let totalFetched = 0;
      let rateLimitDetected = false;
      const maxAutoSyncCandidates = 500; // Reasonable limit for auto-sync

      do {
        const response = await ashbyClient.listCandidates({
          limit: Math.min(100, maxAutoSyncCandidates - totalFetched), // Respect Ashby's 100 limit
          cursor,
          includeArchived: false
        });

        if (!response.success) {
          console.error('Auto-sync Ashby API error:', response.error);
          // Track if this was a rate limit error
          if (response.error?.code === 'RATE_LIMIT_EXCEEDED') {
            rateLimitDetected = true;
          }
          break; // Don't fail the whole request, just skip auto-sync
        }

        const results = response.results as unknown as Record<string, unknown>;
        const candidatesList = results.results;
        const moreDataAvailable = results.moreDataAvailable;
        const nextCursor = results.nextCursor;

        if (Array.isArray(candidatesList)) {
          allCandidates.push(...candidatesList);
          totalFetched += candidatesList.length;
        }

        cursor = moreDataAvailable && nextCursor && totalFetched < maxAutoSyncCandidates ? nextCursor as string : undefined;

        // Add inter-request delay to prevent rate limits
        if (cursor) {
          const delay = rateLimitDetected ? 2000 : 500; // 2s if rate limited, 500ms normal
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } while (cursor);

      if (allCandidates.length > 0) {
        // Upsert candidates
        const transformedCandidates = allCandidates.map(c =>
          transformAshbyCandidate(c, user.id)
        );

        const { error: upsertError } = await supabase
          .from('ashby_candidates')
          .upsert(transformedCandidates, {
            onConflict: 'user_id,ashby_id',
            ignoreDuplicates: false
          });

        if (!upsertError) {
          autoSynced = true;
          syncResults = {
            new_candidates: allCandidates.length,
            message: `Auto-synced ${allCandidates.length} candidates`
          };

          // Process high-priority CVs sequentially after successful sync
          const highPriorityCandidates = transformedCandidates.filter(c => c.cv_priority === 'immediate');
          
          if (highPriorityCandidates.length > 0) {
            console.log(`🚀 [AshbySync] Processing ${highPriorityCandidates.length} high-priority CVs sequentially after auto-sync`);
            
            let successCount = 0;
            let errorCount = 0;
            const startTime = Date.now();
            
            for (const candidate of highPriorityCandidates) {
              try {
                
                const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ashby/files`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    candidateId: candidate.ashby_id,
                    fileHandle: candidate.resume_file_handle,
                    userId: user.id,
                    mode: 'shared_file'
                  })
                });
                
                if (response.ok) {
                  successCount++;
                } else {
                  const errorResult = await response.json().catch(() => ({ error: 'Unknown error' }));
                  console.error(`❌ [AshbySync] ${candidate.name}: ${errorResult.error || 'Failed'} (${response.status})`);
                  errorCount++;
                }
              } catch (error) {
                console.error(`❌ [AshbySync] ${candidate.name}: ${error instanceof Error ? error.message : error}`);
                errorCount++;
              }
              
              // Small delay between requests (AshbyClient handles rate limiting)
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const totalDuration = Date.now() - startTime;
            console.log(`🎯 [AshbySync] Batch completed: ${successCount}/${highPriorityCandidates.length} successful (${Math.round(totalDuration/1000)}s)`);
          }
        }
      }
    }

    // Fetch applicants from Ashby source with their linked ashby_candidates data and analysis
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
          profile_url,
          cv_priority
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

      // Better position/company fallback logic
      const getPosition = () => {
        return ashbyData?.position || 
               applicant.cv_data?.jobTitle || 
               null;
      };

      const getCompany = () => {
        return ashbyData?.company || 
               (applicant.cv_data?.professionalExperiences?.[0]?.companyName) || 
               null;
      };

      // Create ATSCandidate format using applicant as base and ashby_candidates for additional data
      const frontendCandidate: ATSCandidate = {
        id: applicant.id,
        ashby_id: ashbyData?.ashby_id || '',
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        position: getPosition(),
        company: getCompany(),
        school: ashbyData?.school || null,
        location_summary: ashbyData?.location_summary || null,
        timezone: null,
        linkedin_url: applicant.linkedin_url,
        github_url: applicant.github_url,
        website_url: ashbyData?.website_url || null,
        resume_file_handle: ashbyData?.resume_file_handle || null,
        has_resume: !!(applicant.cv_file_id || ashbyData?.resume_file_handle || ashbyData?.resume_url),
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
        // Add analysis data from applicant
        analysis: applicant.ai_data,
        cv_file_id: applicant.cv_file_id,
        action: 'existing',
        ready_for_processing: !!(applicant.linkedin_url || applicant.cv_file_id || ashbyData?.resume_file_handle),
        // Include processing status fields from applicants table
        ai_status: applicant.ai_status,
        cv_status: applicant.cv_status,
        li_status: applicant.li_status,
        gh_status: applicant.gh_status,
        // Include processed data for dummy data detection
        li_data: applicant.li_data,
        cv_data: applicant.cv_data,
        gh_data: applicant.gh_data,
        // Include score and notes from applicants table
        score: applicant.score,
        notes: applicant.notes,
        // Include CV priority from ashby_candidates
        cv_priority: ashbyData?.cv_priority || 'deferred'
      };

      return frontendCandidate;
    });

    // Auto-calculate and update scores for candidates without scores
    const candidatesNeedingScores = transformedCandidates.filter(candidate => candidate.score === null);
    
    if (candidatesNeedingScores.length > 0) {
      console.log(`🔢 Auto-calculating scores for ${candidatesNeedingScores.length} candidates`);
      
      const scoreUpdates = [];
      for (const candidate of candidatesNeedingScores) {
        const calculatedScore = calculateApplicantScore(candidate.linkedin_url || null, candidate.resume_file_handle);
        
        scoreUpdates.push({
          id: candidate.id,
          score: calculatedScore
        });
        
        // Update the candidate object with the calculated score
        candidate.score = calculatedScore;
      }
      
      // Batch update scores in database with proper user context
      if (scoreUpdates.length > 0) {
        // Update each score individually to respect RLS policies
        const updatePromises = scoreUpdates.map(update => 
          supabase
            .from('applicants')
            .update({ score: update.score })
            .eq('id', update.id)
            .eq('user_id', user.id) // Ensure RLS compliance
        );
        
        const results = await Promise.allSettled(updatePromises);
        const failures = results.filter(r => r.status === 'rejected').length;
        
        if (failures > 0) {
          console.error(`Error updating ${failures}/${scoreUpdates.length} scores`);
        } else {
          console.log(`✅ Updated scores for ${scoreUpdates.length} candidates`);
        }
      }
    }

    const responseData: ATSPageData = {
      success: true,
      candidates: transformedCandidates,
      stored_count: transformedCandidates.length,
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
async function refreshCandidatesHandler(context: ApiHandlerContext) {
  const supabase = await createClient();

  try {
    // Extract limit from request body
    const body = context.body as { limit?: number } || {};
    const limit = Math.max(1, Math.min(1000, body.limit || 10)); // Default 10, max 1000
    
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
    let rateLimitDetected = false;
    const maxCandidates = limit; // Use configurable limit

    do {
      const response = await ashbyClient.listCandidates({
        limit: Math.min(100, limit - totalFetched), // Batch size, but don't exceed remaining limit
        cursor,
        includeArchived: false
      });

      if (!response.success) {
        console.error('Ashby API error:', response.error);
        // Track if this was a rate limit error
        if (response.error?.code === 'RATE_LIMIT_EXCEEDED') {
          rateLimitDetected = true;
        }
        return NextResponse.json(
          {
            error: response.error?.message || 'Failed to fetch from Ashby',
            success: false
          },
          { status: 500 }
        );
      }

      const results = response.results as unknown as Record<string, unknown>;
      const candidatesList = results.results;
      const moreDataAvailable = results.moreDataAvailable;
      const nextCursor = results.nextCursor;

      console.log(`📄 Ashby API page: fetched ${Array.isArray(candidatesList) ? candidatesList.length : 0} candidates, moreDataAvailable: ${moreDataAvailable}, nextCursor: ${nextCursor ? 'present' : 'none'}`);

      if (Array.isArray(candidatesList)) {
        allCandidates.push(...candidatesList);
        totalFetched += candidatesList.length;
      } else {
        console.warn('⚠️  Ashby API returned unexpected candidatesList format:', candidatesList);
      }

      cursor = moreDataAvailable && nextCursor && totalFetched < maxCandidates ? nextCursor as string : undefined;

      // Add inter-request delay to prevent rate limits
      if (cursor) {
        const delay = rateLimitDetected ? 2000 : 500; // 2s if rate limited, 500ms normal
        console.log(`⏱️  Pacing Ashby API requests: waiting ${delay}ms before next page`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } while (cursor);

    console.log(`✅ Manual refresh completed: ${allCandidates.length} candidates fetched from Ashby`);

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

      // Process high-priority CVs sequentially after successful manual sync
      const highPriorityCandidates = transformedCandidates.filter(c => c.cv_priority === 'immediate');
      
      if (highPriorityCandidates.length > 0) {
        console.log(`🚀 [AshbyManualSync] Processing ${highPriorityCandidates.length} high-priority CVs sequentially after manual sync`);
        
        let successCount = 0;
        let errorCount = 0;
        const startTime = Date.now();
        
        for (const candidate of highPriorityCandidates) {
          try {
            console.log(`📤 [AshbyManualSync] Processing CV for ${candidate.name} (${candidate.ashby_id})`);
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ashby/files`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                candidateId: candidate.ashby_id,
                fileHandle: candidate.resume_file_handle,
                userId: user.id,
                mode: 'shared_file'
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ [AshbyManualSync] CV processed for ${candidate.name}:`, {
                fileName: result.fileName,
                fileSize: result.fileSize,
                duration: result.duration
              });
              successCount++;
            } else {
              const errorResult = await response.json().catch(() => ({ error: 'Unknown error' }));
              console.error(`⚠️ [AshbyManualSync] CV processing failed for ${candidate.name}:`, {
                status: response.status,
                error: errorResult.error,
                step: errorResult.step,
                candidateId: candidate.ashby_id
              });
              errorCount++;
            }
          } catch (error) {
            console.error(`❌ [AshbyManualSync] CV processing error for ${candidate.name}:`, {
              candidateId: candidate.ashby_id,
              error: error instanceof Error ? error.message : error
            });
            errorCount++;
          }
          
          // Small delay between requests (AshbyClient handles rate limiting)
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const totalDuration = Date.now() - startTime;
        console.log(`🎯 [AshbyManualSync] Batch completed: ${successCount}/${highPriorityCandidates.length} successful (${Math.round(totalDuration/1000)}s)`);
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
