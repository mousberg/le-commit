-- Add LinkedIn URL support to applicants table
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS original_linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_job_id TEXT,
ADD COLUMN IF NOT EXISTS linkedin_job_status TEXT CHECK (linkedin_job_status IN ('pending', 'running', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS linkedin_job_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linkedin_job_completed_at TIMESTAMPTZ;

-- Add helpful comments
COMMENT ON COLUMN applicants.original_linkedin_url IS 'LinkedIn profile URL provided by user';
COMMENT ON COLUMN applicants.linkedin_job_id IS 'BrightData snapshot job ID for LinkedIn processing';
COMMENT ON COLUMN applicants.linkedin_job_status IS 'Status of LinkedIn job processing';
COMMENT ON COLUMN applicants.linkedin_job_started_at IS 'When LinkedIn job was started';
COMMENT ON COLUMN applicants.linkedin_job_completed_at IS 'When LinkedIn job was completed';