-- Fix Webhook URLs Migration
-- This migration updates all hardcoded webhook URLs to use current_setting() for environment-agnostic configuration
-- Eliminates host.docker.internal connectivity issues and enables proper production deployment

-- =============================================================================
-- UPDATE WEBHOOK FUNCTIONS TO USE CONFIGURABLE BASE URL
-- =============================================================================

-- CV Processing Webhook with Dynamic URL
CREATE OR REPLACE FUNCTION public.webhook_cv_processing()
RETURNS TRIGGER AS $$
DECLARE
  base_url text;
BEGIN
  -- Get webhook base URL from database setting with fallback
  base_url := current_setting('app.webhook_base_url', true);
  IF base_url IS NULL OR base_url = '' THEN
    base_url := 'http://localhost:3000';  -- Development fallback
  END IF;

  -- Only process if eligible (non-Ashby OR Ashby with score >= 30)
  IF (NEW.source != 'ashby' OR NEW.score >= 30) THEN
    -- Check if CV data is available and should be processed
    IF NEW.cv_file_id IS NOT NULL AND NEW.cv_status != 'processing' AND
       (TG_OP = 'INSERT' OR OLD.cv_file_id IS DISTINCT FROM NEW.cv_file_id) THEN

      -- Fire webhook asynchronously
      PERFORM net.http_post(
        url => base_url || '/api/cv-process',
        body => jsonb_build_object(
          'type', 'CV_PROCESSING',
          'applicant_id', NEW.id,
          'file_id', NEW.cv_file_id
        ),
        headers => '{"Content-Type": "application/json"}'::jsonb
      );

      RAISE NOTICE 'CV processing webhook triggered for applicant % with file % (URL: %)', NEW.id, NEW.cv_file_id, base_url;
    ELSIF NEW.cv_file_id IS NULL AND (TG_OP = 'INSERT' OR OLD.cv_status IS DISTINCT FROM NEW.cv_status) THEN
      -- Set status directly in the trigger without recursive update
      NEW.cv_status = 'not_provided';
    END IF;
  ELSIF NEW.source = 'ashby' AND NEW.score < 30 AND (TG_OP = 'INSERT' OR OLD.cv_status IS DISTINCT FROM NEW.cv_status) THEN
    -- Mark as skipped for low-scoring Ashby candidates (direct assignment)
    NEW.cv_status = 'skipped';
    RAISE NOTICE 'CV processing skipped for Ashby candidate % (score: %)', NEW.id, NEW.score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- LinkedIn Processing Webhook with Dynamic URL
CREATE OR REPLACE FUNCTION public.webhook_linkedin_processing()
RETURNS TRIGGER AS $$
DECLARE
  base_url text;
BEGIN
  -- Get webhook base URL from database setting with fallback
  base_url := current_setting('app.webhook_base_url', true);
  IF base_url IS NULL OR base_url = '' THEN
    base_url := 'http://localhost:3000';  -- Development fallback
  END IF;

  -- Only process if eligible (non-Ashby OR Ashby with score >= 30)
  IF (NEW.source != 'ashby' OR NEW.score >= 30) THEN
    -- Check if LinkedIn data is available and should be processed
    IF NEW.linkedin_url IS NOT NULL AND NEW.li_status != 'processing' AND
       (TG_OP = 'INSERT' OR OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url) THEN

      -- Fire webhook asynchronously
      PERFORM net.http_post(
        url => base_url || '/api/linkedin-fetch',
        body => jsonb_build_object(
          'type', 'LINKEDIN_PROCESSING',
          'applicant_id', NEW.id,
          'linkedin_url', NEW.linkedin_url
        ),
        headers => '{"Content-Type": "application/json"}'::jsonb
      );

      RAISE NOTICE 'LinkedIn processing webhook triggered for applicant % with URL % (URL: %)', NEW.id, NEW.linkedin_url, base_url;
    ELSIF NEW.linkedin_url IS NULL AND (TG_OP = 'INSERT' OR OLD.li_status IS DISTINCT FROM NEW.li_status) THEN
      -- Set status directly in the trigger without recursive update
      NEW.li_status = 'not_provided';
    END IF;
  ELSIF NEW.source = 'ashby' AND NEW.score < 30 AND (TG_OP = 'INSERT' OR OLD.li_status IS DISTINCT FROM NEW.li_status) THEN
    -- Mark as skipped for low-scoring Ashby candidates (direct assignment)
    NEW.li_status = 'skipped';
    RAISE NOTICE 'LinkedIn processing skipped for Ashby candidate % (score: %)', NEW.id, NEW.score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GitHub Processing Webhook with Dynamic URL
