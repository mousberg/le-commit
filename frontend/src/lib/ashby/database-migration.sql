-- Ashby Integration Database Schema Updates for Unmask

-- Add Ashby-related columns to applicants table
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS ashby_candidate_id TEXT,
ADD COLUMN IF NOT EXISTS ashby_application_id TEXT,
ADD COLUMN IF NOT EXISTS ashby_sync_status TEXT DEFAULT 'pending' CHECK (ashby_sync_status IN ('pending', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS ashby_last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ashby_sync_error TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Create index for Ashby candidate lookups
CREATE INDEX IF NOT EXISTS idx_applicants_ashby_candidate_id ON applicants(ashby_candidate_id);
CREATE INDEX IF NOT EXISTS idx_applicants_ashby_sync_status ON applicants(ashby_sync_status);
CREATE INDEX IF NOT EXISTS idx_applicants_priority ON applicants(priority);

-- Create Ashby sync log table for tracking sync history
CREATE TABLE IF NOT EXISTS ashby_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    ashby_candidate_id TEXT NOT NULL,
    sync_action TEXT NOT NULL, -- 'sync_results', 'sync_status', 'sync_flags'
    sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'failed')),
    sync_error TEXT,
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for sync log lookups
CREATE INDEX IF NOT EXISTS idx_ashby_sync_logs_applicant_id ON ashby_sync_logs(applicant_id);
CREATE INDEX IF NOT EXISTS idx_ashby_sync_logs_ashby_candidate_id ON ashby_sync_logs(ashby_candidate_id);
CREATE INDEX IF NOT EXISTS idx_ashby_sync_logs_created_at ON ashby_sync_logs(created_at);

-- Create Ashby webhook events table for debugging and audit trail
CREATE TABLE IF NOT EXISTS ashby_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ashby_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    candidate_id TEXT,
    application_id TEXT,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create index for webhook event lookups
CREATE INDEX IF NOT EXISTS idx_ashby_webhook_events_ashby_event_id ON ashby_webhook_events(ashby_event_id);
CREATE INDEX IF NOT EXISTS idx_ashby_webhook_events_event_type ON ashby_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ashby_webhook_events_candidate_id ON ashby_webhook_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ashby_webhook_events_processed ON ashby_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_ashby_webhook_events_received_at ON ashby_webhook_events(received_at);

-- Create function to automatically update ashby_last_synced_at when sync_status changes to 'synced'
CREATE OR REPLACE FUNCTION update_ashby_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ashby_sync_status = 'synced' AND OLD.ashby_sync_status != 'synced' THEN
        NEW.ashby_last_synced_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_ashby_sync_timestamp ON applicants;
CREATE TRIGGER trigger_update_ashby_sync_timestamp
    BEFORE UPDATE ON applicants
    FOR EACH ROW
    EXECUTE FUNCTION update_ashby_sync_timestamp();

-- Create view for Ashby sync status monitoring
CREATE OR REPLACE VIEW ashby_sync_status_view AS
SELECT 
    a.id,
    a.name,
    a.email,
    a.status as verification_status,
    a.score,
    a.ashby_candidate_id,
    a.ashby_sync_status,
    a.ashby_last_synced_at,
    a.priority,
    a.created_at,
    a.updated_at,
    CASE 
        WHEN a.ashby_sync_status = 'pending' AND a.status = 'completed' THEN 'needs_sync'
        WHEN a.ashby_sync_status = 'failed' THEN 'retry_needed'
        WHEN a.ashby_sync_status = 'synced' THEN 'up_to_date'
        ELSE 'not_applicable'
    END as sync_recommendation
FROM applicants a
WHERE a.ashby_candidate_id IS NOT NULL;

-- Grant permissions for the service role to access new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ashby_sync_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ashby_webhook_events TO service_role;
GRANT SELECT ON ashby_sync_status_view TO service_role;

-- Grant permissions for authenticated users to view sync status
GRANT SELECT ON ashby_sync_status_view TO authenticated;