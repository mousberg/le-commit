# Database Patterns & Best Practices

This document outlines the database patterns used in the event-driven applicant processing system, with focus on generated columns, status management, and trigger patterns.

## Generated Columns

Generated columns automatically compute values based on other columns, eliminating data drift and ensuring consistency.

### Pattern Overview
```sql
column_name data_type GENERATED ALWAYS AS (expression) STORED
```

**Benefits:**
- Always consistent - no manual sync needed
- Indexable for performance
- Reduces application logic complexity
- Prevents data drift from concurrent updates

### Status Generation Pattern

Our primary generated column derives overall status from individual processing statuses:

```sql
status overall_status GENERATED ALWAYS AS (
  CASE
    -- Failures take priority (any error = failed)
    WHEN cv_status = 'error' OR li_status = 'error'
         OR gh_status = 'error' OR ai_status = 'error' THEN 'failed'::overall_status

    -- AI analysis phase (final step)
    WHEN ai_status = 'processing' THEN 'analyzing'::overall_status
    WHEN ai_status = 'ready' THEN 'completed'::overall_status

    -- Data collection phase (parallel processing)
    WHEN cv_status = 'processing' OR
         (li_status = 'processing' AND li_status != 'not_provided') OR
         (gh_status = 'processing' AND gh_status != 'not_provided') THEN 'processing'::overall_status

    -- Initial state
    ELSE 'uploading'::overall_status
  END
) STORED
```

**Key Features:**
- **Priority-based**: Error states override everything else
- **Sequential logic**: AI analysis only after data collection
- **Optional sources**: Handles `not_provided` status for optional data sources
- **Fallback**: Defaults to initial state

### Score Extraction Pattern

Extract structured data from JSON into typed, indexable columns:

```sql
score integer GENERATED ALWAYS AS (
  (ai_data->>'score')::integer
) STORED
```

**Use Cases:**
- Extracting numeric values for sorting/filtering
- Creating indexes on JSON field values
- Type safety for critical business data

### When to Use Generated Columns

✅ **Good for:**
- Derived state that's frequently queried
- Complex calculations based on multiple columns
- Status aggregation from sub-states
- Extracting key values from JSON

❌ **Avoid for:**
- Values that need manual override
- Expensive calculations (consider computed columns)
- Frequently changing logic (requires migration to update)

## Status Management with Enums

### Enum Definitions

```sql
-- Individual processing step status
CREATE TYPE processing_status AS ENUM (
  'pending',      -- Not started
  'processing',   -- Currently running
  'ready',        -- Successfully completed
  'error',        -- Failed with error
  'not_provided'  -- Optional field not provided
);

-- Overall applicant pipeline status
CREATE TYPE overall_status AS ENUM (
  'uploading',    -- Initial state, waiting for input
  'processing',   -- Data collection in progress
  'analyzing',    -- AI analysis running
  'completed',    -- All processing finished
  'failed'        -- One or more steps failed
);
```

### Status Transition Patterns

#### Individual Status Flow
```
pending → processing → ready
   ↓           ↓
not_provided  error
```

#### Overall Status Flow
```
uploading → processing → analyzing → completed
    ↓           ↓           ↓          
  failed  →   failed  →  failed
```

### Status Management Best Practices

1. **Use enums for type safety**
   ```sql
   cv_status processing_status DEFAULT 'pending'
   ```

2. **Update status before starting work**
   ```sql
   UPDATE applicants SET cv_status = 'processing' WHERE id = NEW.id;
   PERFORM net.http_post(...);  -- Then fire webhook
   ```

3. **Handle optional sources**
   ```sql
   CASE WHEN linkedin_url IS NULL THEN 'not_provided'::processing_status 
        ELSE 'pending'::processing_status END
   ```

4. **Always provide error handling**
   ```sql
   UPDATE applicants SET cv_status = 'error', cv_data = jsonb_build_object('error', error_message) WHERE id = applicant_id;
   ```

## Trigger Patterns

### Scalar Field Sync Pattern

Keep scalar fields in sync with JSON data without losing manual edits:

```sql
CREATE OR REPLACE FUNCTION public.sync_applicant_scalars()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Sync from CV data (primary source)
  IF NEW.cv_data IS DISTINCT FROM COALESCE(OLD.cv_data, '{}'::jsonb) THEN
    -- Only update if current value is NULL/empty or default
    IF NEW.name IS NULL OR NEW.name = 'Processing...' OR NEW.name = '' THEN
      NEW.name := COALESCE(NEW.cv_data->>'name', NEW.cv_data->>'full_name', NEW.name);
    END IF;
    
    -- Similar for email, phone...
  END IF;

  -- Fallback to other sources...
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_applicant_scalars
  BEFORE INSERT OR UPDATE OF cv_data, li_data ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.sync_applicant_scalars();
```

