-- =============================================================================
-- Ashby ATS Integration for Le-Commit
-- =============================================================================
-- This migration adds Ashby ATS integration functionality including:
-- - Ashby candidate caching and synchronization
-- - Links between existing applicants and Ashby candidates
-- - Analysis and verification workflows for ATS candidates
-- - Source tracking for applicants
-- - Removes unused Ashby fields from users table
-- =============================================================================

-- =============================================================================
-- REMOVE UNUSED ASHBY FIELDS FROM USERS TABLE
-- =============================================================================

-- Remove ashby_sync_cursor field from users table if it exists
ALTER TABLE public.users DROP COLUMN IF EXISTS ashby_sync_cursor;

-- Remove ashby_features field from users table if it exists
ALTER TABLE public.users DROP COLUMN IF EXISTS ashby_features;

-- Add comment to ashby_api_key field
COMMENT ON COLUMN public.users.ashby_api_key IS 'Ashby API key for integration - uses environment variable in development mode';

-- =============================================================================
-- ADD SOURCE FIELD TO APPLICANTS TABLE
-- =============================================================================

-- Add source field to track where applicants come from
ALTER TABLE public.applicants 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' CHECK (source IN ('manual', 'ashby', 'greenhouse', 'lever', 'workday'));

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_applicants_source ON public.applicants(source);

-- =============================================================================
-- ASHBY CANDIDATES CACHE TABLE
-- =============================================================================

-- Ashby candidates cache table
CREATE TABLE IF NOT EXISTS public.ashby_candidates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ashby_id text NOT NULL UNIQUE,
  name text NOT NULL,
  email text, -- primaryEmailAddress.value
  phone text, -- primaryPhoneNumber.value
  position text,
  company text,
  school text,
  location_summary text, -- locationSummary if present
  linkedin_url text, -- extracted from socialLinks
  github_url text, -- extracted from socialLinks
  website_url text, -- extracted from socialLinks
  
  -- Timestamps from Ashby
  ashby_created_at timestamp with time zone,
  ashby_updated_at timestamp with time zone,
  
  -- JSONB arrays (structured data from API)
  emails jsonb DEFAULT '[]'::jsonb, -- emailAddresses array
  phone_numbers jsonb DEFAULT '[]'::jsonb, -- phoneNumbers array
  social_links jsonb DEFAULT '[]'::jsonb, -- socialLinks array
  tags jsonb DEFAULT '[]'::jsonb, -- tags array
  application_ids jsonb DEFAULT '[]'::jsonb, -- applicationIds array
  all_file_handles jsonb DEFAULT '[]'::jsonb, -- fileHandles array
  resume_file_handle jsonb, -- full resumeFileHandle object from API
  
  -- Source information
  source jsonb, -- full source object including sourceType
  source_title text, -- source.title for easy querying
  credited_to_user jsonb, -- creditedToUser object
  credited_to_name text, -- creditedToUser.firstName + lastName for easy access
  
  -- Additional fields
  custom_fields jsonb DEFAULT '{}'::jsonb,
  location_details jsonb, -- full location object if needed
  timezone text,
  profile_url text, -- Ashby profile URL
  unmask_applicant_id uuid REFERENCES public.applicants(id) ON DELETE SET NULL,
  cv_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL, -- Shared reference to same file as applicants
  
  -- Cache metadata
  last_synced_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  cached_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT unique_user_ashby_candidate UNIQUE(user_id, ashby_id)
);

-- =============================================================================
-- ASHBY INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ashby_candidates_user_id ON public.ashby_candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_ashby_id ON public.ashby_candidates(ashby_id);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_email ON public.ashby_candidates(email);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_application_ids ON public.ashby_candidates USING gin (application_ids);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_emails ON public.ashby_candidates USING gin (emails);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_phone_numbers ON public.ashby_candidates USING gin (phone_numbers);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_unmask_applicant_id ON public.ashby_candidates(unmask_applicant_id);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_source_title ON public.ashby_candidates(source_title);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_credited_to_name ON public.ashby_candidates(credited_to_name);
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_cv_file_id ON public.ashby_candidates(cv_file_id);

-- =============================================================================
-- ASHBY TRIGGERS
-- =============================================================================

-- Apply updated_at trigger to ashby_candidates
CREATE TRIGGER handle_ashby_candidates_updated_at BEFORE UPDATE ON public.ashby_candidates
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =============================================================================
-- ASHBY ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on Ashby candidates table
ALTER TABLE public.ashby_candidates ENABLE ROW LEVEL SECURITY;

-- Ashby candidates policies
CREATE POLICY "Users can manage own Ashby candidates" ON public.ashby_candidates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- ASHBY INTEGRATION FUNCTIONS
-- =============================================================================

-- Function to handle Ashby candidate synchronization with shared file references
CREATE OR REPLACE FUNCTION public.sync_ashby_candidate_to_applicant()
RETURNS trigger AS $$
DECLARE
  applicant_id uuid;
