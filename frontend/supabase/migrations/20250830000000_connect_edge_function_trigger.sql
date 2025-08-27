-- Migration: Connect database trigger to edge function
-- Replaces HTTP webhook with edge function call for file processing

-- Drop the old trigger first, then the function
DROP TRIGGER IF EXISTS ashby_file_processing_trigger ON ashby_candidates;
DROP FUNCTION IF EXISTS trigger_ashby_file_processing();

-- Create new simplified trigger function that calls edge function
CREATE OR REPLACE FUNCTION trigger_ashby_file_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_result jsonb;
  function_url text;
BEGIN
  -- Only trigger for INSERTs and UPDATEs where resume_file_handle is added
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.resume_file_handle IS DISTINCT FROM NEW.resume_file_handle) THEN
    
    -- Check if we have a resume file handle but no cv_file_id and status is pending
    IF NEW.resume_file_handle IS NOT NULL AND NEW.cv_file_id IS NULL AND NEW.file_processing_status = 'pending' THEN
      
      -- Get the function URL (local development vs production)
      SELECT CASE 
        WHEN current_setting('app.environment', true) = 'development' THEN 
          'http://127.0.0.1:54321/functions/v1/process-ashby-file'
        ELSE 
          'https://' || current_setting('app.supabase_project_ref', true) || '.supabase.co/functions/v1/process-ashby-file'
      END INTO function_url;
      
      -- If we can't determine the URL, use local development default
      IF function_url IS NULL THEN
        function_url := 'http://127.0.0.1:54321/functions/v1/process-ashby-file';
      END IF;
      
      BEGIN
        -- Invoke edge function using pg_net extension
        SELECT net.http_post(
          url => function_url,
          body => jsonb_build_object(
            'candidateId', NEW.ashby_id,
            'fileHandle', NEW.resume_file_handle,
            'userId', NEW.user_id,
            'mode', 'shared_file'
          ),
          headers => jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
          ),
          timeout_milliseconds => 30000
        ) INTO function_result;
        
        -- Log successful invocation
        RAISE NOTICE 'Edge function invoked successfully for candidate % (result: %)', NEW.ashby_id, function_result;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Edge function invocation failed for candidate %: %', NEW.ashby_id, SQLERRM;
        
        -- Update status to failed so we know there was an issue
        UPDATE ashby_candidates 
        SET file_processing_status = 'failed' 
        WHERE ashby_id = NEW.ashby_id AND user_id = NEW.user_id;
      END;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger (drop first to ensure clean state)
DROP TRIGGER IF EXISTS ashby_file_processing_trigger ON ashby_candidates;
CREATE TRIGGER ashby_file_processing_trigger
  AFTER INSERT OR UPDATE ON ashby_candidates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ashby_file_processing();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_ashby_file_processing() TO postgres, anon, authenticated, service_role;

-- Set up configuration for development environment
-- These settings help the trigger know which URLs to use
DO $$
BEGIN
  -- Set development environment flag
  PERFORM set_config('app.environment', 'development', false);
  
  -- Set service role key for function authentication
  -- In production, this would be set via environment variables
  PERFORM set_config('app.supabase_service_role_key', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU', 
    false);
    
  RAISE NOTICE '✅ Edge function trigger configured for development environment';
END $$;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '🔄 Replaced HTTP webhook trigger with edge function call';
  RAISE NOTICE '⚡ Edge function: process-ashby-file';
  RAISE NOTICE '🎯 Trigger fires when: resume_file_handle added and cv_file_id is null';
  RAISE NOTICE '📊 Status tracking: pending → processing → completed/failed';
  RAISE NOTICE '🌐 Local URL: http://127.0.0.1:54321/functions/v1/process-ashby-file';
  RAISE NOTICE '✅ Ready for end-to-end testing with real candidates';
END $$;
