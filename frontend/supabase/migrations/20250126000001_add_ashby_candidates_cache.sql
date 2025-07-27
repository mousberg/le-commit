-- Add Ashby candidate caching table and related columns
-- This allows us to cache Ashby candidates locally to reduce API calls

-- ============================================================================
-- ADD ASHBY INTEGRATION COLUMNS TO APPLICANTS TABLE
-- ============================================================================

-- Add Ashby-related columns to existing applicants table
alter table applicants 
add column if not exists ashby_candidate_id text unique,
add column if not exists ashby_sync_status text default 'not_synced' check (ashby_sync_status in ('not_synced', 'pending', 'synced', 'error')),
add column if not exists ashby_last_synced_at timestamptz,
add column if not exists priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent'));

-- Add index for Ashby candidate lookups
create index if not exists idx_applicants_ashby_candidate_id on applicants(ashby_candidate_id);

-- ============================================================================
-- CREATE ASHBY CANDIDATES CACHE TABLE
-- ============================================================================

-- Cache table for Ashby candidates to reduce API calls
create table ashby_candidates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  
  -- Ashby candidate data
  ashby_id text not null,
  name text not null,
  email text,
  linkedin_url text,
  has_resume boolean default false,
  resume_file_handle text,
  resume_url text,
  
  -- Metadata from Ashby
  tags text[] default '{}',
  custom_fields jsonb default '{}',
  ashby_created_at timestamptz,
  
  -- Our tracking data
  unmask_applicant_id uuid references applicants(id) on delete set null,
  last_synced_at timestamptz default now(),
  sync_status text default 'cached' check (sync_status in ('cached', 'processing', 'error')),
  
  -- Fraud analysis results (cached from analysis)
  fraud_likelihood text check (fraud_likelihood in ('low', 'medium', 'high')),
  fraud_reason text,
  analysis_summary jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Unique constraint to prevent duplicates
  unique(user_id, ashby_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

create index idx_ashby_candidates_user_id on ashby_candidates(user_id);
create index idx_ashby_candidates_ashby_id on ashby_candidates(ashby_id);
create index idx_ashby_candidates_last_synced on ashby_candidates(last_synced_at);
create index idx_ashby_candidates_fraud_likelihood on ashby_candidates(fraud_likelihood);
create index idx_ashby_candidates_unmask_applicant_id on ashby_candidates(unmask_applicant_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
create trigger update_ashby_candidates_updated_at 
  before update on ashby_candidates
  for each row execute function update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
alter table ashby_candidates enable row level security;

-- Users can only see/manage their own Ashby candidates
create policy "ashby_candidates_own" on ashby_candidates
  for all to authenticated
  using (
    user_id in (
      select id from users where auth_user_id = auth.uid()
    )
  )
  with check (
    user_id in (
      select id from users where auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to sync candidate data between Ashby cache and applicants
create or replace function sync_ashby_candidate_data()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  -- When an applicant is updated with analysis results, update the Ashby candidate cache
  if NEW.analysis_result is not null and NEW.ashby_candidate_id is not null then
    update ashby_candidates 
    set 
      fraud_likelihood = case 
        when (NEW.analysis_result->>'credibility_score')::numeric < 50 then 'high'
        when (NEW.analysis_result->>'credibility_score')::numeric < 70 then 'medium'
        else 'low'
      end,
      fraud_reason = case 
        when jsonb_array_length(NEW.analysis_result->'flags') > 0 
        then (NEW.analysis_result->'flags'->0)::text
        else 'No issues detected'
      end,
      analysis_summary = NEW.analysis_result,
      updated_at = now()
    where ashby_id = NEW.ashby_candidate_id 
      and user_id = NEW.user_id;
  end if;
  
  return NEW;
end;
$$;

-- Trigger to sync data when applicant analysis is updated
create trigger sync_ashby_candidate_analysis
  after update of analysis_result on applicants
  for each row execute function sync_ashby_candidate_data();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get all cached Ashby candidates for a user
create or replace function get_user_ashby_candidates()
returns table (
  ashby_id text,
  name text,
  email text,
  linkedin_url text,
  has_resume boolean,
  resume_url text,
  tags text[],
  unmask_applicant_id uuid,
  fraud_likelihood text,
  fraud_reason text,
  last_synced_at timestamptz,
  ashby_created_at timestamptz
)
security definer
set search_path = public
language plpgsql
as $$
begin
  return query
  select
    ac.ashby_id,
    ac.name,
    ac.email,
    ac.linkedin_url,
    ac.has_resume,
    ac.resume_url,
    ac.tags,
    ac.unmask_applicant_id,
    ac.fraud_likelihood,
    ac.fraud_reason,
    ac.last_synced_at,
    ac.ashby_created_at
  from ashby_candidates ac
  join users u on ac.user_id = u.id
  where u.auth_user_id = auth.uid()
  order by ac.ashby_created_at desc nulls last, ac.created_at desc;
end;
$$;