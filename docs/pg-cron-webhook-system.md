# pg_cron Webhook System Implementation

## Overview

This document describes the implementation of the automated webhook queue processing system using PostgreSQL's `pg_cron` extension, which works seamlessly in both local Supabase development and production environments.

## System Architecture

```mermaid
flowchart TD
    A[Database Event] --> B[Database Trigger]
    B --> C[Queue Webhook Entry]
    C --> D[webhook_queue Table]
    D --> E[pg_cron Scheduler]
    E --> F[Every 2 Minutes]
    F --> G[HTTP POST to /api/webhooks/process-queue]
    G --> H[Queue Processor API]
    H --> I[Process Pending Webhooks]
    I --> J[Priority-Based Processing]
    J --> K[Target API Endpoints]
    K --> L[Update Queue Status]
    
    style E fill:#cceeff
    style F fill:#cceeff
    style G fill:#ffffcc
    style J fill:#ccffcc
```

## Key Discovery: pg_cron Works Locally! 

Previously, we assumed `pg_cron` was unavailable in local Supabase development. **This was incorrect!**

### ✅ **pg_cron is Available in Local Supabase**
```sql
-- This works out of the box in standard Supabase local instances
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Result: CREATE EXTENSION ✅
```

### **Migration Implementation**
```sql
-- Install pg_cron extension (works in both local and production)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  -- Schedule job to process webhook queue every 2 minutes
  PERFORM cron.schedule(
    'process-webhook-queue',
    '*/2 * * * *',
    $cron_body$
    SELECT net.http_post(
      url => get_webhook_url() || '/api/webhooks/process-queue',
      headers => jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.webhook_secret', true),
        'Content-Type', 'application/json'
      )
    );
    $cron_body$
  );
  
  RAISE NOTICE '✅ pg_cron job "process-webhook-queue" created successfully';
END $$;
```

## Environment Support

| Environment | pg_cron Status | Queue Processing | Configuration |
|-------------|---------------|------------------|---------------|
| **Local Development** | ✅ Auto-installed | Every 2 minutes | `host.docker.internal:3000` |
| **Supabase Cloud** | ✅ Pre-available | Every 2 minutes | Production webhook URL |

## Webhook Queue Flow

### 1. **Trigger Events**
```sql
-- Ashby Score Changes
CREATE TRIGGER ashby_score_sync_trigger
  AFTER INSERT OR UPDATE OF score ON public.applicants
  FOR EACH ROW 
  WHEN (NEW.source = 'ashby')
  EXECUTE FUNCTION public.queue_ashby_score_push();

-- Ashby Note Changes  
CREATE TRIGGER ashby_note_sync_trigger
  AFTER UPDATE OF notes ON public.applicants
  FOR EACH ROW 
  WHEN (NEW.source = 'ashby')
  EXECUTE FUNCTION public.queue_ashby_note_push();
```

