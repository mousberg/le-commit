// Webhook Queue Processor with Intelligent Bundling
// POST: Process pending webhooks from the queue with bundling support for AI-generated content

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
  bundled?: boolean;
}

// Process bundled webhooks (score + note for same applicant)
async function processBundledWebhooks(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  applicantId: string,
  scoreWebhook: WebhookQueueItem,
  noteWebhook: WebhookQueueItem
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  try {
    // Mark both as processing
    await Promise.all([
      supabase
        .from('webhook_queue')
        .update({ 
          status: 'processing', 
          updated_at: new Date().toISOString(),
          attempts: scoreWebhook.attempts + 1 
        })
        .eq('id', scoreWebhook.id),
      supabase
        .from('webhook_queue')
        .update({ 
          status: 'processing', 
          updated_at: new Date().toISOString(),
          attempts: noteWebhook.attempts + 1 
        })
        .eq('id', noteWebhook.id)
    ]);

    // Prepare payloads for both operations
    const scorePayload = {
      applicantId: (scoreWebhook.payload as { applicantId: string }).applicantId,
      userId: scoreWebhook.user_id
    };

    const notePayload = {
      applicantId: (noteWebhook.payload as { applicantId: string }).applicantId,
      note: (noteWebhook.payload as { note: string }).note,
      sendNotifications: (noteWebhook.payload as { sendNotifications?: boolean }).sendNotifications || false,
      userId: noteWebhook.user_id
    };

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    console.log(`📦 Processing bundled webhooks for applicant ${applicantId}: score + note`);

    // Process both operations in parallel
    const [scoreResult, noteResult] = await Promise.allSettled([
      fetch('http://localhost:3000/api/webhooks/push-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify(scorePayload)
      }).then(res => res.json()),
      
      fetch('http://localhost:3000/api/webhooks/push-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify(notePayload)
      }).then(res => res.json())
    ]);

    // Process score result
    const scoreSuccess = scoreResult.status === 'fulfilled' && scoreResult.value.success;
    if (scoreSuccess) {
      await supabase
        .from('webhook_queue')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', scoreWebhook.id);
    } else {
      const scoreError = scoreResult.status === 'rejected' 
        ? scoreResult.reason.message 
        : scoreResult.value.error;
      const newStatus = scoreWebhook.attempts + 1 >= scoreWebhook.max_attempts ? 'failed' : 'pending';
      
      await supabase
        .from('webhook_queue')
        .update({ 
          status: newStatus,
          last_error: scoreError,
          scheduled_for: newStatus === 'pending' 
            ? new Date(Date.now() + Math.pow(2, scoreWebhook.attempts) * 60 * 1000).toISOString() 
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', scoreWebhook.id);
    }

    // Process note result
    const noteSuccess = noteResult.status === 'fulfilled' && noteResult.value.success;
    if (noteSuccess) {
      await supabase
        .from('webhook_queue')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', noteWebhook.id);
    } else {
      const noteError = noteResult.status === 'rejected' 
        ? noteResult.reason.message 
        : noteResult.value.error;
      const newStatus = noteWebhook.attempts + 1 >= noteWebhook.max_attempts ? 'failed' : 'pending';
      
      await supabase
        .from('webhook_queue')
        .update({ 
          status: newStatus,
          last_error: noteError,
          scheduled_for: newStatus === 'pending' 
            ? new Date(Date.now() + Math.pow(2, noteWebhook.attempts) * 60 * 1000).toISOString() 
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteWebhook.id);
    }

    // Add results
    results.push(
      {
        id: scoreWebhook.id,
        success: scoreSuccess,
        webhook_type: scoreWebhook.webhook_type,
        applicant_id: scoreWebhook.applicant_id,
        priority: scoreWebhook.priority,
        bundled: true,
        error: scoreSuccess ? undefined : (scoreResult.status === 'rejected' 
          ? scoreResult.reason.message 
          : scoreResult.value.error),
        attempts: scoreWebhook.attempts + 1,
        finalFailure: !scoreSuccess && scoreWebhook.attempts + 1 >= scoreWebhook.max_attempts
      },
      {
        id: noteWebhook.id,
        success: noteSuccess,
        webhook_type: noteWebhook.webhook_type,
        applicant_id: noteWebhook.applicant_id,
        priority: noteWebhook.priority,
        bundled: true,
        error: noteSuccess ? undefined : (noteResult.status === 'rejected' 
          ? noteResult.reason.message 
          : noteResult.value.error),
        attempts: noteWebhook.attempts + 1,
        finalFailure: !noteSuccess && noteWebhook.attempts + 1 >= noteWebhook.max_attempts
      }
    );

    console.log(`📦 Bundled processing completed: score ${scoreSuccess ? '✅' : '❌'}, note ${noteSuccess ? '✅' : '❌'}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown bundling error';
    console.error(`❌ Bundled processing failed:`, error);

    // Mark both as failed
    await Promise.all([
      supabase
        .from('webhook_queue')
        .update({ 
          status: scoreWebhook.attempts + 1 >= scoreWebhook.max_attempts ? 'failed' : 'pending',
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
          attempts: scoreWebhook.attempts + 1
        })
        .eq('id', scoreWebhook.id),
      supabase
        .from('webhook_queue')
        .update({ 
          status: noteWebhook.attempts + 1 >= noteWebhook.max_attempts ? 'failed' : 'pending',
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
          attempts: noteWebhook.attempts + 1
        })
        .eq('id', noteWebhook.id)
    ]);

    results.push(
      {
        id: scoreWebhook.id,
        success: false,
        webhook_type: scoreWebhook.webhook_type,
        applicant_id: scoreWebhook.applicant_id,
        priority: scoreWebhook.priority,
        bundled: true,
        error: errorMessage,
        attempts: scoreWebhook.attempts + 1,
        finalFailure: scoreWebhook.attempts + 1 >= scoreWebhook.max_attempts
      },
      {
        id: noteWebhook.id,
        success: false,
        webhook_type: noteWebhook.webhook_type,
        applicant_id: noteWebhook.applicant_id,
        priority: noteWebhook.priority,
        bundled: true,
        error: errorMessage,
        attempts: noteWebhook.attempts + 1,
        finalFailure: noteWebhook.attempts + 1 >= noteWebhook.max_attempts
      }
    );
  }

  return results;
}

// Process individual webhook
async function processIndividualWebhook(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  webhook: WebhookQueueItem
): Promise<ProcessingResult> {
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
      ? '/api/webhooks/push-score'
      : '/api/webhooks/push-note';

    // Transform webhook payload to match API format
    let transformedPayload: Record<string, unknown>;
    
    if (webhook.webhook_type === 'score_push') {
      const { applicantId } = webhook.payload as { applicantId?: string };
      if (!applicantId) {
        throw new Error('Missing applicantId in score_push webhook payload');
      }
      transformedPayload = { applicantId, userId: webhook.user_id };
    } else if (webhook.webhook_type === 'note_push') {
      const { applicantId, note, sendNotifications = false } = webhook.payload as { 
        applicantId?: string; 
        note?: string; 
        sendNotifications?: boolean 
      };
      if (!applicantId) {
        throw new Error('Missing applicantId in note_push webhook payload');
      }
      transformedPayload = { applicantId, note, sendNotifications, userId: webhook.user_id };
    } else {
      throw new Error(`Unsupported webhook type: ${webhook.webhook_type}`);
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    // Make webhook request
    const webhookResponse = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
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

      return {
        id: webhook.id,
        success: true,
        webhook_type: webhook.webhook_type,
        applicant_id: webhook.applicant_id,
        priority: webhook.priority,
        bundled: false
      };
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

      return {
        id: webhook.id,
        success: false,
        webhook_type: webhook.webhook_type,
        applicant_id: webhook.applicant_id,
        priority: webhook.priority,
        bundled: false,
        error: responseData.error,
        isRateLimit,
        attempts: webhook.attempts + 1,
        maxAttempts: webhook.max_attempts,
        finalFailure: webhook.attempts + 1 >= webhook.max_attempts
      };
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

    return {
      id: webhook.id,
      success: false,
      webhook_type: webhook.webhook_type,
      applicant_id: webhook.applicant_id,
      priority: webhook.priority,
      bundled: false,
      error: errorMessage,
      attempts: webhook.attempts + 1,
      finalFailure: webhook.attempts + 1 >= webhook.max_attempts
    };
  }
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
        failed: 0,
        bundled: 0
      });
    }

    console.log(`📤 Processing ${pendingWebhooks.length} queued webhooks (priority-ordered with bundling):`);
    pendingWebhooks.forEach((webhook, index) => {
      const payload = webhook.payload as { applicantId?: string; score?: number; bundleable?: boolean };
      const applicantId = payload?.applicantId;
      const score = payload?.score || 'unknown';
      const bundleable = payload?.bundleable ? '🔗' : '';
      console.log(`   ${index + 1}. applicant ${applicantId} (priority: ${webhook.priority}, score: ${score}, type: ${webhook.webhook_type}) ${bundleable}`);
    });

    const results: ProcessingResult[] = [];
    
    // Group webhooks by applicant_id for bundling detection
    const bundleMap = new Map<string, WebhookQueueItem[]>();
    
    for (const webhook of pendingWebhooks) {
      const key = webhook.applicant_id;
      if (!bundleMap.has(key)) {
        bundleMap.set(key, []);
      }
      bundleMap.get(key)!.push(webhook);
    }
    
    console.log(`🔍 Bundling analysis: ${bundleMap.size} unique applicants, ${pendingWebhooks.length} total webhooks`);
    
    // Process each applicant's webhooks (individual or bundled)
    for (const [applicantId, applicantWebhooks] of bundleMap) {
      // Detect bundleable operations for the same applicant
      const bundleableScores = applicantWebhooks.filter(w => 
        w.webhook_type === 'score_push' && 
        (w.payload as { bundleable?: boolean })?.bundleable === true
      );
      const bundleableNotes = applicantWebhooks.filter(w => 
        w.webhook_type === 'note_push' && 
        (w.payload as { bundleable?: boolean })?.bundleable === true
      );
      
      // Process bundleable operations together if both exist
      if (bundleableScores.length > 0 && bundleableNotes.length > 0) {
        console.log(`📦 Bundling ${bundleableScores.length} score(s) + ${bundleableNotes.length} note(s) for applicant ${applicantId}`);
        
        const bundleResults = await processBundledWebhooks(
          supabase, 
          applicantId, 
          bundleableScores[0], // Take first bundleable score
          bundleableNotes[0]   // Take first bundleable note
        );
        results.push(...bundleResults);
        
        // Process remaining bundleable webhooks individually
        const remainingBundleable = [
          ...bundleableScores.slice(1),
          ...bundleableNotes.slice(1)
        ];
        for (const webhook of remainingBundleable) {
          const result = await processIndividualWebhook(supabase, webhook);
          results.push(result);
        }
      }
      
      // Process non-bundleable webhooks individually
      const nonBundleable = applicantWebhooks.filter(w => 
        !(w.payload as { bundleable?: boolean })?.bundleable
      );
      for (const webhook of nonBundleable) {
        if (!results.find(r => r.id === webhook.id)) { // Avoid double processing
          const result = await processIndividualWebhook(supabase, webhook);
          results.push(result);
        }
      }
      
      // Process remaining individual webhooks if no bundling occurred
      if (bundleableScores.length === 0 || bundleableNotes.length === 0) {
        const individualWebhooks = [...bundleableScores, ...bundleableNotes].filter(w =>
          !results.find(r => r.id === w.id)
        );
        for (const webhook of individualWebhooks) {
          const result = await processIndividualWebhook(supabase, webhook);
          results.push(result);
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const finalFailures = results.filter(r => r.finalFailure).length;
    const bundledCount = results.filter(r => r.bundled).length;

    console.log(`📤 Webhook queue processing completed: ${successCount} succeeded, ${failureCount} failed (${finalFailures} final failures), ${bundledCount} bundled`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} webhooks: ${successCount} succeeded, ${failureCount} failed, ${bundledCount} bundled`,
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      finalFailures,
      bundled: bundledCount,
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