CREATE OR REPLACE FUNCTION public.webhook_github_processing()
RETURNS TRIGGER AS $$
DECLARE
  base_url text;
BEGIN
  -- Get webhook base URL from database setting with fallback
  base_url := current_setting('app.webhook_base_url', true);
  IF base_url IS NULL OR base_url = '' THEN
    base_url := 'http://localhost:3000';  -- Development fallback
  END IF;

  -- Only process if eligible (non-Ashby OR Ashby with score >= 30)
  IF (NEW.source != 'ashby' OR NEW.score >= 30) THEN
    -- Check if GitHub data is available and should be processed
    IF NEW.github_url IS NOT NULL AND NEW.gh_status != 'processing' AND
       (TG_OP = 'INSERT' OR OLD.github_url IS DISTINCT FROM NEW.github_url) THEN

      -- Fire webhook asynchronously
      PERFORM net.http_post(
        url => base_url || '/api/github-fetch',
        body => jsonb_build_object(
          'type', 'GITHUB_PROCESSING',
          'applicant_id', NEW.id,
          'github_url', NEW.github_url
        ),
        headers => '{"Content-Type": "application/json"}'::jsonb
      );

      RAISE NOTICE 'GitHub processing webhook triggered for applicant % with URL % (URL: %)', NEW.id, NEW.github_url, base_url;
    ELSIF NEW.github_url IS NULL AND (TG_OP = 'INSERT' OR OLD.gh_status IS DISTINCT FROM NEW.gh_status) THEN
      -- Set status directly in the trigger without recursive update
      NEW.gh_status = 'not_provided';
    END IF;
  ELSIF NEW.source = 'ashby' AND NEW.score < 30 AND (TG_OP = 'INSERT' OR OLD.gh_status IS DISTINCT FROM NEW.gh_status) THEN
    -- Mark as skipped for low-scoring Ashby candidates (direct assignment)
    NEW.gh_status = 'skipped';
    RAISE NOTICE 'GitHub processing skipped for Ashby candidate % (score: %)', NEW.id, NEW.score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AI Analysis Webhook with Dynamic URL
CREATE OR REPLACE FUNCTION public.webhook_ai_analysis()
RETURNS TRIGGER AS $$
DECLARE
  base_url text;
