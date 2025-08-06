-- =============================================================================
-- Consolidated Database Schema Migration
-- =============================================================================
-- This migration consolidates all previous migrations into a single, clean
-- schema that matches the current Next.js application interfaces.
--
-- Features:
-- - Users table with profile and preferences
-- - Files table for Supabase Storage metadata
-- - Applicants table with event-driven processing
-- - Generated columns for status and score consistency
-- - Database webhooks using pg_net for async processing
-- - Row Level Security policies
-- =============================================================================

-- =============================================================================
-- CREATE ENUM TYPES FOR TYPE SAFETY
-- =============================================================================

CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'ready', 'error', 'not_provided');
CREATE TYPE overall_status AS ENUM ('uploading', 'processing', 'analyzing', 'completed', 'failed');

-- =============================================================================
-- CREATE USERS TABLE
-- =============================================================================

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  preferred_name text,
  avatar_url text,
  preferences jsonb DEFAULT '{}'::jsonb,

  -- Ashby integration
  ashby_api_key text,
  ashby_sync_cursor text,
  ashby_features jsonb DEFAULT '{}'::jsonb,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON public.users(email);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- CREATE FILES TABLE
-- =============================================================================

CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('cv', 'linkedin', 'github', 'other')),
  original_filename text NOT NULL,
  storage_path text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'candidate-cvs',
  file_size bigint,
  mime_type text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_type ON public.files(file_type);
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files" ON public.files
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own files" ON public.files
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own files" ON public.files
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- CREATE STORAGE BUCKET AND POLICIES
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-cvs',
  'candidate-cvs',
  false,
  52428800, -- 50MB limit
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload CVs to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'candidate-cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own CVs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'candidate-cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own CVs" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'candidate-cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own CVs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'candidate-cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- CREATE APPLICANTS TABLE WITH GENERATED COLUMNS
-- =============================================================================

CREATE TABLE public.applicants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Basic info (synced from JSON data via trigger)
  name text NOT NULL DEFAULT 'Processing...',
  email text,
  phone text,

  -- Source URLs (user input)
  linkedin_url text,
  github_url text,

  -- File reference
  cv_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,

  -- Processing status columns (using enum types)
  cv_status processing_status DEFAULT 'pending'::processing_status,
  li_status processing_status DEFAULT 'pending'::processing_status,
  gh_status processing_status DEFAULT 'pending'::processing_status,
  ai_status processing_status DEFAULT 'pending'::processing_status,

  -- JSONB data columns (schema-less for flexibility)
  cv_data jsonb,
  li_data jsonb,
  gh_data jsonb,
  ai_data jsonb,

  -- Generated columns (always in sync, never drift)
  status overall_status GENERATED ALWAYS AS (
    CASE
      -- Failures take priority
      WHEN cv_status = 'error' OR li_status = 'error'
           OR gh_status = 'error' OR ai_status = 'error' THEN 'failed'::overall_status

      -- AI analysis phase
      WHEN ai_status = 'processing' THEN 'analyzing'::overall_status
      WHEN ai_status = 'ready' THEN 'completed'::overall_status

      -- Data collection phase
      WHEN cv_status = 'processing' OR li_status = 'processing' OR gh_status = 'processing' THEN 'processing'::overall_status

      -- Initial state
      ELSE 'uploading'::overall_status
    END
  ) STORED,

  score integer GENERATED ALWAYS AS (
    (ai_data->>'score')::integer
  ) STORED,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT score_range_check CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

-- =============================================================================
-- CREATE INDEXES
-- =============================================================================

-- Basic indexes
CREATE INDEX idx_applicants_user_id ON public.applicants(user_id);
CREATE INDEX idx_applicants_status_generated ON public.applicants(status);
CREATE INDEX idx_applicants_score_generated ON public.applicants(score) WHERE score IS NOT NULL;

-- Individual status indexes
CREATE INDEX idx_applicants_cv_status ON public.applicants(cv_status);
CREATE INDEX idx_applicants_li_status ON public.applicants(li_status);
CREATE INDEX idx_applicants_gh_status ON public.applicants(gh_status);
CREATE INDEX idx_applicants_ai_status ON public.applicants(ai_status);

