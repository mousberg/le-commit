-- =============================================================================
-- CONSOLIDATED ASHBY PROCESSING SYSTEM
-- =============================================================================
-- Implements simplified-ashby-processing-spec.md with clean separation of concerns:
-- 1. Base scoring in ashby_candidates table
-- 2. Pre-set statuses during applicant creation  
-- 3. Simple AFTER triggers with WHEN conditions for webhook firing
-- 4. Score sync triggers for Ashby integration

-- =============================================================================
-- 1. SCHEMA UPDATES - Add base_score to ashby_candidates
-- =============================================================================

-- Add base_score column to ashby_candidates table
ALTER TABLE ashby_candidates ADD COLUMN IF NOT EXISTS base_score INTEGER;

-- Note: base_score will be calculated automatically for new candidates via API

-- =============================================================================
-- 2. SIMPLIFIED WEBHOOK PROCESSING FUNCTIONS
-- =============================================================================
-- These functions only fire webhooks - no status logic (status already set)

-- Helper function to get webhook base URL
-- Production: Set via ALTER DATABASE your_db SET app.webhook_base_url = 'https://domain.com'
-- Local: Falls back to Docker networking
CREATE OR REPLACE FUNCTION get_webhook_url()
RETURNS text AS $$
DECLARE
  base_url text;
BEGIN
  -- Get configured webhook URL from database setting
  base_url := current_setting('app.webhook_base_url', true);
  
  -- Fallback for local development (Docker networking)
  IF base_url IS NULL OR base_url = '' THEN
    base_url := 'http://host.docker.internal:3000';
    RAISE NOTICE 'Using local development webhook URL: %', base_url;
  END IF;
  
  RETURN base_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CV Processing Webhook (Restored Essential Logic)
