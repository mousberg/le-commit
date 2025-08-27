-- Fix HTTP Post Triggers Migration
-- Update trigger functions to use correct pg_net syntax for local Supabase

-- =============================================================================
-- DROP EXISTING BROKEN TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS webhook_cv_trigger ON public.applicants;
DROP TRIGGER IF EXISTS webhook_ai_trigger ON public.applicants;
DROP FUNCTION IF EXISTS trigger_cv_processing();
DROP FUNCTION IF EXISTS trigger_ai_analysis();

-- =============================================================================
-- CREATE CORRECTED TRIGGER FUNCTIONS
-- =============================================================================

-- CV processing trigger with correct pg_net syntax
CREATE OR REPLACE FUNCTION trigger_cv_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if cv_status changed to 'pending' and we have a cv_file_id
  IF NEW.cv_status = 'pending' AND NEW.cv_file_id IS NOT NULL AND 
     (OLD.cv_status IS NULL OR OLD.cv_status != 'pending') THEN
    
    -- Call the webhook endpoint using pg_net
    SELECT net.http_post(
      'http://host.docker.internal:3000/api/cv-process',
      json_build_object(
        'applicant_id', NEW.id,
        'file_id', NEW.cv_file_id
      )::text,
      'application/json'::text
    );
    
    RAISE NOTICE 'CV processing triggered for applicant %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AI analysis trigger with correct pg_net syntax  
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
    
    -- Call the analysis endpoint using pg_net
    SELECT net.http_post(
      'http://host.docker.internal:3000/api/analysis',
      json_build_object(
        'applicant_id', NEW.id
      )::text,
      'application/json'::text
    );
    
    RAISE NOTICE 'AI analysis triggered for applicant %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE TRIGGERS WITH CORRECTED FUNCTIONS
-- =============================================================================

-- Create the CV processing trigger
CREATE TRIGGER webhook_cv_trigger
  AFTER UPDATE ON public.applicants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cv_processing();

-- Create the AI analysis trigger
CREATE TRIGGER webhook_ai_trigger
  AFTER UPDATE ON public.applicants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ai_analysis();

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '🔧 Fixed HTTP post triggers with correct pg_net syntax';
  RAISE NOTICE '🌐 Using host.docker.internal for Docker networking';
  RAISE NOTICE '✅ CV uploads should now trigger automatic processing';
  RAISE NOTICE '🤖 AI analysis should trigger when data sources ready';
END $$;
