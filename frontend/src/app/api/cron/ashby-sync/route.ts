// Cron job endpoint for daily Ashby sync
// This endpoint should be called daily by your cron service (e.g., Vercel Cron, GitHub Actions, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    
    // Get all users who have Ashby candidates cached
    const usersResult = await supabase
      .from('ashby_candidates')
      .select('user_id')
      .neq('user_id', null);

    if (usersResult.error) {
      throw usersResult.error;
    }

    const uniqueUserIds = [...new Set(usersResult.data?.map(row => row.user_id) || [])];
    
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with Ashby integration to sync',
        users_synced: 0
      });
    }

    const syncResults = [];
    
    // Sync candidates for each user
    for (const userId of uniqueUserIds) {
      try {
        // Call the consolidated sync endpoint for each user
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ashby/sync?force=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // We'd need to handle auth differently for system-level cron jobs
            // This is a simplified approach - in production you might want service-to-service auth
          }
        });

        const result = await syncResponse.json();
        
        syncResults.push({
          user_id: userId,
          success: result.success,
          candidates_synced: result.sync_results?.new_candidates || 0,
          error: result.success ? null : result.error
        });

      } catch (error) {
        syncResults.push({
          user_id: userId,
          success: false,
          error: error instanceof Error ? error.message : 'Sync failed'
        });
      }
    }

    const successfulSyncs = syncResults.filter(r => r.success);
    const totalCandidatesSynced = successfulSyncs.reduce((sum, r) => sum + (r.candidates_synced || 0), 0);

    // Log the results
    console.log(`🕐 Daily Ashby sync completed:`, {
      users_processed: uniqueUserIds.length,
      successful_syncs: successfulSyncs.length,
      total_candidates_synced: totalCandidatesSynced,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Daily sync completed for ${uniqueUserIds.length} users`,
      users_processed: uniqueUserIds.length,
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