-- Webhook Queue System - Unified Migration
-- Complete webhook system with priority-based queue processing and simplified architecture
-- Combines: priority queue enhancement + always-queue simplification + removed HTTP logging calls
-- Removed external HTTP logging dependencies for better performance and reliability

-- Add priority field to webhook queue for score-based prioritization
ALTER TABLE public.webhook_queue 
ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

-- Add index for priority-based processing (higher priority first)
CREATE INDEX IF NOT EXISTS idx_webhook_queue_priority_scheduled 
ON public.webhook_queue(priority DESC, scheduled_for ASC) 
WHERE status IN ('pending', 'failed');

-- Simplified webhook trigger that ALWAYS queues webhooks (no direct HTTP calls)
-- This removes dual execution paths and ensures consistent processing
CREATE OR REPLACE FUNCTION trigger_ashby_webhook_on_score() 
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload jsonb;
  webhook_priority INTEGER;
BEGIN
  -- Trigger webhook for ANY score update (not just threshold crossing)
  -- Skip if score hasn't actually changed
  IF NEW.score IS NOT NULL AND (OLD IS NULL OR OLD.score IS NULL OR NEW.score != COALESCE(OLD.score, 0)) THEN
    
    -- Calculate priority based on score (higher scores = higher priority)
    -- Priority scale: 0-100 where higher scores get higher priority
    webhook_priority := LEAST(NEW.score, 100);
    
    -- Prepare webhook payload with consistent field naming (only applicantId)
    webhook_payload := jsonb_build_object(
      'type', 'SCORE_PUSH',
      'applicantId', NEW.id,  -- Only camelCase for consistency
      'score', NEW.score,
      'trigger_reason', CASE 
        WHEN NEW.score >= 30 THEN 'auto_analysis_eligible'
        ELSE 'score_sync'
      END
    );
    
    -- Always queue webhook (let queue processor handle rate limiting)
    INSERT INTO public.webhook_queue (
      user_id, applicant_id, webhook_type, payload, priority, scheduled_for
    ) VALUES (
      NEW.user_id, NEW.id, 'score_push', webhook_payload, webhook_priority,
      NOW()  -- Schedule immediately, queue processor handles rate limiting
    );
    
    -- Use database logging instead of HTTP call for better performance
    RAISE NOTICE 'Webhook queued: applicant % (score: %, priority: %) - always_queue_system', 
                 NEW.id, NEW.score, webhook_priority;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON COLUMN public.webhook_queue.priority IS 'Priority for webhook processing (higher values processed first, based on applicant score)';
COMMENT ON INDEX idx_webhook_queue_priority_scheduled IS 'Index for priority-based webhook queue processing (higher priority first, then by schedule)';
COMMENT ON FUNCTION trigger_ashby_webhook_on_score() IS 'Simplified webhook trigger that always queues webhooks for priority-based processing. Uses single execution path for reliability and consistent field naming. Removed HTTP logging calls for better performance and reliability.';