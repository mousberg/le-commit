-- Migration: Optimize bulk file processing
-- Prevents file processing overload during large candidate syncs

-- Add a flag to track bulk operations
CREATE TABLE IF NOT EXISTS bulk_sync_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_start TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  candidate_count INTEGER DEFAULT 0
);

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_bulk_sync_sessions_user_active 
ON bulk_sync_sessions(user_id, is_active) 
WHERE is_active = true;

-- Function to check if we're in a bulk sync session
CREATE OR REPLACE FUNCTION is_bulk_sync_active(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bulk_sync_sessions 
    WHERE user_id = target_user_id 
    AND is_active = true 
    AND session_start > NOW() - INTERVAL '10 minutes'
  );
END;
$$;

-- Modified trigger function for ashby_candidates file processing
-- Only process files if not in bulk sync mode
CREATE OR REPLACE FUNCTION trigger_ashby_file_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  http_result record;
  webhook_url text;
  in_bulk_sync boolean;
BEGIN
  -- Only trigger for INSERTs and UPDATEs where resume_file_handle is added
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.resume_file_handle IS DISTINCT FROM NEW.resume_file_handle) THEN
    
    -- Check if we have a resume file handle but no cv_file_id
    IF NEW.resume_file_handle IS NOT NULL AND NEW.cv_file_id IS NULL THEN
      
      -- Check if we're in a bulk sync session
      SELECT is_bulk_sync_active(NEW.user_id) INTO in_bulk_sync;
      
      -- Only process files immediately if not in bulk sync
      IF NOT in_bulk_sync THEN
        -- Get the webhook URL
        SELECT get_webhook_url() INTO webhook_url;
        
        -- Only proceed if we have a webhook URL
        IF webhook_url IS NOT NULL AND webhook_url != '' THEN
          BEGIN
            -- Make the HTTP request to download and process the file
            SELECT * INTO http_result FROM net.http_post(
              url => webhook_url || '/api/ashby/files',
              body => jsonb_build_object(
                'candidateId', NEW.ashby_id,
                'fileHandle', NEW.resume_file_handle,
                'userId', NEW.user_id,
                'mode', 'shared_file'
              ),
              headers => jsonb_build_object(
                'Content-Type', 'application/json'
              ),
              timeout_milliseconds => 30000
            );
            
            -- Log the result for debugging
            IF http_result.status_code != 200 THEN
              RAISE WARNING 'File processing webhook failed for candidate %: HTTP %', NEW.ashby_id, http_result.status_code;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the transaction
            RAISE WARNING 'File processing webhook error for candidate %: %', NEW.ashby_id, SQLERRM;
          END;
        END IF;
      ELSE
        -- In bulk sync mode - just log that we're deferring
        RAISE NOTICE 'Bulk sync active for user % - deferring file processing for candidate %', NEW.user_id, NEW.ashby_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to start a bulk sync session
CREATE OR REPLACE FUNCTION start_bulk_sync_session(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- End any existing active sessions for this user
  UPDATE bulk_sync_sessions 
  SET is_active = false 
  WHERE user_id = target_user_id AND is_active = true;
  
  -- Start new session
  INSERT INTO bulk_sync_sessions (user_id, is_active)
  VALUES (target_user_id, true)
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Function to end a bulk sync session
CREATE OR REPLACE FUNCTION end_bulk_sync_session(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE bulk_sync_sessions 
  SET is_active = false 
  WHERE user_id = target_user_id AND is_active = true;
END;
$$;

-- Function to process deferred files after bulk sync
CREATE OR REPLACE FUNCTION process_deferred_files(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  candidate_record record;
  processed_count integer := 0;
  webhook_url text;
  http_result record;
BEGIN
  -- Get webhook URL
  SELECT get_webhook_url() INTO webhook_url;
  
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RAISE WARNING 'No webhook URL configured for file processing';
    RETURN 0;
  END IF;
  
  -- Process candidates with resume_file_handle but no cv_file_id
  FOR candidate_record IN
    SELECT ashby_id, resume_file_handle, user_id
    FROM ashby_candidates
    WHERE user_id = target_user_id
    AND resume_file_handle IS NOT NULL
    AND cv_file_id IS NULL
    ORDER BY ashby_updated_at DESC
    LIMIT 50  -- Process in batches to avoid overwhelming the system
  LOOP
    BEGIN
      -- Make the HTTP request to download and process the file
      SELECT * INTO http_result FROM net.http_post(
        url => webhook_url || '/api/ashby/files',
        body => jsonb_build_object(
          'candidateId', candidate_record.ashby_id,
          'fileHandle', candidate_record.resume_file_handle,
          'userId', candidate_record.user_id,
          'mode', 'shared_file'
        ),
        headers => jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        timeout_milliseconds => 30000
      );
      
      IF http_result.status_code = 200 THEN
        processed_count := processed_count + 1;
      ELSE
        RAISE WARNING 'File processing failed for candidate %: HTTP %', candidate_record.ashby_id, http_result.status_code;
      END IF;
      
      -- Add small delay between requests to avoid overwhelming the API
      PERFORM pg_sleep(0.1);
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'File processing error for candidate %: %', candidate_record.ashby_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN processed_count;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS ashby_file_processing_trigger ON ashby_candidates;
CREATE TRIGGER ashby_file_processing_trigger
  AFTER INSERT OR UPDATE ON ashby_candidates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ashby_file_processing();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON bulk_sync_sessions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_bulk_sync_active(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION start_bulk_sync_session(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION end_bulk_sync_session(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_deferred_files(UUID) TO postgres, anon, authenticated, service_role;