-- Expression indexes for JSON field queries
CREATE INDEX idx_applicants_cv_email ON public.applicants((cv_data->>'email')) WHERE cv_data->>'email' IS NOT NULL;
CREATE INDEX idx_applicants_cv_name ON public.applicants((cv_data->>'name')) WHERE cv_data->>'name' IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applicants" ON public.applicants
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applicants" ON public.applicants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applicants" ON public.applicants
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applicants" ON public.applicants
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER handle_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_files_updated_at BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_applicants_updated_at BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =============================================================================
-- SYNC TRIGGER FOR SCALAR FIELDS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_applicant_scalars()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Sync from CV data (primary source for personal info)
  IF NEW.cv_data IS DISTINCT FROM COALESCE(OLD.cv_data, '{}'::jsonb) THEN
    -- Only update if current value is NULL/empty or if we have better data
    IF NEW.name IS NULL OR NEW.name = 'Processing...' OR NEW.name = '' THEN
      NEW.name := COALESCE(NEW.cv_data->>'name', NEW.cv_data->>'full_name', NEW.name);
    END IF;

    IF NEW.email IS NULL OR NEW.email = '' THEN
      NEW.email := COALESCE(NEW.cv_data->>'email', NEW.email);
    END IF;

    IF NEW.phone IS NULL OR NEW.phone = '' THEN
      NEW.phone := COALESCE(NEW.cv_data->>'phone', NEW.cv_data->>'telephone', NEW.phone);
    END IF;
  END IF;

  -- Fallback to LinkedIn data if CV data is not available
  IF NEW.li_data IS DISTINCT FROM COALESCE(OLD.li_data, '{}'::jsonb) THEN
    IF NEW.name IS NULL OR NEW.name = 'Processing...' OR NEW.name = '' THEN
      NEW.name := COALESCE(NEW.li_data->>'name', NEW.li_data->>'full_name', NEW.name);
    END IF;

    IF NEW.email IS NULL OR NEW.email = '' THEN
      NEW.email := COALESCE(NEW.li_data->>'email', NEW.email);
    END IF;
  END IF;

  -- Ensure name is never completely empty
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := 'Processing...';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for scalar field synchronization
CREATE TRIGGER trg_sync_applicant_scalars
  BEFORE INSERT OR UPDATE OF cv_data, li_data ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.sync_applicant_scalars();

-- =============================================================================
-- ENABLE PG_NET EXTENSION (SAFE FALLBACK)
-- =============================================================================

DO $$
BEGIN
  -- Attempt to create the pg_net extension. If the extension isn't available in
  -- this database (e.g. hosted Supabase before you flip the dashboard switch)
  -- the inner block fails and we silently continue – migrations stay green.
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net extension not available in this database yet – skipping';
  END;
END;
$$;

-- =============================================================================
-- WEBHOOK FUNCTIONS
-- =============================================================================

-- CV Processing Webhook (Fire-and-Forget)
CREATE OR REPLACE FUNCTION public.webhook_cv_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger if cv_file_id is set and not currently processing
  IF NEW.cv_file_id IS NOT NULL AND NEW.cv_status != 'processing' AND
     (TG_OP = 'INSERT' OR OLD.cv_file_id IS DISTINCT FROM NEW.cv_file_id) THEN

    -- Fire webhook asynchronously (no timeout - fire and forget)
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/cv-process',
      body => jsonb_build_object(
        'type', 'CV_PROCESSING',
        'applicant_id', NEW.id,
        'file_id', NEW.cv_file_id
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
    );

    RAISE NOTICE 'CV processing webhook triggered for applicant % with file %', NEW.id, NEW.cv_file_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- LinkedIn Processing Webhook (Fire-and-Forget)
CREATE OR REPLACE FUNCTION public.webhook_linkedin_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger if linkedin_url is set and not currently processing
  IF NEW.linkedin_url IS NOT NULL AND NEW.li_status != 'processing' AND
     (TG_OP = 'INSERT' OR OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url) THEN

    -- Fire webhook asynchronously (no timeout - fire and forget)
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/linkedin-fetch',
      body => jsonb_build_object(
        'type', 'LINKEDIN_PROCESSING',
        'applicant_id', NEW.id,
        'linkedin_url', NEW.linkedin_url
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
    );

    RAISE NOTICE 'LinkedIn processing webhook triggered for applicant % with URL %', NEW.id, NEW.linkedin_url;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GitHub Processing Webhook (Fire-and-Forget)
CREATE OR REPLACE FUNCTION public.webhook_github_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger if github_url is set and not currently processing
  IF NEW.github_url IS NOT NULL AND NEW.gh_status != 'processing' AND
     (TG_OP = 'INSERT' OR OLD.github_url IS DISTINCT FROM NEW.github_url) THEN

    -- Fire webhook asynchronously (no timeout - fire and forget)
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/github-fetch',
      body => jsonb_build_object(
        'type', 'GITHUB_PROCESSING',
        'applicant_id', NEW.id,
        'github_url', NEW.github_url
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
    );

    RAISE NOTICE 'GitHub processing webhook triggered for applicant % with URL %', NEW.id, NEW.github_url;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AI Analysis Webhook (Fire-and-Forget)
