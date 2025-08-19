-- =============================================================================
-- Edit History Tracking and Automatic Ashby Sync
-- =============================================================================
-- This migration implements the manual score and note push feature by:
-- - Adding edit_history field for tracking all score and note changes
-- - Converting score from generated column to regular integer field
-- - Creating database triggers for automatic Ashby synchronization
-- - Maintaining complete audit trail with source attribution
-- =============================================================================

-- =============================================================================
-- ADD EDIT HISTORY FIELD AND NOTES COLUMN
-- =============================================================================

-- Add edit_history field for tracking all score and note changes
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]';

-- Add notes column for manual assessment notes (if not exists from previous migrations)
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_applicants_edit_history ON public.applicants USING gin (edit_history);

-- =============================================================================
-- CONVERT SCORE FROM GENERATED COLUMN TO REGULAR INTEGER FIELD
-- =============================================================================

-- Convert score from generated column to regular integer field
-- This allows direct updates to the score field
ALTER TABLE public.applicants ALTER COLUMN score DROP EXPRESSION IF EXISTS;
ALTER TABLE public.applicants ALTER COLUMN score TYPE INTEGER;
ALTER TABLE public.applicants ALTER COLUMN score SET DEFAULT NULL;

-- Populate score field with current AI scores where no manual override exists
UPDATE public.applicants 
SET score = (ai_data->>'score')::integer 
WHERE score IS NULL 
  AND ai_data->>'score' IS NOT NULL 
  AND (ai_data->>'score')::integer BETWEEN 0 AND 100;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to get current score source from edit_history
CREATE OR REPLACE FUNCTION public.get_score_source(edit_hist jsonb)
RETURNS text AS $$
DECLARE
  latest_score jsonb;
BEGIN
  -- Get the most recent score entry from edit_history
  SELECT entry INTO latest_score
  FROM jsonb_array_elements(edit_hist) AS entry
  WHERE entry->>'type' = 'score'
  ORDER BY (entry->>'date')::timestamp DESC
  LIMIT 1;
  
  RETURN COALESCE(latest_score->>'source', 'unknown');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- ASHBY SYNC TRIGGER FUNCTION
-- =============================================================================

-- Enhanced trigger function to handle automatic Ashby sync
CREATE OR REPLACE FUNCTION public.handle_score_note_sync()
RETURNS TRIGGER AS $$
DECLARE
  score_changed boolean := false;
  note_changed boolean := false;
BEGIN
  -- Check if score changed
  IF OLD.score IS DISTINCT FROM NEW.score THEN
    score_changed := true;
    
    -- Trigger score sync webhook to original endpoint with webhook header
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/ashby/push-score',
      body => jsonb_build_object(
        'applicantId', NEW.id
      ),
      headers => jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-source', 'database-trigger'
      )
    );
    
    RAISE NOTICE 'Score sync webhook triggered for applicant % (new score: %)', NEW.id, NEW.score;
  END IF;
  
  -- Check if notes changed
  IF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    note_changed := true;
    
    -- Trigger note sync webhook to original endpoint with webhook header
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/ashby/push-note',
      body => jsonb_build_object(
        'applicantId', NEW.id,
        'note', NEW.notes
      ),
      headers => jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-source', 'database-trigger'
      )
    );
    
    RAISE NOTICE 'Note sync webhook triggered for applicant % (note length: %)', NEW.id, length(NEW.notes);
  END IF;
  
  IF score_changed OR note_changed THEN
    RAISE NOTICE 'Ashby sync webhooks triggered for applicant % (score: %, note: %)', 
                 NEW.id, score_changed, note_changed;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

-- Create new trigger for automatic Ashby sync
CREATE TRIGGER trigger_ashby_sync
  AFTER UPDATE ON public.applicants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_score_note_sync();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.applicants.edit_history IS 'JSONB array tracking all score and note changes with source attribution (manual/ai)';
COMMENT ON COLUMN public.applicants.score IS 'Direct integer field for scores (converted from generated column to allow manual updates)';
COMMENT ON COLUMN public.applicants.notes IS 'Manual assessment notes entered by recruiters';
COMMENT ON FUNCTION public.handle_score_note_sync() IS 'Automatically syncs score and note changes to Ashby via existing endpoints';
COMMENT ON FUNCTION public.get_score_source(jsonb) IS 'Utility function to determine source (manual/ai) of current score from edit_history';

-- =============================================================================
-- FIX ASHBY CANDIDATES UNIQUE CONSTRAINT
-- =============================================================================

-- Add unique constraint on unmask_applicant_id to enforce one-to-one relationship
-- Note: No duplicate cleanup needed since database was reset and constraint prevents future duplicates
ALTER TABLE public.ashby_candidates 
ADD CONSTRAINT unique_unmask_applicant_id 
UNIQUE (unmask_applicant_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_unmask_applicant_id ON public.ashby_candidates IS 'Ensures one-to-one relationship between applicants and ashby_candidates';
