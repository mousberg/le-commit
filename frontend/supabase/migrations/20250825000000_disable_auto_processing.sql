-- Disable Auto-Processing Migration
-- Remove database triggers to make processing manual-only
-- Users will select candidates and manually trigger processing via existing endpoints

-- =============================================================================
-- DROP AUTO-PROCESSING TRIGGERS
-- =============================================================================

-- Drop existing auto-processing triggers
DROP TRIGGER IF EXISTS webhook_cv_trigger ON public.applicants;
DROP TRIGGER IF EXISTS webhook_linkedin_trigger ON public.applicants;
DROP TRIGGER IF EXISTS webhook_github_trigger ON public.applicants;
DROP TRIGGER IF EXISTS webhook_ai_trigger ON public.applicants;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Add comment documenting the change
COMMENT ON SCHEMA public IS 'Auto-processing disabled. Processing now manual-only via UI selection using existing /api endpoints.';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-processing triggers disabled';
  RAISE NOTICE '🎯 Processing is now manual-only via UI selection';
  RAISE NOTICE '🔄 Existing endpoints remain: /api/cv-process, /api/linkedin-fetch, /api/github-fetch, /api/analysis';
  RAISE NOTICE '👤 Users select candidates and click "Process Selected" to trigger processing';
END $$;
