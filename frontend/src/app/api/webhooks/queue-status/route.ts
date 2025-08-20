// Webhook Queue Status - Monitor queue health and statistics
// GET: Get queue status and health metrics (for monitoring and debugging)

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { withApiMiddleware } from '@/lib/middleware/apiWrapper';

async function getQueueStatusHandler() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get queue statistics
    const { data: queueStats, error: statsError } = await supabase
      .from('webhook_queue')
      .select('status, webhook_type, attempts, created_at, updated_at, last_error')
      .order('created_at', { ascending: false });

    if (statsError) {
      console.error('Error fetching queue stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch queue statistics', success: false },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total: queueStats?.length || 0,
      pending: queueStats?.filter(w => w.status === 'pending').length || 0,
      processing: queueStats?.filter(w => w.status === 'processing').length || 0,
      completed: queueStats?.filter(w => w.status === 'completed').length || 0,
      failed: queueStats?.filter(w => w.status === 'failed').length || 0,
      byType: {
        score_push: queueStats?.filter(w => w.webhook_type === 'score_push').length || 0,
        note_push: queueStats?.filter(w => w.webhook_type === 'note_push').length || 0,
      },
      avgAttempts: queueStats?.length > 0 
        ? queueStats.reduce((sum, w) => sum + w.attempts, 0) / queueStats.length 
        : 0,
      recentActivity: queueStats?.slice(0, 10) || [] // Last 10 webhooks
    };

    // Get failed webhooks requiring attention
    const { data: failedWebhooks, error: failedError } = await supabase
      .from('webhook_queue')
      .select('id, applicant_id, webhook_type, attempts, last_error, updated_at')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (failedError) {
      console.error('Error fetching failed webhooks:', failedError);
    }

    // Get overdue webhooks (scheduled but not processing)
    const { data: overdueWebhooks, error: overdueError } = await supabase
      .from('webhook_queue')
      .select('id, applicant_id, webhook_type, scheduled_for, attempts, last_error')
      .in('status', ['pending', 'failed'])
      .lt('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (overdueError) {
      console.error('Error fetching overdue webhooks:', overdueError);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      statistics: stats,
      health: {
        queueSize: stats.pending + stats.processing,
        isHealthy: stats.processing < 50 && stats.pending < 100, // Thresholds for health
        overdueCount: overdueWebhooks?.length || 0,
        failedCount: stats.failed
      },
      failedWebhooks: failedWebhooks || [],
      overdueWebhooks: overdueWebhooks || [],
      recommendations: generateRecommendations(stats, overdueWebhooks?.length || 0)
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get queue status', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(stats: {
  pending: number;
  failed: number;
  avgAttempts: number;
  processing: number;
}, overdueCount: number): string[] {
  const recommendations: string[] = [];
  
  if (stats.pending > 50) {
    recommendations.push('High number of pending webhooks - consider increasing processing frequency');
  }
  
  if (stats.failed > 10) {
    recommendations.push('Multiple failed webhooks detected - check Ashby API connectivity');
  }
  
  if (overdueCount > 5) {
    recommendations.push('Overdue webhooks found - ensure queue processor is running regularly');
  }
  
  if (stats.avgAttempts > 2) {
    recommendations.push('High average attempts - may indicate API rate limiting or connectivity issues');
  }
  
  if (stats.processing > 20) {
    recommendations.push('Many webhooks stuck in processing state - check for hanging requests');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Queue is healthy - no issues detected');
  }
  
  return recommendations;
}

// Export with middleware for authentication
export const GET = withApiMiddleware(getQueueStatusHandler, {
  requireAuth: true,
  enableCors: true,
  enableLogging: true,
  rateLimit: {
    maxRequests: 30,
    windowMs: 60000 // 1 minute window
  }
});