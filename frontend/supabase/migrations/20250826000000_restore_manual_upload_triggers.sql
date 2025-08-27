-- Restore Manual Upload Triggers Migration
-- Re-enable triggers for manual CV uploads while keeping ATS auto-sync disabled
-- This allows manual CV uploads to work while maintaining manual control for ATS candidates

-- =============================================================================
-- RESTORE TRIGGERS FOR MANUAL CV UPLOADS
-- =============================================================================

-- Restore CV processing trigger for manual uploads
-- This triggers when cv_status changes to 'pending' AND cv_file_id is present
CREATE OR REPLACE FUNCTION trigger_cv_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if cv_status changed to 'pending' and we have a cv_file_id
  IF NEW.cv_status = 'pending' AND NEW.cv_file_id IS NOT NULL AND 
     (OLD.cv_status IS NULL OR OLD.cv_status != 'pending') THEN
    
    -- Call the webhook endpoint asynchronously
    PERFORM net.http_post(
      url := 'http://localhost:3000/api/cv-process',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'applicant_id', NEW.id,
        'file_id', NEW.cv_file_id
      )::text
    );
    
    RAISE NOTICE 'CV processing triggered for applicant %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for CV processing
DROP TRIGGER IF EXISTS webhook_cv_trigger ON public.applicants;
CREATE TRIGGER webhook_cv_trigger
  AFTER UPDATE ON public.applicants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cv_processing();

-- =============================================================================
-- RESTORE AI ANALYSIS TRIGGER FOR COMPLETED PROCESSING
-- =============================================================================

-- Restore AI analysis trigger when data sources become ready
-- This triggers when cv_status, li_status, or gh_status changes to 'ready'
CREATE OR REPLACE FUNCTION trigger_ai_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if ai_status is 'pending' and at least one source is ready
  IF NEW.ai_status = 'pending' AND (
    NEW.cv_status = 'ready' OR 
    NEW.li_status = 'ready' OR 
    NEW.gh_status = 'ready'
  ) AND (
    OLD.cv_status != 'ready' OR 
    OLD.li_status != 'ready' OR 
    OLD.gh_status != 'ready' OR
    OLD.ai_status != 'pending'
  ) THEN
    
    -- Call the analysis endpoint asynchronously
    PERFORM net.http_post(
      url := 'http://localhost:3000/api/analysis',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'applicant_id', NEW.id
      )::text
    );
    
    RAISE NOTICE 'AI analysis triggered for applicant %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for AI analysis
DROP TRIGGER IF EXISTS webhook_ai_trigger ON public.applicants;
CREATE TRIGGER webhook_ai_trigger
  AFTER UPDATE ON public.applicants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ai_analysis();

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Update schema comment
COMMENT ON SCHEMA public IS 'Manual upload triggers enabled. ATS auto-sync disabled. Manual processing via UI selection available.';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Manual upload triggers restored';
  RAISE NOTICE '🎯 CV uploads now trigger automatic processing';
  RAISE NOTICE '🤖 AI analysis triggers when data sources are ready';
  RAISE NOTICE '🚫 ATS auto-sync remains disabled (manual control only)';
  RAISE NOTICE '👤 Users can still manually process via "Process Selected" button';
END $$;