BEGIN
  -- Get webhook base URL from database setting with fallback
  base_url := current_setting('app.webhook_base_url', true);
  IF base_url IS NULL OR base_url = '' THEN
    base_url := 'http://localhost:3000';  -- Development fallback
  END IF;

  -- Only analyze if eligible (non-Ashby OR Ashby with score >= 30)
  IF (NEW.source != 'ashby' OR NEW.score >= 30) AND
     NEW.ai_status = 'pending' AND 
     -- All data collection statuses are in final states (not pending or processing)
     NEW.cv_status NOT IN ('pending', 'processing') AND 
     NEW.li_status NOT IN ('pending', 'processing') AND 
     NEW.gh_status NOT IN ('pending', 'processing') AND
     -- At least one data source is ready (has actual data to analyze)
     (NEW.cv_status = 'ready' OR NEW.li_status = 'ready' OR NEW.gh_status = 'ready')
  THEN

    -- Fire webhook asynchronously
    PERFORM net.http_post(
      url => base_url || '/api/analysis',
      body => jsonb_build_object(
        'type', 'AI_ANALYSIS',
        'applicant_id', NEW.id
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
    );

    RAISE NOTICE 'AI analysis webhook triggered for applicant % (URL: %)', NEW.id, base_url;
  ELSIF NEW.source = 'ashby' AND NEW.score < 30 AND NEW.ai_status = 'pending' THEN
    -- Mark AI as skipped for low-scoring Ashby candidates (direct assignment)
    NEW.ai_status = 'skipped';
    RAISE NOTICE 'AI analysis skipped for Ashby candidate % (score: %)', NEW.id, NEW.score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ashby Score Push Webhook with Dynamic URL
CREATE OR REPLACE FUNCTION trigger_ashby_webhook_on_score() 
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload jsonb;
  webhook_priority INTEGER;
  base_url text;
BEGIN
  -- Get webhook base URL from database setting with fallback
  base_url := current_setting('app.webhook_base_url', true);
  IF base_url IS NULL OR base_url = '' THEN
    base_url := 'http://localhost:3000';  -- Development fallback
  END IF;

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
    RAISE NOTICE 'Webhook queued: applicant % (score: %, priority: %) - always_queue_system (URL: %)', 
                 NEW.id, NEW.score, webhook_priority, base_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ashby Score and Note Sync Webhook with Dynamic URL  
CREATE OR REPLACE FUNCTION public.handle_score_note_sync()
RETURNS TRIGGER AS $$
DECLARE
  score_changed boolean := false;
  note_changed boolean := false;
  base_url text;
BEGIN
  -- Get webhook base URL from database setting with fallback
  base_url := current_setting('app.webhook_base_url', true);
  IF base_url IS NULL OR base_url = '' THEN
    base_url := 'http://localhost:3000';  -- Development fallback
  END IF;

  -- Check if score changed
  IF OLD.score IS DISTINCT FROM NEW.score THEN
    score_changed := true;
    
    -- Trigger score sync webhook to original endpoint with webhook header
    PERFORM net.http_post(
      url => base_url || '/api/ashby/push-score',
      body => jsonb_build_object(
        'applicantId', NEW.id
      ),
      headers => jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-source', 'database-trigger'
      )
    );
    
    RAISE NOTICE 'Score sync webhook triggered for applicant % (new score: %) (URL: %)', NEW.id, NEW.score, base_url;
  END IF;
  
  -- Check if notes changed
  IF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    note_changed := true;
    
    -- Trigger note sync webhook to original endpoint with webhook header
    PERFORM net.http_post(
      url => base_url || '/api/ashby/push-note',
      body => jsonb_build_object(
        'applicantId', NEW.id,
        'note', NEW.notes
      ),
      headers => jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-source', 'database-trigger'
      )
    );
    
    RAISE NOTICE 'Note sync webhook triggered for applicant % (note length: %) (URL: %)', NEW.id, length(NEW.notes), base_url;
  END IF;
  
  IF score_changed OR note_changed THEN
    RAISE NOTICE 'Ashby sync webhooks triggered for applicant % (score: %, note: %) (URL: %)', 
                 NEW.id, score_changed, note_changed, base_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SET DEFAULT WEBHOOK BASE URL FOR DEVELOPMENT
-- =============================================================================

-- Note: Database-level parameter setting requires superuser privileges
-- For production, set this manually: ALTER DATABASE your_db_name SET app.webhook_base_url = 'https://your-domain.com';
-- For development, the fallback 'http://localhost:3000' will be used automatically

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION public.webhook_cv_processing() IS 'CV processing webhook with configurable base URL using current_setting() - eliminates host.docker.internal issues';
COMMENT ON FUNCTION public.webhook_linkedin_processing() IS 'LinkedIn processing webhook with configurable base URL using current_setting() - eliminates host.docker.internal issues';
COMMENT ON FUNCTION public.webhook_github_processing() IS 'GitHub processing webhook with configurable base URL using current_setting() - eliminates host.docker.internal issues';
COMMENT ON FUNCTION public.webhook_ai_analysis() IS 'AI analysis webhook with configurable base URL using current_setting() - eliminates host.docker.internal issues';
COMMENT ON FUNCTION trigger_ashby_webhook_on_score() IS 'Ashby score webhook with configurable base URL using current_setting() - eliminates host.docker.internal issues';
COMMENT ON FUNCTION public.handle_score_note_sync() IS 'Ashby sync webhook with configurable base URL using current_setting() - eliminates host.docker.internal issues';

-- =============================================================================
-- MIGRATION COMPLETION LOG
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Webhook URL fix migration completed successfully. All webhooks now use configurable base URL.';
  RAISE NOTICE 'Current webhook base URL: %', current_setting('app.webhook_base_url', true);
  RAISE NOTICE 'This eliminates host.docker.internal connectivity issues and enables proper production deployment.';
  RAISE NOTICE 'To change webhook URL in production: ALTER DATABASE your_db_name SET app.webhook_base_url = ''https://your-domain.com'';';
END $$;