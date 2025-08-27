# Webhook Development Guide

This guide covers developing and debugging the event-driven processing system using database triggers and pg_net webhooks.

## Architecture Overview

The system uses database triggers to automatically fire HTTP webhooks to Next.js API routes when certain conditions are met. This enables asynchronous processing without blocking the main application flow.

```
Database Row Update → AFTER Trigger → pg_net HTTP POST → Next.js API Route → Update Database
```

## Development Workflow

### 1. Setting Up a New Processing Step

Let's walk through adding a new processing step called "resume_analysis":

#### Step 1: Add Database Columns
```sql
-- Add to your migration file
ALTER TABLE public.applicants 
ADD COLUMN resume_status processing_status DEFAULT 'pending',
ADD COLUMN resume_data jsonb;
```

#### Step 2: Update Generated Status Column
```sql
-- Modify the status generated column to include your new status
ALTER TABLE public.applicants 
DROP COLUMN status;

ALTER TABLE public.applicants 
ADD COLUMN status overall_status GENERATED ALWAYS AS (
  CASE
    -- Include your new error condition
    WHEN cv_status = 'error' OR li_status = 'error' 
         OR gh_status = 'error' OR ai_status = 'error' 
         OR resume_status = 'error' THEN 'failed'::overall_status
    
    -- Update processing conditions
    WHEN cv_status = 'processing' OR li_status = 'processing' 
         OR gh_status = 'processing' OR resume_status = 'processing' THEN 'processing'::overall_status
    
    -- Keep other conditions...
    WHEN ai_status = 'ready' THEN 'completed'::overall_status
    ELSE 'uploading'::overall_status
  END
) STORED;
```

#### Step 3: Create Webhook Function
```sql
CREATE OR REPLACE FUNCTION public.webhook_resume_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Define your trigger condition
  IF NEW.resume_status = 'pending' AND NEW.cv_status = 'ready' AND
     (TG_OP = 'INSERT' OR OLD.resume_status != 'pending') THEN

    -- Update status to processing
    UPDATE public.applicants
    SET resume_status = 'processing'::processing_status
    WHERE id = NEW.id;

    -- Fire webhook
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/resume-analysis',
      body => jsonb_build_object(
        'type', 'RESUME_ANALYSIS',
        'applicant_id', NEW.id
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds => 5000
    );

    RAISE NOTICE 'Resume analysis webhook triggered for applicant %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Step 4: Create Trigger
```sql
CREATE TRIGGER webhook_resume_trigger
  AFTER INSERT OR UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_resume_analysis();
```

#### Step 5: Create API Route
Create `frontend/src/app/api/resume-analysis/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicant_id } = body;

    if (!applicant_id) {
      return NextResponse.json(
        { error: 'applicant_id is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting resume analysis for applicant ${applicant_id}`);

    const supabase = createServiceRoleClient();

    // Get applicant data
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicant_id)
      .single();

    if (applicantError || !applicant) {
      return NextResponse.json(
        { error: 'Applicant not found' },
        { status: 404 }
      );
    }

    try {
      // Your processing logic here
      const analysisResult = await performResumeAnalysis(applicant);

      // Update with results
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          resume_data: analysisResult,
          resume_status: 'ready'
        })
        .eq('id', applicant_id);

      if (updateError) {
        throw new Error(`Failed to update applicant: ${updateError.message}`);
      }

      console.log(`✅ Resume analysis completed for applicant ${applicant_id}`);
      return NextResponse.json({ success: true, applicant_id });

    } catch (processingError) {
      console.error(`❌ Resume analysis failed for applicant ${applicant_id}:`, processingError);

      // Update status to error
      await supabase
        .from('applicants')
        .update({
          resume_status: 'error',
          resume_data: {
            error: processingError instanceof Error ? processingError.message : 'Analysis failed',
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', applicant_id);

      return NextResponse.json({
        success: false,
        error: processingError instanceof Error ? processingError.message : 'Analysis failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Resume analysis endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Debugging & Testing

### 1. Monitor Webhook Queue
```bash
# Check recent webhook calls
cd frontend && pnpm supabase sql --file - <<< "
SELECT 
  id, 
  created_at, 
  url, 
  method,
  body->>'type' as webhook_type,
  body->>'applicant_id' as applicant_id
FROM net.http_request_queue 
ORDER BY created_at DESC 
LIMIT 20;
"
```

### 2. Test Triggers Manually
```bash
# Trigger a webhook by updating an applicant
cd frontend && pnpm supabase sql --file - <<< "
UPDATE applicants 
SET cv_status = 'ready' 
WHERE id = 'your-applicant-id';
"
```

### 3. Test API Routes Directly
```bash
# Test your API route with curl
curl -X POST http://localhost:3000/api/resume-analysis \
  -H "Content-Type: application/json" \
  -d '{"applicant_id": "your-applicant-id"}'
```

### 4. Check Generated Columns
```bash
# View status calculations
cd frontend && pnpm supabase sql --file - <<< "
SELECT 
  id, 
  name,
  status,  -- Generated column
  cv_status, 
  li_status, 
  gh_status, 
  ai_status,
  resume_status
FROM applicants 
ORDER BY created_at DESC;
"
```

## Common Patterns & Best Practices

### Webhook Function Pattern
```sql
CREATE OR REPLACE FUNCTION public.webhook_[name]()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Check conditions for triggering
  IF [trigger_conditions] THEN
    
    -- 2. Update status to 'processing' first
    UPDATE public.applicants
    SET [name]_status = 'processing'::processing_status
    WHERE id = NEW.id;

    -- 3. Fire webhook
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/[endpoint]',
      body => jsonb_build_object(
        'type', '[WEBHOOK_TYPE]',
        'applicant_id', NEW.id
        -- Add other needed data
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds => [appropriate_timeout]
    );

    -- 4. Log for debugging
    RAISE NOTICE '[Process] webhook triggered for applicant %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### API Route Pattern
```typescript
export async function POST(request: Request) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const { applicant_id } = body;

    // 2. Get service role client
    const supabase = createServiceRoleClient();

    // 3. Fetch applicant data
    const { data: applicant } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicant_id)
      .single();

    try {
      // 4. Process data
      const result = await yourProcessingFunction(applicant);

      // 5. Update with success
      await supabase
        .from('applicants')
        .update({
          [name]_data: result,
          [name]_status: 'ready'
        })
        .eq('id', applicant_id);

      return NextResponse.json({ success: true });

    } catch (processingError) {
      // 6. Update with error
      await supabase
        .from('applicants')
        .update({
          [name]_status: 'error',
          [name]_data: {
            error: processingError.message,
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', applicant_id);

      return NextResponse.json({ success: false }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Troubleshooting

### Webhooks Not Firing
1. Check if pg_net extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
2. Verify trigger conditions are met
3. Check for trigger errors in logs
4. Ensure URLs are correct for your environment

### Status Not Updating
1. Verify generated column expressions are correct
2. Check if individual status updates are working
3. Look for trigger conflicts or errors

### API Routes Failing
1. Check service role client configuration
2. Verify RLS policies allow service role access
3. Check for data validation errors
4. Monitor application logs

### Performance Issues
1. Monitor webhook queue size
2. Check for stuck/failed webhooks
3. Optimize trigger conditions to reduce unnecessary calls
4. Consider adding indexes on status columns