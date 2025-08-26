-- Add cv_priority column to ashby_candidates table
-- This column determines whether CVs should be processed immediately (score 30+) or on-demand

ALTER TABLE ashby_candidates 
ADD COLUMN cv_priority TEXT CHECK (cv_priority IN ('immediate', 'deferred')) DEFAULT 'deferred';

-- Update existing records based on their base_score
UPDATE ashby_candidates 
SET cv_priority = CASE 
    WHEN base_score >= 30 AND resume_file_handle IS NOT NULL THEN 'immediate'
    ELSE 'deferred'
END;