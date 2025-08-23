-- Cleanup Webhook Queue System Migration
-- Remove auto-push webhook system since manual push is preferred
-- This migration removes the webhook queue table, triggers, and functions

-- =============================================================================
-- 1. DROP TRIGGERS FIRST (to avoid foreign key issues)
-- =============================================================================

-- Drop Ashby sync triggers
DROP TRIGGER IF EXISTS ashby_score_sync_trigger ON public.applicants;
DROP TRIGGER IF EXISTS ashby_note_sync_trigger ON public.applicants; 
DROP TRIGGER IF EXISTS trigger_ashby_sync ON public.applicants;

-- Drop other webhook triggers that may reference webhook_queue
DROP TRIGGER IF EXISTS webhook_applicant_score_trigger ON public.applicants;
DROP TRIGGER IF EXISTS trigger_ashby_webhook_on_score_update ON public.applicants;

-- =============================================================================
-- 2. DROP FUNCTIONS
-- =============================================================================

-- Drop Ashby queue functions
DROP FUNCTION IF EXISTS public.queue_ashby_score_push();
DROP FUNCTION IF EXISTS public.queue_ashby_note_push();

-- Drop main webhook trigger function
DROP FUNCTION IF EXISTS public.trigger_ashby_webhook_on_score();

-- Drop sync handling function
DROP FUNCTION IF EXISTS public.handle_score_note_sync();

-- =============================================================================
-- 3. DROP WEBHOOK QUEUE TABLE
-- =============================================================================

-- Drop the webhook_queue table (this was only used for auto-push)
DROP TABLE IF EXISTS public.webhook_queue;

-- =============================================================================
-- 4. CLEAN UP REFERENCES
-- =============================================================================

-- Remove any webhook-related columns from other tables if they exist
-- (checking for existence first to avoid errors)

-- Note: Keeping the score and notes columns in applicants table since 
-- they're still needed for manual operations

-- =============================================================================
-- 5. DOCUMENTATION
-- =============================================================================

-- Add comment documenting the cleanup
COMMENT ON SCHEMA public IS 'Webhook queue system removed in favor of manual push operations. Auto-push to Ashby is disabled.';

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Webhook queue system cleanup completed. Manual push system remains active.';
END $$;

-- =============================================================================
-- 6. REMOVE PG_CRON JOB
-- =============================================================================

-- Remove the scheduled cron job that calls the deleted endpoint
SELECT cron.unschedule('process-webhook-queue');

-- Remove the monitoring function for the cron job
DROP FUNCTION IF EXISTS public.check_webhook_queue_cron_status();

-- Update final notice
DO $$
BEGIN
  RAISE NOTICE '🗑️ pg_cron job "process-webhook-queue" removed successfully';
  RAISE NOTICE '✅ All webhook queue automation removed - manual push only';
END $$;