### 2. **Queue Entry Creation**
```sql
-- Example: Score Push Queue Function
CREATE OR REPLACE FUNCTION public.queue_ashby_score_push()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload jsonb;
  webhook_priority INTEGER;
BEGIN
  -- Calculate priority based on score (higher scores = higher priority)
  webhook_priority := GREATEST(LEAST(NEW.score, 100), 1);
  
  -- Prepare webhook payload
  webhook_payload := jsonb_build_object(
    'type', 'SCORE_PUSH',
    'applicantId', NEW.id,
    'score', NEW.score,
    'trigger_reason', 'score_sync'
  );
  
  -- Queue webhook for processing
  INSERT INTO public.webhook_queue (
    user_id, applicant_id, webhook_type, payload, priority, scheduled_for
  ) VALUES (
    NEW.user_id, NEW.id, 'score_push', webhook_payload, webhook_priority, NOW()
  );
  
  RAISE NOTICE 'Ashby score push queued: applicant % (score: %, priority: %)', 
               NEW.id, NEW.score, webhook_priority;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. **pg_cron Processing**
```sql
-- Cron job runs every 2 minutes
SELECT cron.schedule(
  'process-webhook-queue',  -- Job name
  '*/2 * * * *',           -- Every 2 minutes
  $$
  SELECT net.http_post(
    url => get_webhook_url() || '/api/webhooks/process-queue',
    headers => jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.webhook_secret', true),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

### 4. **Queue Processor Logic**
```typescript
// /api/webhooks/process-queue/route.ts
export async function POST(request: Request) {
  // Authentication check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Fetch pending webhooks (priority-ordered)
  const { data: webhooks } = await supabase
    .from('webhook_queue')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempts', 'max_attempts')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true })
    .limit(10);
    
  // Process each webhook...
}
```

## Configuration System

### **Dynamic Webhook URLs**
```sql
-- Helper function for configurable webhook URLs
CREATE OR REPLACE FUNCTION get_webhook_url()
RETURNS text AS $$
DECLARE
  base_url text;
BEGIN
  -- Get configured webhook URL from database setting
  base_url := current_setting('app.webhook_base_url', true);
  
  -- Fallback for local development (Docker networking)
  IF base_url IS NULL OR base_url = '' THEN
    base_url := 'http://host.docker.internal:3000';
    RAISE NOTICE 'Using local development webhook URL: %', base_url;
  END IF;
  
  RETURN base_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Environment-Specific Configuration**

#### **Local Development**
```bash
# Uses automatic fallback to localhost
# No configuration needed - works out of the box
WEBHOOK_SECRET=webhook-secret-dev
```

#### **Production Setup**  
```sql
-- Set production webhook base URL
ALTER DATABASE your_production_db_name 
SET app.webhook_base_url = 'https://your-domain.com';

-- Set webhook authentication secret
ALTER DATABASE your_production_db_name 
SET app.webhook_secret = 'your-production-webhook-secret';
```

## Monitoring & Management

### **Check Cron Job Status**
```sql
-- View active cron jobs
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname = 'process-webhook-queue';

-- Use helper function for detailed status
SELECT * FROM check_webhook_queue_cron_status();
```

### **Queue Monitoring**
```sql
-- View pending webhooks
SELECT 
  webhook_type,
  status,
  priority,
  attempts,
  max_attempts,
  scheduled_for,
  payload->>'applicantId' as applicant_id
FROM webhook_queue 
WHERE status IN ('pending', 'failed')
ORDER BY priority DESC, scheduled_for ASC;

-- Check queue statistics
SELECT 
  status,
  COUNT(*) as count,
  AVG(priority) as avg_priority
FROM webhook_queue 
GROUP BY status;
```

### **Manual Queue Processing**
```bash
# Trigger queue processing manually (development)
curl -X POST "http://localhost:3000/api/webhooks/process-queue" \
  -H "Authorization: Bearer webhook-secret-dev" \
  -H "Content-Type: application/json"

# Production (with proper secret)
curl -X POST "https://your-domain.com/api/webhooks/process-queue" \
  -H "Authorization: Bearer your-production-webhook-secret" \
  -H "Content-Type: application/json"
```

## Priority-Based Processing

### **Priority Calculation**
```sql
-- Score Push Priority: Based on AI credibility score
webhook_priority := GREATEST(LEAST(NEW.score, 100), 1);

-- Note Push Priority: High priority for immediate processing
webhook_priority := 90;
```

### **Processing Order**
1. **Highest Priority First**: Score 85 = Priority 85
2. **Earliest Scheduled**: Among same priority, process older first
3. **Batch Limit**: Maximum 10 webhooks per processing cycle
4. **Retry Logic**: Failed webhooks get exponential backoff

## Benefits of pg_cron Implementation

### ✅ **Advantages**
- **Native Integration**: No external dependencies or services
- **Reliable Scheduling**: PostgreSQL-native cron with ACID properties
- **Local Development**: Full feature parity between dev and production
- **Simple Configuration**: Minimal setup, automatic failover
- **Database Consistency**: Transactions ensure queue integrity
- **Monitoring Built-in**: Query job status directly from database

### ✅ **vs Alternative Approaches**
| Approach | Complexity | Local Dev | Reliability | Maintenance |
|----------|------------|-----------|-------------|-------------|
| **pg_cron** | Low | ✅ Works | High | None |
| External Cron | Medium | ❌ Manual Setup | Medium | Required |
| GitHub Actions | High | ❌ Different Flow | Low | Required |
| Node.js Script | Medium | ✅ Manual | Medium | Required |

## Troubleshooting

### **Common Issues**

**Queue Not Processing**
```sql
-- Check if pg_cron extension is installed
SELECT extname FROM pg_extension WHERE extname = 'pg_cron';

-- Check if cron job exists and is active
SELECT * FROM cron.job WHERE jobname = 'process-webhook-queue';
```

**Webhook Authentication Errors**
```sql
-- Verify webhook secret configuration
SELECT current_setting('app.webhook_secret', true);

-- Check webhook URL configuration  
SELECT get_webhook_url();
```

**Manual Queue Recovery**
```sql
-- Reset failed webhooks for retry
UPDATE webhook_queue 
SET status = 'pending', 
    attempts = 0,
    scheduled_for = NOW()
WHERE status = 'failed' 
  AND updated_at > NOW() - INTERVAL '1 day';
```

## Migration Timeline

### **Before (Development Script Approach)**
- ❌ Separate development workflow
- ❌ Manual queue processing
- ❌ Different behavior in dev vs production
- ❌ Additional npm scripts and dependencies

### **After (pg_cron Native Approach)**
- ✅ Unified development and production experience
- ✅ Automatic queue processing everywhere
- ✅ Zero configuration for local development
- ✅ Simplified architecture with fewer moving parts

## Conclusion

The implementation of `pg_cron` for webhook queue processing provides a robust, native solution that works seamlessly across all environments. The discovery that `pg_cron` is available in local Supabase development eliminates the complexity of maintaining separate development workflows while ensuring production-grade reliability and consistency.

This approach exemplifies the principle of "boring technology" - using well-established, reliable tools that require minimal maintenance and provide maximum stability.