CREATE OR REPLACE FUNCTION public.webhook_ai_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if AI analysis should start
  -- Triggers when at least one source is ready and nothing is processing
  IF NEW.ai_status = 'pending' AND 
     -- At least one source is ready (any of them)
     (NEW.cv_status = 'ready' OR NEW.li_status = 'ready' OR NEW.gh_status = 'ready') AND
     -- No sources are currently processing
     NEW.cv_status NOT IN ('processing') AND NEW.li_status NOT IN ('processing') AND NEW.gh_status NOT IN ('processing')
  THEN

    -- Fire webhook asynchronously (no timeout - fire and forget)
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/analysis',
      body => jsonb_build_object(
        'type', 'AI_ANALYSIS',
        'applicant_id', NEW.id
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb
    );

    RAISE NOTICE 'AI analysis webhook triggered for applicant %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CREATE WEBHOOK TRIGGERS
-- =============================================================================

-- CV processing webhook trigger (AFTER to ensure record is committed)
CREATE TRIGGER webhook_cv_trigger
  AFTER INSERT OR UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_cv_processing();

-- LinkedIn processing webhook trigger
CREATE TRIGGER webhook_linkedin_trigger
  AFTER INSERT OR UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_linkedin_processing();

-- GitHub processing webhook trigger
CREATE TRIGGER webhook_github_trigger
  AFTER INSERT OR UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_github_processing();

-- AI analysis webhook trigger (AFTER to see final state)
CREATE TRIGGER webhook_ai_trigger
  AFTER UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_ai_analysis();

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to create a new applicant with automatic processing
CREATE OR REPLACE FUNCTION public.create_applicant_with_processing(
  p_user_id uuid,
  p_cv_file_id uuid DEFAULT NULL,
  p_linkedin_url text DEFAULT NULL,
  p_github_url text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  applicant_id uuid;
BEGIN
  INSERT INTO public.applicants (
    user_id,
    cv_file_id,
    linkedin_url,
    github_url,
    cv_status,
    li_status,
    gh_status,
    ai_status
    -- Note: status is now generated automatically
    -- Note: score is now generated from ai_data automatically
  ) VALUES (
    p_user_id,
    p_cv_file_id,
    p_linkedin_url,
    p_github_url,
    CASE WHEN p_cv_file_id IS NOT NULL THEN 'pending'::processing_status ELSE 'not_provided'::processing_status END,
    CASE WHEN p_linkedin_url IS NOT NULL THEN 'pending'::processing_status ELSE 'not_provided'::processing_status END,
    CASE WHEN p_github_url IS NOT NULL THEN 'pending'::processing_status ELSE 'not_provided'::processing_status END,
    'pending'::processing_status
  ) RETURNING id INTO applicant_id;

  RAISE NOTICE 'Created applicant % with CV: %, LinkedIn: %, GitHub: %',
    applicant_id, p_cv_file_id, p_linkedin_url, p_github_url;

  RETURN applicant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check recent webhook calls (simplified for monitoring)
CREATE OR REPLACE FUNCTION public.get_recent_webhook_calls(
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id BIGINT,
  created_at TIMESTAMPTZ,
  url TEXT,
  method TEXT,
  headers JSONB,
  body JSONB,
  timeout_milliseconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.created_at,
    q.url,
    q.method,
    q.headers,
    q.body,
    q.timeout_milliseconds
  FROM net.http_request_queue q
  ORDER BY q.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create user record when someone signs up
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

-- Trigger to create user record when someone signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TYPE processing_status IS 'Enum for individual processing step status';
COMMENT ON TYPE overall_status IS 'Enum for overall applicant pipeline status';
COMMENT ON COLUMN public.applicants.status IS 'Generated column: overall status derived from sub-statuses';
COMMENT ON COLUMN public.applicants.score IS 'Generated column: AI analysis score from ai_data JSON';
COMMENT ON FUNCTION public.sync_applicant_scalars() IS 'Sync scalar fields (name, email, phone) from JSON data while preserving manual edits';
COMMENT ON TABLE public.applicants IS 'Consolidated schema with event-driven processing via database webhooks';
COMMENT ON FUNCTION public.webhook_cv_processing() IS 'Fire-and-forget webhook for CV processing - API manages its own status';
COMMENT ON FUNCTION public.webhook_linkedin_processing() IS 'Fire-and-forget webhook for LinkedIn processing - API manages its own status';
COMMENT ON FUNCTION public.webhook_github_processing() IS 'Fire-and-forget webhook for GitHub processing - API manages its own status';
COMMENT ON FUNCTION public.webhook_ai_analysis() IS 'Fire-and-forget webhook for AI analysis - API manages its own status';
