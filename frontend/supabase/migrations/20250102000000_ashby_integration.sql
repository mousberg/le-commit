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
  email text,
  phone text,
  location text,
  linkedin_url text,
  github_url text,
  website_url text,
  source text,
  credited_to_id text,
  credited_to_name text,
  job_id text,
  job_title text,
  application_id text,
  application_status text,
  application_stage text,
  application_archived_at timestamp with time zone,
  ashby_created_at timestamp with time zone,
  ashby_updated_at timestamp with time zone,
  resume_file_handle text,
  -- Storage path for CV stored in Supabase
  cv_storage_path text,
  -- Additional contact and professional information
  emails jsonb default '[]'::jsonb,
  phone_numbers jsonb default '[]'::jsonb,
  social_links jsonb default '[]'::jsonb,
  websites jsonb default '[]'::jsonb,
  company text,
  title text,
  school text,
  degree text,
  tags jsonb default '[]'::jsonb,
  source_id text,
  -- Analysis results
  analysis_result jsonb,
  analysis_status text default 'pending'::text,
  analysis_completed_at timestamp with time zone,
  -- Additional Ashby-specific fields
  resume_url text,
  all_file_handles jsonb default '[]'::jsonb,
  custom_fields jsonb default '{}'::jsonb,
  has_resume boolean default false,
  profile_url text,
  phone_number text,
  position text,
  location_summary text,
  location_details jsonb,
  timezone text,
  source_info jsonb,
  last_synced_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unmask_applicant_id uuid references public.applicants(id) on delete set null,
  fraud_likelihood text,
  fraud_reason text,
  -- Cache metadata
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
create index idx_ashby_candidates_application_id on public.ashby_candidates(application_id);
create index idx_ashby_candidates_cv_storage_path on public.ashby_candidates(cv_storage_path) where cv_storage_path is not null;
create index idx_ashby_candidates_emails on public.ashby_candidates using gin (emails);
create index idx_ashby_candidates_phone_numbers on public.ashby_candidates using gin (phone_numbers);
create index idx_ashby_candidates_unmask_applicant_id on public.ashby_candidates(unmask_applicant_id);
create index idx_ashby_candidates_analysis_status on public.ashby_candidates(analysis_status);
create index idx_ashby_candidates_fraud_likelihood on public.ashby_candidates(fraud_likelihood);

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

-- Function to sync candidate data between Ashby cache and applicants
create or replace function public.sync_ashby_candidate_to_applicant()
returns trigger as $$
declare
  existing_applicant_id uuid;
begin
  -- Only sync if analysis is completed
  if new.analysis_status = 'completed' and new.analysis_result is not null then
    -- Check if applicant already exists
    select id into existing_applicant_id
    from public.applicants
    where ashby_candidate_id = new.ashby_id
    and user_id = new.user_id;
    
    if existing_applicant_id is not null then
      -- Update existing applicant
      update public.applicants
      set 
        analysis = new.analysis_result,
        status = 'completed',
        ashby_sync_status = 'synced',
        ashby_last_synced_at = now(),
        updated_at = now()
      where id = existing_applicant_id;
      
      -- Update the link in ashby_candidates
      update public.ashby_candidates
      set unmask_applicant_id = existing_applicant_id
      where id = new.id;
    else
      -- Create new applicant
      insert into public.applicants (
        user_id, name, email, phone, github_url, linkedin_url,
        analysis, status, ashby_candidate_id, ashby_sync_status, ashby_last_synced_at
      ) values (
        new.user_id, new.name, new.email, new.phone, null, new.linkedin_url,
        new.analysis_result, 'completed', new.ashby_id, 'synced', now()
      ) returning id into existing_applicant_id;
      
      -- Update the link in ashby_candidates
      update public.ashby_candidates
      set unmask_applicant_id = existing_applicant_id
      where id = new.id;
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync data when analysis is updated
create trigger sync_ashby_analysis_to_applicant
  after update of analysis_result on public.ashby_candidates
  for each row execute procedure public.sync_ashby_candidate_to_applicant();

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