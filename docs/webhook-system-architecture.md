# Webhook System Architecture

## Overview

The application uses an event-driven architecture with database triggers and webhooks for asynchronous processing. This system ensures reliable delivery of score updates to external systems (like Ashby ATS) with proper error handling, retry logic, and priority-based processing.

## System Components

### 1. Database Triggers
**Location**: `frontend/supabase/migrations/20250820111300_webhook_queue_system_unified.sql`

```sql
CREATE OR REPLACE FUNCTION trigger_ashby_webhook_on_score() 
RETURNS TRIGGER AS $$
```

**Purpose**: Automatically fires when applicant scores are updated in the database.

**Key Features**:
- Triggers on ANY score update (not just threshold crossing)
- Calculates priority based on score (higher scores = higher priority: 0-100)
- Always queues webhooks (no direct HTTP calls)
- Uses consistent field naming (`applicantId` in camelCase)

**Trigger Logic**:
1. Detects score changes (`NEW.score != COALESCE(OLD.score, 0)`)
2. Calculates priority: `LEAST(NEW.score, 100)`
3. Creates webhook payload with `applicantId` and metadata
4. Inserts into `webhook_queue` table with immediate scheduling
5. Logs via database NOTICE (not HTTP calls)

### 2. Webhook Queue Table
**Schema**: `public.webhook_queue`

**Key Columns**:
- `user_id`: Owner of the applicant (for authentication context)
- `applicant_id`: Target applicant UUID
- `webhook_type`: 'score_push' | 'note_push'
- `payload`: JSON payload with `applicantId`, `score`, etc.
- `status`: 'pending' | 'processing' | 'completed' | 'failed'
- `priority`: Integer (0-100, higher = more important)
- `attempts` / `max_attempts`: Retry tracking
- `scheduled_for`: When to process (supports delayed execution)

**Indexing**:
```sql
CREATE INDEX idx_webhook_queue_priority_scheduled 
ON webhook_queue(priority DESC, scheduled_for ASC) 
WHERE status IN ('pending', 'failed');
```

### 3. Queue Processor
**Location**: `frontend/src/app/api/webhooks/process-queue/route.ts`

