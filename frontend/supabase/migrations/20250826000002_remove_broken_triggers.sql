-- Remove Broken Database Triggers Migration
-- Remove pg_net triggers that don't work in local dev
-- Manual uploads now handle processing server-side directly

-- =============================================================================
-- REMOVE ALL DATABASE TRIGGERS
-- =============================================================================

-- Drop all webhook triggers
DROP TRIGGER IF EXISTS webhook_cv_trigger ON public.applicants;
DROP TRIGGER IF EXISTS webhook_ai_trigger ON public.applicants;
DROP TRIGGER IF EXISTS webhook_linkedin_trigger ON public.applicants;
DROP TRIGGER IF EXISTS webhook_github_trigger ON public.applicants;

-- Drop trigger functions
DROP FUNCTION IF EXISTS trigger_cv_processing();
DROP FUNCTION IF EXISTS trigger_ai_analysis();

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Update schema comment
COMMENT ON SCHEMA public IS 'Server-side processing only. Manual uploads trigger processing directly in API endpoints.';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '🗑️ All database triggers removed';
  RAISE NOTICE '⚡ Manual uploads now process server-side directly';
  RAISE NOTICE '🎯 ATS candidates still use manual "Process Selected" button';
  RAISE NOTICE '✅ No more pg_net dependency or trigger complexity';
END $$;
