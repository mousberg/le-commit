// Webhook Queue Processor - Process queued webhooks for reliable delivery
// POST: Process pending webhooks from the queue (intended for cron/scheduled jobs)

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface WebhookQueueItem {
  id: string;
  user_id: string;
  applicant_id: string;
  webhook_type: 'score_push' | 'note_push';
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  priority: number;
  scheduled_for: string;
  created_at: string;
  updated_at: string;
  last_error: string | null;
  completed_at: string | null;
}

interface ProcessingResult {
  id: string;
  success: boolean;
  webhook_type: string;
  applicant_id: string;
  priority?: number;
  error?: string;
  isRateLimit?: boolean;
  attempts?: number;
  maxAttempts?: number;
  finalFailure?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret for cron job authentication
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.WEBHOOK_SECRET || 'webhook-secret-dev';
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();
    
    // Get pending webhooks that are scheduled to run, ordered by priority (higher first), then by schedule
    // Note: We filter attempts < max_attempts in app logic since Supabase client doesn't support column-to-column comparison
    const { data: allPendingWebhooks, error: fetchError } = await supabase
      .from('webhook_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false }) // Higher priority first
      .order('scheduled_for', { ascending: true }) // Then by scheduled time
      .limit(20) // Get more to filter in app logic
      .returns<WebhookQueueItem[]>();
    
    // Filter webhooks where attempts < max_attempts
    const pendingWebhooks = allPendingWebhooks?.filter(webhook => 
      webhook.attempts < webhook.max_attempts
    ).slice(0, 10); // Process up to 10 at a time
    
    if (fetchError) {
      console.error('Error fetching webhook queue:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch webhook queue', success: false },
        { status: 500 }
      );
    }

    if (!pendingWebhooks || pendingWebhooks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending webhooks to process',
        processed: 0,
        succeeded: 0,
        failed: 0
      });
    }

    if (pendingWebhooks.length > 0) {
      console.log(`📤 Processing ${pendingWebhooks.length} queued webhooks (priority-ordered):`);
      pendingWebhooks.forEach((webhook, index) => {
        const payload = webhook.payload as { applicantId?: string; score?: number };
        const applicantId = payload?.applicantId;
        const score = payload?.score || 'unknown';
        console.log(`   ${index + 1}. applicant ${applicantId} (priority: ${webhook.priority}, score: ${score}, type: ${webhook.webhook_type})`);
      });
    } else {
      console.log(`📤 Processing ${pendingWebhooks.length} queued webhooks (priority-ordered)`);
    }
    const results: ProcessingResult[] = [];
    
    // Process each webhook
    for (const webhook of pendingWebhooks) {
      try {
        // Mark as processing and increment attempts
        await supabase
          .from('webhook_queue')
          .update({ 
            status: 'processing', 
            updated_at: new Date().toISOString(),
            attempts: webhook.attempts + 1 
          })
          .eq('id', webhook.id);

        // Determine endpoint based on webhook type
        const endpoint = webhook.webhook_type === 'score_push' 
          ? '/api/ashby/push-score'
          : '/api/ashby/push-note';

        // Transform webhook payload to match user API format
        let transformedPayload: Record<string, unknown>;
        
        if (webhook.webhook_type === 'score_push') {
          // Extract applicantId from webhook payload and format for push-score endpoint
          const { applicantId } = webhook.payload as { applicantId?: string };
          if (!applicantId) {
            throw new Error('Missing applicantId in score_push webhook payload');
          }
          // Include user_id for service role authentication
          transformedPayload = { applicantId, userId: webhook.user_id };
        } else if (webhook.webhook_type === 'note_push') {
          // Extract fields needed for push-note endpoint
          const { applicantId, note, sendNotifications = false } = webhook.payload as { 
            applicantId?: string; 
            note?: string; 
            sendNotifications?: boolean 
          };
          if (!applicantId) {
            throw new Error('Missing applicantId in note_push webhook payload');
          }
          transformedPayload = { applicantId, note, sendNotifications };
        } else {
          throw new Error(`Unsupported webhook type: ${webhook.webhook_type}`);
        }

        // Get service role token for queue processor authentication
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
          throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
        }

        // Log the transformed payload for debugging
        console.log(`🔄 Queue → ${endpoint}:`, {
          webhookId: webhook.id,
          originalPayload: webhook.payload,
          transformedPayload,
          type: webhook.webhook_type
        });

        // Make webhook request with service role authentication
        const webhookResponse = await fetch(`http://localhost:3000${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}` // Service role auth for queue processor
          },
          body: JSON.stringify(transformedPayload)
        });

        const responseData = await webhookResponse.json();

        if (webhookResponse.ok && responseData.success) {
          // Success: mark as completed
          await supabase
            .from('webhook_queue')
            .update({ 
              status: 'completed', 
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', webhook.id);

          results.push({
            id: webhook.id,
            success: true,
            webhook_type: webhook.webhook_type,
            applicant_id: webhook.applicant_id,
            priority: webhook.priority
          });
          
        } else {
          // Failure: update error and potentially reschedule
          const isRateLimit = responseData.isRateLimit || webhookResponse.status === 503;
          const nextSchedule = isRateLimit 
            ? new Date(Date.now() + 5 * 60 * 1000) // Rate limit: retry in 5 minutes
            : new Date(Date.now() + Math.pow(2, webhook.attempts) * 60 * 1000); // Exponential backoff

          const newStatus = webhook.attempts + 1 >= webhook.max_attempts ? 'failed' : 'pending';
          
          await supabase
            .from('webhook_queue')
            .update({ 
              status: newStatus,
              last_error: responseData.error || `HTTP ${webhookResponse.status}`,
              scheduled_for: newStatus === 'pending' ? nextSchedule.toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', webhook.id);

          results.push({
            id: webhook.id,
            success: false,
            webhook_type: webhook.webhook_type,
            applicant_id: webhook.applicant_id,
            priority: webhook.priority,
            error: responseData.error,
            isRateLimit,
            attempts: webhook.attempts + 1,
            maxAttempts: webhook.max_attempts,
            finalFailure: webhook.attempts + 1 >= webhook.max_attempts
          });
        }

      } catch (error) {
        // Processing error: mark as failed or reschedule
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const newStatus = webhook.attempts + 1 >= webhook.max_attempts ? 'failed' : 'pending';
        const nextSchedule = new Date(Date.now() + Math.pow(2, webhook.attempts) * 60 * 1000);

        await supabase
          .from('webhook_queue')
          .update({ 
            status: newStatus,
            last_error: errorMessage,
            scheduled_for: newStatus === 'pending' ? nextSchedule.toISOString() : null,
            updated_at: new Date().toISOString(),
            attempts: webhook.attempts + 1
          })
          .eq('id', webhook.id);

        results.push({
          id: webhook.id,
          success: false,
          webhook_type: webhook.webhook_type,
          applicant_id: webhook.applicant_id,
          priority: webhook.priority,
          error: errorMessage,
          attempts: webhook.attempts + 1,
          finalFailure: webhook.attempts + 1 >= webhook.max_attempts
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const finalFailures = results.filter(r => r.finalFailure).length;

    console.log(`📤 Webhook queue processing completed: ${successCount} succeeded, ${failureCount} failed (${finalFailures} final failures)`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} webhooks: ${successCount} succeeded, ${failureCount} failed`,
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      finalFailures,
      results
    });

  } catch (error) {
    console.error('Error processing webhook queue:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process webhook queue', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}