**Authentication**: Uses `WEBHOOK_SECRET` for cron job security
```typescript
const expectedSecret = process.env.WEBHOOK_SECRET || 'webhook-secret-dev';
if (authHeader !== `Bearer ${expectedSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Processing Logic**:
1. **Fetch pending webhooks** (priority-ordered, max 10 at a time)
2. **Filter by attempts** (`webhook.attempts < webhook.max_attempts`)
3. **Process each webhook**:
   - Mark as 'processing' and increment attempts
   - Transform payload for target endpoint
   - Make HTTP request with service role authentication
   - Update status based on response

**Error Handling & Retries**:
- **Success**: Mark as 'completed'
- **Rate limit (503)**: Retry in 5 minutes
- **Other failures**: Exponential backoff (`2^attempts * 60s`)
- **Final failure**: Mark as 'failed' when max attempts reached

**Service Role Authentication**:
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${serviceRoleKey}` // SUPABASE_SERVICE_ROLE_KEY
}
```

### 4. Target API Endpoints

#### Push Score Endpoint
**Location**: `frontend/src/app/api/ashby/push-score/route.ts`

**Dual Authentication Support**:
1. **User Authentication** (frontend calls): Uses middleware with user JWT tokens
2. **Service Role Authentication** (webhook processor): Detects service role token + userId

**Service Role Handling**:
```typescript
const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
if (isServiceRole) {
  const { userId } = body; // Extract from webhook processor payload
  const serviceRoleContext = { user: { id: userId, email: '' }, ... };
  return await pushScoreToAshby(serviceRoleContext);
}
```

**API Integration**: Sends scores to Ashby ATS using their custom field API.

## Data Flow

### Score Update Workflow
```
1. Applicant score updated → Database trigger fires
2. trigger_ashby_webhook_on_score() → Creates webhook_queue entry
3. Queue processor (cron) → Fetches pending webhooks
4. HTTP POST to /api/ashby/push-score → With service role auth + userId
5. Push-score route → Detects service role, extracts userId, processes
6. Ashby API call → Updates custom field in external system
7. Success/failure → Updates webhook_queue status
```

### Authentication Flow
```
Webhook Processor Authentication:
Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}
Body: { applicantId: "uuid", userId: "user-uuid" }

Push-Score Route Logic:
if (isServiceRole) {
  // Extract userId from body, create service context
  const serviceRoleContext = { user: { id: userId }, ... };
} else {
  // Use middleware for user JWT authentication
  const middlewareResponse = await withApiMiddleware(...);
}
```

## Configuration

### Environment Variables
```bash
# Required for webhook queue processor authentication
WEBHOOK_SECRET=webhook-secret-dev

# Required for service role operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for Ashby integration
ASHBY_API_KEY=your-ashby-api-key
NEXT_PUBLIC_APP_ENV=development
```

### Ashby Integration
- **Custom Field ID**: `1a3a3e4d-5455-437e-8f75-4aa547222814` (UnmaskScore field)
- **Object Type**: 'Candidate' (for authenticity analysis)
- **Score Range**: 0-100

## Priority System

**Priority Calculation**: `LEAST(applicant.score, 100)`

**Processing Order**:
1. Higher priority webhooks first (`ORDER BY priority DESC`)
2. Earlier scheduled webhooks second (`ORDER BY scheduled_for ASC`)
3. Limited to 10 webhooks per processing batch

**Score-Based Priority Examples**:
- Score 85 → Priority 85 (high priority)
- Score 30 → Priority 30 (medium priority) 
- Score 15 → Priority 15 (low priority)
- Score 105 → Priority 100 (capped at max)

## Error Handling & Reliability

### Retry Strategy
- **Rate Limits (503)**: 5-minute delay before retry
- **Other Failures**: Exponential backoff (2^attempts * 60 seconds)
- **Maximum Attempts**: Configurable per webhook (default: 5)
- **Final Failures**: Marked as 'failed', no further processing

### Monitoring & Logging
- **Database Notices**: Trigger logs via `RAISE NOTICE`
- **Console Logs**: Queue processor and API endpoints log operations
- **Webhook Status**: Tracked in database with timestamps and error messages

### Failure Recovery
- **Manual Retry**: Update webhook status back to 'pending'
- **Bulk Reprocessing**: Reset failed webhooks with new scheduled times
- **Queue Inspection**: Query webhook_queue table for status monitoring

## Migration History

### v1: Dual Execution Paths (Removed)
- Had both direct HTTP calls AND queue system
- Complex conditional logic based on thresholds
- External HTTP logging dependencies

### v2: Always Queue System (Current)
- Single execution path through queue
- All webhooks queued regardless of score
- Priority-based processing for efficiency
- Removed external HTTP dependencies
- Simplified architecture with better reliability

## Troubleshooting

### Common Issues

**401 Errors on Push-Score**:
- **Cause**: Service role authentication not properly configured
- **Fix**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set and webhook processor includes `userId`

**Webhooks Not Processing**:
- **Cause**: Queue processor not running or authentication failed  
- **Fix**: Check `WEBHOOK_SECRET` and ensure cron job is configured

**Ashby API Failures**:
- **Cause**: Invalid API key or custom field configuration
- **Fix**: Verify `ASHBY_API_KEY` and custom field ID in development mode

### Debug Commands
```sql
-- Check pending webhooks
SELECT * FROM webhook_queue WHERE status = 'pending' ORDER BY priority DESC;

-- Check recent failures  
SELECT * FROM webhook_queue WHERE status = 'failed' ORDER BY updated_at DESC;

-- Reset failed webhook for retry
UPDATE webhook_queue SET status = 'pending', scheduled_for = NOW() WHERE id = 'webhook-id';
```

## Development vs Production

### Development Mode
- Uses `ASHBY_API_KEY` environment variable (fallback)
- Relaxed authentication for testing
- Local webhook processing via `http://localhost:3000`

### Production Mode  
- Requires user-specific Ashby API keys in database
- Strict authentication and validation
- External webhook URLs and proper secret management

## Best Practices

1. **Always use the queue**: Don't make direct HTTP calls from triggers
2. **Handle authentication properly**: Service role for queue, user auth for frontend
3. **Monitor webhook status**: Set up alerts for high failure rates
4. **Use priority wisely**: Higher scores = higher priority processing
5. **Environment parity**: Keep development and production configs aligned
6. **Error logging**: Comprehensive logging for debugging webhook failures