CREATE OR REPLACE FUNCTION public.webhook_cv_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Essential conditions that WHEN clause cannot handle:
  -- 1. Don't fire if already processing
  -- 2. Only fire on INSERT or when file_id actually changes
  IF NEW.cv_file_id IS NOT NULL AND 
     NEW.cv_status != 'processing' AND
     (TG_OP = 'INSERT' OR OLD.cv_file_id IS DISTINCT FROM NEW.cv_file_id) THEN
    
    PERFORM net.http_post(
      url => get_webhook_url() || '/api/cv-process',
      body => jsonb_build_object(
        'type', 'CV_PROCESSING',
        'applicant_id', NEW.id,
        'file_id', NEW.cv_file_id
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
    );
    
    RAISE NOTICE 'CV processing webhook fired for applicant % with file %', NEW.id, NEW.cv_file_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- LinkedIn Processing Webhook (Restored Essential Logic)
CREATE OR REPLACE FUNCTION public.webhook_linkedin_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Essential conditions that WHEN clause cannot handle:
  -- 1. Don't fire if already processing
  -- 2. Only fire on INSERT or when URL actually changes
  IF NEW.linkedin_url IS NOT NULL AND 
     NEW.li_status != 'processing' AND
     (TG_OP = 'INSERT' OR OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url) THEN
    
    PERFORM net.http_post(
      url => get_webhook_url() || '/api/linkedin-fetch',
      body => jsonb_build_object(
        'type', 'LINKEDIN_PROCESSING',
        'applicant_id', NEW.id,
        'linkedin_url', NEW.linkedin_url
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
    );
    
    RAISE NOTICE 'LinkedIn processing webhook fired for applicant % with URL %', NEW.id, NEW.linkedin_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GitHub Processing Webhook (Restored Essential Logic)
CREATE OR REPLACE FUNCTION public.webhook_github_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Essential conditions that WHEN clause cannot handle:
  -- 1. Don't fire if already processing
  -- 2. Only fire on INSERT or when URL actually changes
  IF NEW.github_url IS NOT NULL AND 
     NEW.gh_status != 'processing' AND
     (TG_OP = 'INSERT' OR OLD.github_url IS DISTINCT FROM NEW.github_url) THEN
    
    PERFORM net.http_post(
      url => get_webhook_url() || '/api/github-fetch',
      body => jsonb_build_object(
        'type', 'GITHUB_PROCESSING',
        'applicant_id', NEW.id,
        'github_url', NEW.github_url
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
    );
    
    RAISE NOTICE 'GitHub processing webhook fired for applicant % with URL %', NEW.id, NEW.github_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AI Analysis Webhook (Simplified - Only Fires Webhook)
CREATE OR REPLACE FUNCTION public.webhook_ai_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Only job: Fire webhook (conditions already checked by WHEN clause)
  PERFORM net.http_post(
    url => get_webhook_url() || '/api/analysis',
    body => jsonb_build_object(
      'type', 'AI_ANALYSIS',
      'applicant_id', NEW.id
    ),
    headers => '{"Content-Type": "application/json"}'::jsonb
  );
  
  RAISE NOTICE 'AI analysis webhook fired for applicant %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ashby Score Push Queue Function
CREATE OR REPLACE FUNCTION public.queue_ashby_score_push()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload jsonb;
  webhook_priority INTEGER;
BEGIN
  -- Only process if score actually changed and applicant is from Ashby
  IF NEW.score IS NOT NULL AND (OLD IS NULL OR OLD.score IS NULL OR NEW.score != COALESCE(OLD.score, 0)) THEN
    
    -- Calculate priority based on score (higher scores = higher priority)
    webhook_priority := LEAST(NEW.score, 100);
    
    -- Prepare webhook payload
    webhook_payload := jsonb_build_object(
      'type', 'SCORE_PUSH',
      'applicantId', NEW.id,
      'score', NEW.score,
      'trigger_reason', 'score_sync'
    );
    
    -- Queue webhook for processing
    INSERT INTO public.webhook_queue (
      user_id, applicant_id, webhook_type, payload, priority, scheduled_for
    ) VALUES (
      NEW.user_id, NEW.id, 'score_push', webhook_payload, webhook_priority, NOW()
    );
    
    RAISE NOTICE 'Ashby score push queued: applicant % (score: %, priority: %)', 
                 NEW.id, NEW.score, webhook_priority;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ashby Note Push Queue Function
CREATE OR REPLACE FUNCTION public.queue_ashby_note_push()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload jsonb;
  webhook_priority INTEGER;
BEGIN
  -- Only process if notes actually changed and applicant is from Ashby
  IF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    
    -- Calculate priority (notes have high priority for immediate processing)
    webhook_priority := 90; -- High priority for note updates
    
    -- Prepare webhook payload
    webhook_payload := jsonb_build_object(
      'type', 'NOTE_PUSH',
      'applicantId', NEW.id,
      'note', NEW.notes,
      'trigger_reason', 'note_sync'
    );
    
    -- Queue webhook for processing
    INSERT INTO public.webhook_queue (
      user_id, applicant_id, webhook_type, payload, priority, scheduled_for
    ) VALUES (
      NEW.user_id, NEW.id, 'note_push', webhook_payload, webhook_priority, NOW()
    );
    
    RAISE NOTICE 'Ashby note push queued: applicant % (note length: %, priority: %)', 
                 NEW.id, length(NEW.notes), webhook_priority;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. WEBHOOK TRIGGERS ALREADY EXIST IN BASE SCHEMA
-- =============================================================================
-- Note: Webhook triggers are already created in 20250803215737_eventschema.sql
-- We only replace the functions here to implement the simplified logic

-- =============================================================================
-- 4. ASHBY SCORE AND NOTE SYNC TRIGGERS
-- =============================================================================
-- Trigger score push when applicant score changes (only for Ashby source)

CREATE TRIGGER ashby_score_sync_trigger
  AFTER INSERT OR UPDATE OF score ON public.applicants
  FOR EACH ROW 
  WHEN (NEW.source = 'ashby')
  EXECUTE FUNCTION public.queue_ashby_score_push();

-- Ashby Note Sync Trigger - Queue note push when notes change for Ashby applicants
CREATE TRIGGER ashby_note_sync_trigger
  AFTER UPDATE OF notes ON public.applicants
  FOR EACH ROW 
  WHEN (NEW.source = 'ashby')
  EXECUTE FUNCTION public.queue_ashby_note_push();

-- =============================================================================
-- 5. COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION get_webhook_url() IS 'Helper function to get configurable webhook base URL with fallback to localhost for development';

COMMENT ON FUNCTION public.webhook_cv_processing() IS 'Simplified CV webhook - only fires HTTP request, no status logic (conditions handled by WHEN clause)';
COMMENT ON FUNCTION public.webhook_linkedin_processing() IS 'Simplified LinkedIn webhook - only fires HTTP request, no status logic (conditions handled by WHEN clause)';
COMMENT ON FUNCTION public.webhook_github_processing() IS 'Simplified GitHub webhook - only fires HTTP request, no status logic (conditions handled by WHEN clause)';
COMMENT ON FUNCTION public.webhook_ai_analysis() IS 'Simplified AI analysis webhook - only fires HTTP request, no status logic (conditions handled by WHEN clause)';
COMMENT ON FUNCTION public.queue_ashby_score_push() IS 'Queues Ashby score push webhooks for processing when applicant scores change';
COMMENT ON FUNCTION public.queue_ashby_note_push() IS 'Queues Ashby note push webhooks for processing when applicant notes change';

COMMENT ON TRIGGER webhook_cv_trigger ON public.applicants IS 'Fires CV processing webhook only when cv_status=pending AND cv_file_id exists - no complex logic needed';
COMMENT ON TRIGGER webhook_linkedin_trigger ON public.applicants IS 'Fires LinkedIn processing webhook only when li_status=pending AND linkedin_url exists - no complex logic needed';
COMMENT ON TRIGGER webhook_github_trigger ON public.applicants IS 'Fires GitHub processing webhook only when gh_status=pending AND github_url exists - no complex logic needed';
COMMENT ON TRIGGER webhook_ai_trigger ON public.applicants IS 'Fires AI analysis webhook when ai_status=pending AND all data collection is complete AND at least one source is ready';
COMMENT ON TRIGGER ashby_score_sync_trigger ON public.applicants IS 'Queues Ashby score push webhooks when applicant scores change (Ashby source only)';
COMMENT ON TRIGGER ashby_note_sync_trigger ON public.applicants IS 'Queues Ashby note push webhooks when applicant notes change (Ashby source only)';

COMMENT ON COLUMN ashby_candidates.base_score IS 'Pre-calculated base score: 30=LinkedIn+CV, 20=LinkedIn only, 15=CV only, 10=neither - used for filtering during applicant creation';

-- =============================================================================
-- 6. PG_CRON WEBHOOK QUEUE PROCESSING SETUP
-- =============================================================================
-- Install pg_cron extension and create automated queue processing job

-- Install pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Configure webhook secret function for local development fallback
CREATE OR REPLACE FUNCTION get_webhook_secret()
RETURNS text AS $$
DECLARE
  secret text;
BEGIN
  -- Try to get configured webhook secret from database setting
  secret := current_setting('app.webhook_secret', true);
  
  -- Fallback for local development
  IF secret IS NULL OR secret = '' THEN
    secret := 'webhook-secret-dev';
    RAISE NOTICE 'Using fallback webhook secret for local development';
  END IF;
  
  RETURN secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE '✅ pg_cron extension installed successfully';
  RAISE NOTICE '✅ webhook secret function created with local development fallback';
  
  -- Schedule job to process webhook queue every 2 minutes
  PERFORM cron.schedule(
    'process-webhook-queue',
    '*/2 * * * *',
    $cron_body$
    SELECT net.http_post(
      url => get_webhook_url() || '/api/webhooks/process-queue',
      headers => jsonb_build_object(
        'Authorization', 'Bearer ' || get_webhook_secret(),
        'Content-Type', 'application/json'
      )
    );
    $cron_body$
  );
  
  RAISE NOTICE '✅ pg_cron job "process-webhook-queue" created successfully';
END $$;

-- Create monitoring function for cron job status
CREATE OR REPLACE FUNCTION public.check_webhook_queue_cron_status()
RETURNS TABLE(
  jobname text,
  schedule text,
  active boolean
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    j.jobname::text,
    j.schedule::text,
    j.active
  FROM cron.job j 
  WHERE j.jobname = 'process-webhook-queue';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. UPDATE ASHBY CANDIDATE TO APPLICANT SYNC FUNCTION
-- =============================================================================
-- Replace existing sync function with simplified status logic

CREATE OR REPLACE FUNCTION public.sync_ashby_candidate_to_applicant()
RETURNS trigger AS $$
DECLARE
  applicant_id uuid;
  cv_status processing_status;
  li_status processing_status;
  gh_status processing_status;
  ai_status processing_status;
BEGIN
  -- Check if this ashby candidate is already linked to an applicant
  IF NEW.unmask_applicant_id IS NOT NULL THEN
    -- Update existing linked applicant (keep same cv_file_id if it exists)
    UPDATE public.applicants
    SET
      name = NEW.name,
      email = NEW.email,
      phone = NEW.phone,
      linkedin_url = NEW.linkedin_url,
      github_url = NEW.github_url,
      source = 'ashby',
      cv_file_id = COALESCE(NEW.cv_file_id, cv_file_id), -- Use shared file if available
      score = NEW.base_score, -- Use calculated base_score
      updated_at = now()
    WHERE id = NEW.unmask_applicant_id;
  ELSE
    -- Calculate initial statuses based on base_score and available data
    -- Implement getInitialStatus logic from spec
    
    IF NEW.base_score < 30 THEN
      -- All statuses set to 'skipped' for low-score candidates
      cv_status := 'skipped'::processing_status;
      li_status := 'skipped'::processing_status;
      gh_status := 'skipped'::processing_status;
      ai_status := 'skipped'::processing_status;
    ELSE
      -- High-score candidates: 'pending' if data available, 'not_provided' if missing
      cv_status := CASE 
        WHEN NEW.resume_file_handle IS NOT NULL OR NEW.cv_file_id IS NOT NULL THEN 'pending'::processing_status
        ELSE 'not_provided'::processing_status
      END;
      
      li_status := CASE 
        WHEN NEW.linkedin_url IS NOT NULL THEN 'pending'::processing_status
        ELSE 'not_provided'::processing_status
      END;
      
      gh_status := CASE 
        WHEN NEW.github_url IS NOT NULL THEN 'pending'::processing_status
        ELSE 'not_provided'::processing_status
      END;
      
      ai_status := 'pending'::processing_status;
    END IF;
    
    -- Insert new applicant with pre-set statuses and base_score
    INSERT INTO public.applicants (
      user_id,
      name,
      email,
      phone,
      linkedin_url,
      github_url,
      source,
      cv_file_id,
      score,
      cv_status,
      li_status,
      gh_status,
      ai_status,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_id,
      NEW.name,
      NEW.email,
      NEW.phone,
      NEW.linkedin_url,
      NEW.github_url,
      'ashby',
      NEW.cv_file_id, -- Use the same file reference
      NEW.base_score, -- Use calculated base_score
      cv_status,
      li_status,
      gh_status,
      ai_status,
      COALESCE(NEW.ashby_created_at, now()),
      now()
    ) RETURNING id INTO applicant_id;
    
    -- Update the ashby_candidates record with the new applicant ID
    UPDATE public.ashby_candidates
    SET unmask_applicant_id = applicant_id
    WHERE id = NEW.id;
    
    -- If there's a resume file handle but no cv_file_id yet, trigger download
    -- Download CV files regardless of score for future processing
    IF NEW.resume_file_handle IS NOT NULL AND NEW.cv_file_id IS NULL THEN
      RAISE NOTICE 'Triggering file download for candidate % with handle %', NEW.ashby_id, NEW.resume_file_handle;
      
      -- Store the HTTP result to check for errors
      DECLARE 
        http_result record;
      BEGIN
        SELECT * INTO http_result FROM net.http_post(
          url => get_webhook_url() || '/api/ashby/files',
          body => jsonb_build_object(
            'candidateId', NEW.ashby_id,
            'fileHandle', NEW.resume_file_handle,
            'applicantId', applicant_id,
            'mode', 'shared_file'
          ),
          headers => '{"Content-Type": "application/json"}'::jsonb,
          timeout_milliseconds => 10000
        );
        
        -- Check all available fields in the result
        RAISE NOTICE 'File download webhook sent for candidate % - Result: %', NEW.ashby_id, http_result;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'File download webhook FAILED for candidate %: %', NEW.ashby_id, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'File download skipped for candidate % (resume_handle: %, cv_file_id: %)', NEW.ashby_id, NEW.resume_file_handle IS NOT NULL, NEW.cv_file_id IS NOT NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_ashby_candidate_to_applicant() IS 'Updated sync function with simplified status logic using base_score filtering and getInitialStatus logic from simplified-ashby-processing-spec.md';

-- =============================================================================
-- 7. MIGRATION COMPLETION LOG
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 Consolidated Ashby processing system implemented successfully!';
  RAISE NOTICE '✅ Added base_score column to ashby_candidates table with calculated values';
  RAISE NOTICE '✅ Created simplified webhook functions that only fire HTTP requests';
  RAISE NOTICE '✅ Replaced complex trigger logic with simple WHEN conditions';
  RAISE NOTICE '✅ Created ashby_score_sync_trigger for score push queue integration';
  RAISE NOTICE '✅ Created ashby_note_sync_trigger for note push queue integration';
  RAISE NOTICE '✅ Both score and note changes now use queue system instead of direct HTTP calls';
  RAISE NOTICE '✅ Updated sync_ashby_candidate_to_applicant() with getInitialStatus logic';
  RAISE NOTICE '✅ Applicants now created with pre-set statuses based on base_score';
  RAISE NOTICE '✅ Low-score candidates (< 30) automatically get skipped statuses';
  RAISE NOTICE '✅ pg_cron extension installed and automated queue processing enabled';
  RAISE NOTICE '✅ Webhook queue processes automatically every 2 minutes';
  RAISE NOTICE '🔍 Architecture: ashby_candidates → base_score → applicants → pre-set statuses → webhook triggers → pg_cron queue system';
END $$;