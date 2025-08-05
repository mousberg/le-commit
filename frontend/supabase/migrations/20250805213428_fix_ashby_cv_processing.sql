-- Fix Ashby CV processing to use consistent pipeline and shared files
-- This migration updates the flow to have ashby_candidates and applicants share the same file records

-- Add cv_file_id column to ashby_candidates table to reference the same files as applicants
ALTER TABLE public.ashby_candidates 
ADD COLUMN IF NOT EXISTS cv_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_cv_file_id ON public.ashby_candidates(cv_file_id);

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

COMMENT ON FUNCTION public.sync_ashby_candidate_to_applicant() IS 'Syncs Ashby candidates to applicants table with shared file references';
COMMENT ON COLUMN public.ashby_candidates.cv_file_id IS 'Shared reference to the same file record as applicants table';