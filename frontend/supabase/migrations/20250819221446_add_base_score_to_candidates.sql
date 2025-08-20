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
CREATE OR REPLACE FUNCTION trigger_ashby_webhook_on_score() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger webhook for applicants with score >= 30 when crossing threshold
  IF NEW.score >= 30 AND (OLD IS NULL OR OLD.score IS NULL OR OLD.score < 30) THEN
    -- Fire webhook asynchronously for auto-analysis
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/ashby/push-score',
      body => jsonb_build_object(
        'type', 'SCORE_PUSH',
        'applicant_id', NEW.id,
        'score', NEW.score,
        'trigger_reason', 'auto_analysis_eligible'
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
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

-- Add documentation
COMMENT ON INDEX idx_applicants_score IS 'Index for efficient score-based filtering in ATS UI (data completeness + AI analysis)';
COMMENT ON FUNCTION trigger_ashby_webhook_on_score() IS 'Triggers automatic Ashby webhook when candidate reaches score >= 30 threshold';