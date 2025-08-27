// Cron job endpoint for daily Ashby sync
// This endpoint should be called daily by your cron service (e.g., Vercel Cron, GitHub Actions, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AshbyClient } from '@/lib/ashby/client';
import { getAshbyApiKey, isAshbyConfigured } from '@/lib/ashby/server';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Note: Global Ashby configuration handled in utility function

    const supabase = await createClient();
    
    // Get all users with Ashby API keys configured or in development mode with global key
    const usersResult = await supabase
      .from('users')
      .select('id, ashby_api_key');

    if (usersResult.error) {
      throw usersResult.error;
    }

    const allUsers = usersResult.data || [];
    const usersWithAshby = allUsers.filter(user => isAshbyConfigured(user.ashby_api_key));
    
    if (usersWithAshby.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with Ashby integration configured',
        users_synced: 0
      });
    }

    const syncResults = [];
    
    // Sync candidates for each user
    for (const userData of usersWithAshby) {
      try {
        const apiKey = getAshbyApiKey(userData.ashby_api_key);
        
        if (!apiKey) {
          syncResults.push({
            user_id: userData.id,
            success: false,
            error: 'No API key configured'
          });
          continue;
        }
        
        const ashbyClient = new AshbyClient({
          apiKey: apiKey
        });

        // Fetch candidates from Ashby with pagination
        const cronSyncLimit = 500; // Reasonable limit for cron jobs
        const allCandidates: Array<any> = [];
        let cursor: string | undefined;
        let totalFetched = 0;
        const syncStartTime = Date.now();

        console.log(`[Ashby Cron Sync] Starting sync for user ${userData.id}, fetching up to ${cronSyncLimit} candidates`);

        do {
          const candidatesResponse = await ashbyClient.listCandidates({
            limit: Math.min(100, cronSyncLimit - totalFetched),
            cursor,
            includeArchived: false
          });

          if (!candidatesResponse.success) {
            console.error(`[Ashby Cron Sync] Failed to fetch batch for user ${userData.id}:`, candidatesResponse.error);
            break;
          }

          const results = candidatesResponse.results as any;
          const batch = results.results || results.candidates || [];
          const moreDataAvailable = results.moreDataAvailable;
          const nextCursor = results.nextCursor || results.cursor;

          if (Array.isArray(batch)) {
            allCandidates.push(...batch);
            totalFetched += batch.length;
            console.log(`[Ashby Cron Sync] User ${userData.id}: Fetched batch ${totalFetched}/${cronSyncLimit} candidates`);
          }

          cursor = moreDataAvailable && nextCursor && totalFetched < cronSyncLimit 
            ? nextCursor as string 
            : undefined;

        } while (cursor);

        if (totalFetched === 0 && allCandidates.length === 0) {
          syncResults.push({
            user_id: userData.id,
            success: false,
            error: 'No candidates fetched from Ashby'
          });
          continue;
        }

        const candidates = allCandidates;
        let syncedCount = 0;
        console.log(`[Ashby Cron Sync] User ${userData.id}: Processing ${candidates.length} candidates`);

        // Process candidates
        for (const candidate of candidates) {
          try {
            // Extract social links
            const linkedinUrl = candidate.socialLinks?.find(link => 
              link.type === 'LinkedIn' || link.url?.includes('linkedin.com')
            )?.url;
            
            const githubUrl = candidate.socialLinks?.find(link => 
              link.type === 'GitHub' || link.url?.includes('github.com')
            )?.url;

            // Upsert candidate
            const { error: upsertError } = await supabase
              .from('ashby_candidates')
              .upsert({
                user_id: userData.id,
                ashby_id: candidate.id,
                name: candidate.name || 'Unknown',
                email: candidate.primaryEmailAddress?.value || null,
                phone: candidate.primaryPhoneNumber?.value || null,
                linkedin_url: linkedinUrl || null,
                github_url: githubUrl || null,
                has_resume: !!candidate.resumeFileHandle,
                resume_file_handle: candidate.resumeFileHandle || null,
                ashby_created_at: candidate.createdAt ? new Date(candidate.createdAt).toISOString() : null,
                ashby_updated_at: candidate.updatedAt ? new Date(candidate.updatedAt).toISOString() : null,
                emails: candidate.emailAddresses || [],
                phone_numbers: candidate.phoneNumbers || [],
                social_links: candidate.socialLinks || [],
                tags: candidate.tags || [],
                application_ids: candidate.applicationIds || [],
                source: candidate.source || null,
                source_title: candidate.source?.title || null,
                last_synced_at: new Date().toISOString()
              }, {
                onConflict: 'ashby_id',
                ignoreDuplicates: false
              });

            if (!upsertError) {
              syncedCount++;
            }
          } catch (error) {
            console.error(`Error syncing candidate ${candidate.id}:`, error);
          }
        }
        
        syncResults.push({
          user_id: userData.id,
          success: true,
          candidates_synced: syncedCount,
          error: null
        });

      } catch (error) {
        syncResults.push({
          user_id: userData.id,
          success: false,
          error: error instanceof Error ? error.message : 'Sync failed'
        });
      }
    }

    const successfulSyncs = syncResults.filter(r => r.success);
    const totalCandidatesSynced = successfulSyncs.reduce((sum, r) => sum + (r.candidates_synced || 0), 0);

    // Log the results
    console.log(`🕐 Daily Ashby sync completed:`, {
      users_processed: usersWithAshby.length,
      successful_syncs: successfulSyncs.length,
      total_candidates_synced: totalCandidatesSynced,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Daily sync completed for ${usersWithAshby.length} users`,
      users_processed: usersWithAshby.length,
      successful_syncs: successfulSyncs.length,
      failed_syncs: syncResults.length - successfulSyncs.length,
      total_candidates_synced: totalCandidatesSynced,
      sync_results: syncResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in daily Ashby sync:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Daily sync failed', 
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}