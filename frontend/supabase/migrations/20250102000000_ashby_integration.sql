-- =============================================================================
-- Ashby ATS Integration for Le-Commit (Unmask)
-- =============================================================================
-- This migration adds Ashby ATS integration functionality including:
-- - Ashby candidate caching and synchronization
-- - Links between existing applicants and Ashby candidates
-- - Analysis and verification workflows for ATS candidates
-- =============================================================================

-- =============================================================================
-- ASHBY INTEGRATION TABLES
-- =============================================================================

-- Add Ashby integration fields to existing applicants table
alter table public.applicants add column if not exists ashby_candidate_id text;
alter table public.applicants add column if not exists ashby_sync_status text;
alter table public.applicants add column if not exists ashby_last_synced_at timestamp with time zone;

-- Ashby candidates cache table
create table if not exists public.ashby_candidates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ashby_id text not null unique,
  name text not null,
  email text, -- primaryEmailAddress.value
  phone text, -- primaryPhoneNumber.value
  position text,
  company text,
  school text,
  location_summary text, -- locationSummary if present
  linkedin_url text, -- extracted from socialLinks
  github_url text, -- extracted from socialLinks
  website_url text, -- extracted from socialLinks
  
  -- Resume handling
  resume_file_handle jsonb, -- full resumeFileHandle object from API
  cv_storage_path text, -- path in our Supabase storage
  has_resume boolean default false,
  resume_url text, -- generated URL for resume access
  
  -- Timestamps from Ashby
  ashby_created_at timestamp with time zone,
  ashby_updated_at timestamp with time zone,
  
  -- JSONB arrays (structured data from API)
  emails jsonb default '[]'::jsonb, -- emailAddresses array
  phone_numbers jsonb default '[]'::jsonb, -- phoneNumbers array
  social_links jsonb default '[]'::jsonb, -- socialLinks array
  tags jsonb default '[]'::jsonb, -- tags array
  application_ids jsonb default '[]'::jsonb, -- applicationIds array
  all_file_handles jsonb default '[]'::jsonb, -- fileHandles array
  
  -- Analysis results
  analysis_result jsonb,
  analysis_status text default 'pending'::text,
  analysis_completed_at timestamp with time zone,
  
  -- Source information
  source jsonb, -- full source object including sourceType
  source_title text, -- source.title for easy querying
  credited_to_user jsonb, -- creditedToUser object
  credited_to_name text, -- creditedToUser.firstName + lastName for easy access
  
  -- Additional fields
  custom_fields jsonb default '{}'::jsonb,
  location_details jsonb, -- full location object if needed
  timezone text,
  profile_url text, -- Ashby profile URL
  
  -- Links to our system
  unmask_applicant_id uuid references public.applicants(id) on delete set null,
  fraud_likelihood text,
  fraud_reason text,
  
  -- Cache metadata
  last_synced_at timestamp with time zone default timezone('utc'::text, now()) not null,
  cached_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint unique_user_ashby_candidate unique(user_id, ashby_id)
);

-- =============================================================================
-- ASHBY INDEXES
-- =============================================================================

create index idx_applicants_ashby_candidate_id on public.applicants(ashby_candidate_id);
create index idx_ashby_candidates_user_id on public.ashby_candidates(user_id);
create index idx_ashby_candidates_ashby_id on public.ashby_candidates(ashby_id);
create index idx_ashby_candidates_email on public.ashby_candidates(email);
create index idx_ashby_candidates_application_ids on public.ashby_candidates using gin (application_ids);
create index idx_ashby_candidates_cv_storage_path on public.ashby_candidates(cv_storage_path) where cv_storage_path is not null;
create index idx_ashby_candidates_emails on public.ashby_candidates using gin (emails);
create index idx_ashby_candidates_phone_numbers on public.ashby_candidates using gin (phone_numbers);
create index idx_ashby_candidates_unmask_applicant_id on public.ashby_candidates(unmask_applicant_id);
create index idx_ashby_candidates_analysis_status on public.ashby_candidates(analysis_status);
create index idx_ashby_candidates_fraud_likelihood on public.ashby_candidates(fraud_likelihood);
create index idx_ashby_candidates_source_title on public.ashby_candidates(source_title);
create index idx_ashby_candidates_credited_to_name on public.ashby_candidates(credited_to_name);

-- =============================================================================
-- ASHBY TRIGGERS
-- =============================================================================

