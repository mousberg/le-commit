-- =============================================================================
-- Clean Database Webhooks Architecture
-- =============================================================================
-- Single migration implementing Supabase Database Webhooks for automatic
-- processing of CV, LinkedIn, GitHub data, and AI analysis.
-- =============================================================================

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
-- CREATE APPLICANTS TABLE
-- =============================================================================

CREATE TABLE public.applicants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Basic info
  name text NOT NULL DEFAULT 'Processing...',
  email text,
  phone text,

  -- Source URLs
  linkedin_url text,
  github_url text,

  -- File reference
  cv_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,

  -- Processing status columns
  cv_status text DEFAULT 'pending' CHECK (cv_status IN ('pending', 'processing', 'ready', 'error')),
  li_status text DEFAULT 'pending' CHECK (li_status IN ('pending', 'processing', 'ready', 'error')),
  gh_status text DEFAULT 'pending' CHECK (gh_status IN ('pending', 'processing', 'ready', 'error')),
  ai_status text DEFAULT 'pending' CHECK (ai_status IN ('pending', 'processing', 'ready', 'error')),

  -- JSONB data columns (schema-less for flexibility)
  cv_data jsonb,
  li_data jsonb,
  gh_data jsonb,
  ai_data jsonb,

  -- Overall status and score
  status text NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'analyzing', 'completed', 'failed')),
  score integer,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX idx_applicants_user_id ON public.applicants(user_id);
CREATE INDEX idx_applicants_status ON public.applicants(status);
CREATE INDEX idx_applicants_cv_status ON public.applicants(cv_status);
CREATE INDEX idx_applicants_li_status ON public.applicants(li_status);
CREATE INDEX idx_applicants_gh_status ON public.applicants(gh_status);
CREATE INDEX idx_applicants_ai_status ON public.applicants(ai_status);

-- Row Level Security
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
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
-- DATABASE WEBHOOKS (TRIGGER FUNCTIONS)
-- =============================================================================

-- CV Processing Webhook
CREATE OR REPLACE FUNCTION public.webhook_cv_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if CV should be processed
  IF NEW.cv_file_id IS NOT NULL AND
     (OLD IS NULL OR OLD.cv_file_id IS NULL OR OLD.cv_status = 'pending') AND
     NEW.cv_status = 'pending' THEN

    -- Update status to processing
    UPDATE public.applicants
    SET cv_status = 'processing'
    WHERE id = NEW.id;

    -- Fire webhook asynchronously using pg_net
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/cv-process',
      body => jsonb_build_object(
        'type', 'CV_PROCESSING',
        'applicant_id', NEW.id,
        'file_id', NEW.cv_file_id
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds => 3000
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- LinkedIn Processing Webhook
CREATE OR REPLACE FUNCTION public.webhook_linkedin_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if LinkedIn should be processed
  IF NEW.linkedin_url IS NOT NULL AND
     (OLD IS NULL OR OLD.linkedin_url IS NULL OR OLD.li_status = 'pending') AND
     NEW.li_status = 'pending' THEN

    -- Update status to processing
    UPDATE public.applicants
    SET li_status = 'processing'
    WHERE id = NEW.id;

    -- Fire webhook asynchronously using pg_net
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/linkedin-fetch',
      body => jsonb_build_object(
        'type', 'LINKEDIN_PROCESSING',
        'applicant_id', NEW.id,
        'linkedin_url', NEW.linkedin_url
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds => 3000
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GitHub Processing Webhook
CREATE OR REPLACE FUNCTION public.webhook_github_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if GitHub should be processed
  IF NEW.github_url IS NOT NULL AND
     (OLD IS NULL OR OLD.github_url IS NULL OR OLD.gh_status = 'pending') AND
     NEW.gh_status = 'pending' THEN

    -- Update status to processing
    UPDATE public.applicants
    SET gh_status = 'processing'
    WHERE id = NEW.id;

    -- Fire webhook asynchronously using pg_net
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/github-fetch',
      body => jsonb_build_object(
        'type', 'GITHUB_PROCESSING',
        'applicant_id', NEW.id,
        'github_url', NEW.github_url
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds => 3000
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AI Analysis Webhook
CREATE OR REPLACE FUNCTION public.webhook_ai_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if AI analysis should start
  IF NEW.ai_status = 'pending' AND (
    (NEW.cv_status = 'ready' AND NEW.li_status = 'ready') OR
    (NEW.cv_status = 'ready' AND NEW.gh_status = 'ready') OR
    (NEW.li_status = 'ready' AND NEW.gh_status = 'ready')
  ) THEN

    -- Update status to processing
    UPDATE public.applicants
    SET ai_status = 'processing'
    WHERE id = NEW.id;

    -- Fire webhook asynchronously using pg_net
    PERFORM net.http_post(
      url => 'http://host.docker.internal:3000/api/analysis',
      body => jsonb_build_object(
        'type', 'AI_ANALYSIS',
        'applicant_id', NEW.id
      ),
      headers => '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds => 5000
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CREATE WEBHOOK TRIGGERS
-- =============================================================================

-- CV processing webhook (AFTER to ensure record is committed)
CREATE TRIGGER webhook_cv_trigger
  AFTER INSERT OR UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_cv_processing();

-- LinkedIn processing webhook
CREATE TRIGGER webhook_linkedin_trigger
  AFTER INSERT OR UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_linkedin_processing();

-- GitHub processing webhook
CREATE TRIGGER webhook_github_trigger
  AFTER INSERT OR UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_github_processing();

-- AI analysis webhook
CREATE TRIGGER webhook_ai_trigger
  AFTER UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.webhook_ai_analysis();

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to create applicant with automatic processing
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
    ai_status,
    status
  ) VALUES (
    p_user_id,
    p_cv_file_id,
    p_linkedin_url,
    p_github_url,
    CASE WHEN p_cv_file_id IS NOT NULL THEN 'pending' ELSE 'ready' END,
    CASE WHEN p_linkedin_url IS NOT NULL THEN 'pending' ELSE 'ready' END,
    CASE WHEN p_github_url IS NOT NULL THEN 'pending' ELSE 'ready' END,
    'pending',
    'processing'
  ) RETURNING id INTO applicant_id;

  RETURN applicant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to monitor webhook calls
CREATE OR REPLACE FUNCTION public.get_recent_webhook_calls(
  limit_count INTEGER DEFAULT 10
) RETURNS TABLE (
  id BIGINT,
  method TEXT,
  url TEXT,
  headers JSONB,
  body BYTEA,
  timeout_milliseconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.method::text,
    q.url,
    q.headers,
    q.body,
    q.timeout_milliseconds
  FROM net.http_request_queue q
  ORDER BY q.id DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUTO-CREATE USER ON SIGNUP
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(
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

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.applicants IS 'Clean Database Webhooks architecture for automatic processing';
COMMENT ON FUNCTION public.webhook_cv_processing() IS 'Database Webhook: Process CV when file attached';
COMMENT ON FUNCTION public.webhook_linkedin_processing() IS 'Database Webhook: Process LinkedIn when URL provided';
COMMENT ON FUNCTION public.webhook_github_processing() IS 'Database Webhook: Process GitHub when URL provided';
COMMENT ON FUNCTION public.webhook_ai_analysis() IS 'Database Webhook: Run AI analysis when enough data ready';