BEGIN
  -- Check if this ashby candidate is already linked to an applicant
  IF NEW.unmask_applicant_id IS NOT NULL THEN
    -- Update existing linked applicant (keep same cv_file_id if it exists)
    UPDATE public.applicants
    SET
      name = NEW.name,
      email = NEW.email,
      phone = NEW.phone,
      linkedin_url = NEW.linkedin_url,
      github_url = NEW.github_url,
      source = 'ashby',
      cv_file_id = COALESCE(NEW.cv_file_id, cv_file_id), -- Use shared file if available
      updated_at = now()
    WHERE id = NEW.unmask_applicant_id;
  ELSE
    -- Insert new applicant with shared file reference
    INSERT INTO public.applicants (
      user_id,
      name,
      email,
      phone,
      linkedin_url,
      github_url,
      source,
      cv_file_id,
      cv_status,
      li_status,
      gh_status,
      ai_status,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_id,
      NEW.name,
      NEW.email,
      NEW.phone,
      NEW.linkedin_url,
      NEW.github_url,
      'ashby',
      NEW.cv_file_id, -- Use the same file reference
      CASE 
        WHEN NEW.cv_file_id IS NOT NULL THEN 'pending'::processing_status 
        WHEN NEW.resume_file_handle IS NOT NULL THEN 'pending'::processing_status 
        ELSE 'not_provided'::processing_status 
      END,
      CASE WHEN NEW.linkedin_url IS NOT NULL THEN 'pending'::processing_status ELSE 'not_provided'::processing_status END,
      CASE WHEN NEW.github_url IS NOT NULL THEN 'pending'::processing_status ELSE 'not_provided'::processing_status END,
      'pending'::processing_status,
      COALESCE(NEW.ashby_created_at, now()),
      now()
    ) RETURNING id INTO applicant_id;
    
    -- Update the ashby_candidates record with the new applicant ID
    UPDATE public.ashby_candidates
    SET unmask_applicant_id = applicant_id
    WHERE id = NEW.id;
    
    -- If there's a resume file handle but no cv_file_id yet, trigger download
    IF NEW.resume_file_handle IS NOT NULL AND NEW.cv_file_id IS NULL THEN
      PERFORM net.http_post(
        url => 'http://host.docker.internal:3000/api/ashby/files',
        body => jsonb_build_object(
          'candidateId', NEW.ashby_id,
          'fileHandle', NEW.resume_file_handle,
          'applicantId', applicant_id,
          'mode', 'shared_file'
        ),
        headers => '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds => 10000
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for insert and update operations
CREATE TRIGGER sync_ashby_candidates_insert
  AFTER INSERT ON public.ashby_candidates
  FOR EACH ROW EXECUTE FUNCTION sync_ashby_candidate_to_applicant();

CREATE TRIGGER sync_ashby_candidates_update
  AFTER UPDATE ON public.ashby_candidates
  FOR EACH ROW 
  WHEN (OLD.name IS DISTINCT FROM NEW.name 
    OR OLD.email IS DISTINCT FROM NEW.email
    OR OLD.phone IS DISTINCT FROM NEW.phone
    OR OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url
    OR OLD.github_url IS DISTINCT FROM NEW.github_url)
  EXECUTE FUNCTION sync_ashby_candidate_to_applicant();

-- Get all cached Ashby candidates for a user
CREATE OR REPLACE FUNCTION public.get_user_ashby_candidates(
  p_user_id uuid,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  candidate json
) AS $$
BEGIN
  RETURN QUERY
  SELECT row_to_json(ac.*)
  FROM public.ashby_candidates ac
  WHERE ac.user_id = p_user_id
  ORDER BY ac.ashby_updated_at DESC NULLS LAST, ac.ashby_created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to link existing applicant with Ashby candidate
CREATE OR REPLACE FUNCTION public.link_applicant_to_ashby_candidate(
  p_applicant_id uuid,
  p_ashby_candidate_id text,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  candidate_exists boolean := false;
BEGIN
  -- Verify the Ashby candidate exists and belongs to the user
  SELECT EXISTS(
    SELECT 1 FROM public.ashby_candidates 
    WHERE ashby_id = p_ashby_candidate_id 
    AND user_id = p_user_id
  ) INTO candidate_exists;
  
  IF NOT candidate_exists THEN
    RETURN false;
  END IF;
  
  -- Update the applicant source
  UPDATE public.applicants
  SET 
    source = 'ashby',
    updated_at = now()
  WHERE id = p_applicant_id AND user_id = p_user_id;
  
  -- Update the Ashby candidate with applicant link
  UPDATE public.ashby_candidates
  SET 
    unmask_applicant_id = p_applicant_id,
    updated_at = now()
  WHERE ashby_id = p_ashby_candidate_id AND user_id = p_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.ashby_candidates IS 'Cache of candidates from Ashby ATS integration';
COMMENT ON COLUMN public.applicants.source IS 'Source system where the applicant was created (manual, ashby, etc)';
COMMENT ON COLUMN public.ashby_candidates.unmask_applicant_id IS 'Links to applicants table for synchronized records';
COMMENT ON COLUMN public.ashby_candidates.cv_file_id IS 'Shared reference to the same file record as applicants table';
COMMENT ON COLUMN public.ashby_candidates.github_url IS 'GitHub profile URL for the candidate';
COMMENT ON FUNCTION public.sync_ashby_candidate_to_applicant() IS 'Syncs Ashby candidates to applicants table with shared file references';