-- Apply updated_at trigger to ashby_candidates
create trigger handle_ashby_candidates_updated_at before update on public.ashby_candidates
  for each row execute procedure public.handle_updated_at();

-- =============================================================================
-- ASHBY ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on Ashby candidates table
alter table public.ashby_candidates enable row level security;

-- Ashby candidates policies
create policy "Users can manage own Ashby candidates" on public.ashby_candidates
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- ASHBY INTEGRATION FUNCTIONS
-- =============================================================================

-- Function to sync ashby_candidates to applicants table
create or replace function public.sync_ashby_candidate_to_applicant()
returns trigger as $$
begin
  -- Check if applicant already exists with this ashby_candidate_id
  if exists (
    select 1 from public.applicants 
    where ashby_candidate_id = new.ashby_id 
    and user_id = new.user_id
  ) then
    -- Update existing applicant
    update public.applicants
    set
      name = new.name,
      email = new.email,
      phone = new.phone,
      linkedin_url = new.linkedin_url,
      github_url = new.github_url,
      ashby_sync_status = 'synced',
      ashby_last_synced_at = now(),
      updated_at = now()
    where ashby_candidate_id = new.ashby_id 
    and user_id = new.user_id;
  else
    -- Insert new applicant
    insert into public.applicants (
      user_id,
      ashby_candidate_id,
      name,
      email,
      phone,
      linkedin_url,
      github_url,
      ashby_sync_status,
      ashby_last_synced_at,
      status,
      created_at,
      updated_at
    ) values (
      new.user_id,
      new.ashby_id,
      new.name,
      new.email,
      new.phone,
      new.linkedin_url,
      new.github_url,
      'synced',
      now(),
      'uploading',
      coalesce(new.ashby_created_at, now()),
      now()
    );
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create triggers for insert and update operations
create trigger sync_ashby_candidates_insert
  after insert on public.ashby_candidates
  for each row execute function sync_ashby_candidate_to_applicant();

create trigger sync_ashby_candidates_update
  after update on public.ashby_candidates
  for each row execute function sync_ashby_candidate_to_applicant();

-- Get all cached Ashby candidates for a user
create or replace function public.get_user_ashby_candidates(
  p_user_id uuid,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  candidate json
) as $$
begin
  return query
  select row_to_json(ac.*)
  from public.ashby_candidates ac
  where ac.user_id = p_user_id
  order by ac.ashby_updated_at desc nulls last, ac.ashby_created_at desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable security definer;

-- Function to link existing applicant with Ashby candidate
create or replace function public.link_applicant_to_ashby_candidate(
  p_applicant_id uuid,
  p_ashby_candidate_id text,
  p_user_id uuid
)
returns boolean as $$
declare
  candidate_exists boolean := false;
begin
  -- Verify the Ashby candidate exists and belongs to the user
  select exists(
    select 1 from public.ashby_candidates 
    where ashby_id = p_ashby_candidate_id 
    and user_id = p_user_id
  ) into candidate_exists;
  
  if not candidate_exists then
    return false;
  end if;
  
  -- Update the applicant with Ashby link
  update public.applicants
  set 
    ashby_candidate_id = p_ashby_candidate_id,
    ashby_sync_status = 'linked',
    ashby_last_synced_at = now(),
    updated_at = now()
  where id = p_applicant_id and user_id = p_user_id;
  
  -- Update the Ashby candidate with applicant link
  update public.ashby_candidates
  set 
    unmask_applicant_id = p_applicant_id,
    updated_at = now()
  where ashby_id = p_ashby_candidate_id and user_id = p_user_id;
  
  return true;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- COMMENTS
-- =============================================================================

comment on table public.ashby_candidates is 'Cache of candidates from Ashby ATS integration';
comment on column public.applicants.ashby_candidate_id is 'Links to ashby_candidates.ashby_id for synced candidates';
comment on column public.ashby_candidates.cv_storage_path is 'Path to CV file stored in Supabase Storage candidate-cvs bucket';
comment on column public.ashby_candidates.unmask_applicant_id is 'Links to applicants table for synchronized records';
comment on column public.ashby_candidates.fraud_likelihood is 'AI-assessed fraud risk level: low, medium, high';
comment on column public.ashby_candidates.fraud_reason is 'Explanation of why candidate was flagged for fraud risk';
comment on column public.ashby_candidates.github_url is 'GitHub profile URL for the candidate';