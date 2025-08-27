-- Migration: Add file processing status tracking to ashby_candidates
-- Enables real-time progress monitoring for edge function file processing

-- Add status column to track file processing progress
ALTER TABLE ashby_candidates 
ADD COLUMN file_processing_status TEXT DEFAULT 'pending';

-- Add index for efficient status queries
CREATE INDEX idx_ashby_candidates_processing_status 
ON ashby_candidates(file_processing_status);

-- Add index for user + status queries (for progress monitoring)
CREATE INDEX idx_ashby_candidates_user_status 
ON ashby_candidates(user_id, file_processing_status);

-- Update existing records to have proper status
-- If cv_file_id exists, file was already processed
UPDATE ashby_candidates 
SET file_processing_status = CASE 
  WHEN cv_file_id IS NOT NULL THEN 'completed'
  WHEN resume_file_handle IS NOT NULL THEN 'pending'
  ELSE 'pending'
END;

-- Add constraint to ensure valid status values
ALTER TABLE ashby_candidates 
ADD CONSTRAINT chk_file_processing_status 
CHECK (file_processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add comment for documentation
COMMENT ON COLUMN ashby_candidates.file_processing_status IS 'File processing status: pending (not started), processing (in progress), completed (success), failed (error)';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Added file_processing_status column to ashby_candidates';
  RAISE NOTICE '📊 Created indexes for efficient status queries';
  RAISE NOTICE '🔄 Updated existing records with appropriate status';
  RAISE NOTICE '✅ Added constraint to validate status values';
  RAISE NOTICE '📝 Status values: pending, processing, completed, failed';
  RAISE NOTICE '🎯 Ready for edge function implementation';
END $$;
