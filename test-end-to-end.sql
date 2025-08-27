-- Test script for end-to-end edge function trigger flow
-- Run this in Supabase Studio to test the complete integration

-- First, check current state
SELECT 'Current ashby_candidates count:' as info, COUNT(*) as count FROM ashby_candidates;
SELECT 'Current status distribution:' as info, file_processing_status, COUNT(*) 
FROM ashby_candidates 
GROUP BY file_processing_status 
ORDER BY file_processing_status;

-- Create a test candidate to trigger the flow
-- Note: This will fail gracefully since we don't have real Ashby data, 
-- but it will test the trigger → edge function → status update flow

INSERT INTO ashby_candidates (
  user_id,
  ashby_id,
  name,
  email,
  resume_file_handle,
  file_processing_status,
  ashby_created_at,
  ashby_updated_at,
  last_synced_at,
  base_score
) VALUES (
  -- Use a valid UUID from your users table (replace with actual user ID)
  (SELECT id FROM users LIMIT 1),
  'test_candidate_' || extract(epoch from now())::text,
  'Test Edge Function Candidate',
  'test@example.com',
  jsonb_build_object('handle', 'test_file_handle_' || extract(epoch from now())::text),
  'pending',  -- This should trigger the edge function
  NOW(),
  NOW(),
  NOW(),
  30
);

-- Wait a moment for trigger to fire, then check the results
-- The edge function should:
-- 1. Update status to 'processing'
-- 2. Try to process the file (will fail with fake data)
-- 3. Update status to 'failed'

-- Check if the trigger fired and status was updated
SELECT 
  'Test results:' as info,
  name,
  ashby_id,
  file_processing_status,
  resume_file_handle,
  cv_file_id,
  updated_at
FROM ashby_candidates 
WHERE name = 'Test Edge Function Candidate'
ORDER BY updated_at DESC;

-- Clean up test data
-- DELETE FROM ashby_candidates WHERE name = 'Test Edge Function Candidate';
