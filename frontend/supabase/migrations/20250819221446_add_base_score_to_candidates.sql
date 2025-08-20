-- Update scoring system to use existing score field for tiered scoring
-- This supports the AI analysis filtering requirements using data completeness

-- Create index for efficient score-based filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_applicants_score ON applicants(score);

-- Update existing applicants with calculated scores based on data completeness (simplified)
-- Only update if score is currently NULL to preserve existing AI analysis scores
-- Use Ashby resume_file_handle for immediate scoring
UPDATE applicants 
SET score = CASE
  WHEN linkedin_url IS NOT NULL AND EXISTS (
    SELECT 1 FROM ashby_candidates ac 
    WHERE ac.unmask_applicant_id = applicants.id 
    AND ac.resume_file_handle IS NOT NULL
  ) THEN 30  -- Both LinkedIn URL + resume file handle
  WHEN linkedin_url IS NOT NULL THEN 20      -- LinkedIn URL only
  WHEN EXISTS (
    SELECT 1 FROM ashby_candidates ac 
    WHERE ac.unmask_applicant_id = applicants.id 
    AND ac.resume_file_handle IS NOT NULL
  ) THEN 15      -- Resume file handle only
  ELSE 10        -- Neither source
END
WHERE score IS NULL;

-- Simple webhook trigger function for Ashby integration (score >= 30)  
-- Only triggers when score reaches 30+ threshold for first time
-- Includes basic rate limiting to prevent API overload
CREATE OR REPLACE FUNCTION trigger_ashby_webhook_on_score() 
RETURNS TRIGGER AS $$
DECLARE
  recent_webhook_count INTEGER;
  user_webhook_count INTEGER;
BEGIN
  -- Only trigger webhook for applicants with score >= 30 when crossing threshold OR significant change
  IF NEW.score >= 30 AND (OLD IS NULL OR OLD.score IS NULL OR OLD.score < 30 OR ABS(NEW.score - COALESCE(OLD.score, 0)) >= 10) THEN
    
    -- Rate limiting based on research: 20 requests/minute limit discovered
    -- Conservative approach: 3 per 10 seconds, 18 per minute (90% of limit)
    SELECT COUNT(*) INTO recent_webhook_count
    FROM applicants 
    WHERE user_id = NEW.user_id 
    AND updated_at > (NOW() - INTERVAL '10 seconds')
    AND score >= 30;
    
    SELECT COUNT(*) INTO user_webhook_count
    FROM applicants 
    WHERE user_id = NEW.user_id 
    AND updated_at > (NOW() - INTERVAL '1 minute')
    AND score >= 30;
    
    -- Skip if approaching rate limits (3/10sec, 18/min based on 20/min Ashby limit)
    IF recent_webhook_count >= 3 OR user_webhook_count >= 18 THEN
      RAISE NOTICE 'Skipping webhook for applicant % due to rate limiting (recent: %/3, user: %/18)', NEW.id, recent_webhook_count, user_webhook_count;
      RETURN NEW;
    END IF;
    
    -- Fire webhook asynchronously for auto-analysis (with increased timeout)
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/ashby/push-score',
      body => jsonb_build_object(
        'type', 'SCORE_PUSH',
        'applicant_id', NEW.id,
        'applicantId', NEW.id,
        'score', NEW.score,
        'trigger_reason', 'auto_analysis_eligible'
      ),
      headers => jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-source', 'database-trigger'
      ),
      timeout_milliseconds => 30000  -- Increase timeout for rate-limited API
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic webhook on score threshold
DROP TRIGGER IF EXISTS applicants_webhook_trigger ON applicants;
CREATE TRIGGER applicants_webhook_trigger
  AFTER INSERT OR UPDATE OF score ON applicants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ashby_webhook_on_score();

-- Simplified webhook trigger function for Ashby integration (score >= 30)  
-- Rate limits webhooks and skips when limits exceeded (relies on AshbyClient retry logic)
CREATE OR REPLACE FUNCTION trigger_ashby_webhook_on_score() 
RETURNS TRIGGER AS $$
DECLARE
  recent_webhook_count INTEGER;
  user_webhook_count INTEGER;
BEGIN
  -- Only trigger webhook for applicants with score >= 30 when crossing threshold OR significant change
  IF NEW.score >= 30 AND (OLD IS NULL OR OLD.score IS NULL OR OLD.score < 30 OR ABS(NEW.score - COALESCE(OLD.score, 0)) >= 10) THEN
    
    -- Rate limiting check: 3 per 10 seconds, 18 per minute (90% of discovered 20/min Ashby limit)
    SELECT COUNT(*) INTO recent_webhook_count
    FROM applicants 
    WHERE user_id = NEW.user_id 
    AND updated_at > (NOW() - INTERVAL '10 seconds')
    AND score >= 30;
    
    SELECT COUNT(*) INTO user_webhook_count
    FROM applicants 
    WHERE user_id = NEW.user_id 
    AND updated_at > (NOW() - INTERVAL '1 minute')
    AND score >= 30;
    
    -- Only fire webhook if within rate limits
    IF recent_webhook_count < 3 AND user_webhook_count < 18 THEN
      -- Fire webhook immediately (AshbyClient handles retries and rate limit errors)
      PERFORM net.http_post(
        url => 'http://host.docker.internal:3000/api/ashby/push-score',
        body => jsonb_build_object(
          'type', 'SCORE_PUSH',
          'applicant_id', NEW.id,
          'applicantId', NEW.id,
          'score', NEW.score,
          'trigger_reason', 'auto_analysis_eligible'
        ),
        headers => jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-source', 'database-trigger'
        ),
        timeout_milliseconds => 30000
      );
    ELSE
      -- Rate limited: skip webhook (manual triggers available if urgent)
      RAISE NOTICE 'Webhook skipped for applicant % due to rate limiting (recent: %/3, user: %/18). Use manual trigger if urgent.', NEW.id, recent_webhook_count, user_webhook_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add documentation
COMMENT ON INDEX idx_applicants_score IS 'Index for efficient score-based filtering in ATS UI (data completeness + AI analysis)';
COMMENT ON FUNCTION trigger_ashby_webhook_on_score() IS 'Triggers automatic Ashby webhook with rate limiting (skips when limits exceeded)';