**Key Features:**
- Preserves manual edits (doesn't overwrite non-empty values)
- Priority system (CV data overrides LinkedIn data)
- Fallback chains for missing data
- Only triggers on relevant column changes

### Webhook Trigger Pattern

Standard pattern for firing async processing webhooks:

```sql
CREATE OR REPLACE FUNCTION public.webhook_[process_name]()
RETURNS TRIGGER AS $$
BEGIN
  -- Check conditions
  IF NEW.[trigger_field] IS NOT NULL AND NEW.[status_field] = 'pending' AND
     (TG_OP = 'INSERT' OR OLD.[trigger_field] IS NULL OR OLD.[status_field] = 'pending') THEN

    -- Update status first (prevents race conditions)
    UPDATE public.applicants
    SET [status_field] = 'processing'::processing_status
    WHERE id = NEW.id;

    -- Fire webhook
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/[endpoint]',
      body => jsonb_build_object(
        'type', '[WEBHOOK_TYPE]',
        'applicant_id', NEW.id,
        '[field_name]', NEW.[trigger_field]
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds => [timeout]
    );

    RAISE NOTICE '[Process] webhook triggered for applicant % with [field] %', NEW.id, NEW.[trigger_field];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Auto-User Creation Pattern

Automatically create application user records when auth users sign up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name'
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Indexing Strategies

### Generated Column Indexes
```sql
-- Index generated columns for performance
CREATE INDEX idx_applicants_status_generated ON public.applicants(status);
CREATE INDEX idx_applicants_score_generated ON public.applicants(score) WHERE score IS NOT NULL;
```

### JSON Field Indexes
```sql
-- Index frequently queried JSON fields
CREATE INDEX idx_applicants_cv_email ON public.applicants((cv_data->>'email')) 
WHERE cv_data->>'email' IS NOT NULL;
```

### Status Indexes
```sql
-- Index individual status fields for webhook queries
CREATE INDEX idx_applicants_cv_status ON public.applicants(cv_status);
CREATE INDEX idx_applicants_li_status ON public.applicants(li_status);
```

## Migration Patterns

### Adding Generated Columns
```sql
-- Step 1: Add column
ALTER TABLE applicants ADD COLUMN new_status overall_status;

-- Step 2: Populate existing data (if needed)
UPDATE applicants SET new_status = 'default_value';

-- Step 3: Make it generated
ALTER TABLE applicants 
DROP COLUMN new_status,
ADD COLUMN new_status overall_status GENERATED ALWAYS AS (
  -- your expression
) STORED;

-- Step 4: Add index
CREATE INDEX idx_new_status ON applicants(new_status);
```

### Modifying Generated Column Logic
```sql
-- Must drop and recreate - cannot ALTER generated columns directly
ALTER TABLE applicants DROP COLUMN status;
ALTER TABLE applicants ADD COLUMN status overall_status GENERATED ALWAYS AS (
  -- updated expression
) STORED;

-- Recreate index
CREATE INDEX idx_applicants_status_generated ON public.applicants(status);
```

## Testing Patterns

### Test Generated Columns
```sql
-- Insert test data and verify generated values
INSERT INTO applicants (user_id, cv_status, ai_status) 
VALUES ('test-user', 'ready', 'processing');

SELECT status FROM applicants WHERE user_id = 'test-user';
-- Should return 'analyzing'
```

### Test Triggers
```sql
-- Test webhook trigger
UPDATE applicants SET cv_file_id = uuid_generate_v4() WHERE id = 'test-id';

-- Check webhook queue
SELECT * FROM net.http_request_queue ORDER BY created_at DESC LIMIT 5;
```

### Test Status Transitions
```sql
-- Test full pipeline
UPDATE applicants SET 
  cv_status = 'ready',
  li_status = 'ready', 
  gh_status = 'not_provided',
  ai_status = 'ready'
WHERE id = 'test-id';

-- Should result in status = 'completed'
SELECT status FROM applicants WHERE id = 'test-id';
```

## Performance Considerations

1. **Generated columns are indexed automatically** - no additional indexing needed for the expression itself
2. **JSON operators can be expensive** - extract frequently queried fields to generated columns
3. **Trigger performance** - keep webhook triggers lightweight, do heavy work in API routes
4. **Status updates** - batch updates when possible to reduce trigger executions
5. **Enum comparisons are fast** - prefer enums over string comparisons for status fields