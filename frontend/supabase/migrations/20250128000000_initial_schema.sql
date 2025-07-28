-- =============================================================================
-- Initial Schema for Le-Commit (Unmask) - AI-powered hiring verification platform
-- =============================================================================
-- This migration consolidates all previous migrations into a single file
-- for a clean schema setup.
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table (profile data linked to auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Applicants table (candidates being verified)
create table public.applicants (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  email text not null,
  phone text,
  github_url text,
  linkedin_url text,
  analysis jsonb,
  status text default 'pending'::text,
  -- Ashby integration fields
  ashby_candidate_id text,
  ashby_sync_status text,
  ashby_last_synced_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Files table (uploaded documents)
create table public.files (
  id uuid default uuid_generate_v4() primary key,
  applicant_id uuid references public.applicants(id) on delete cascade not null,
  file_name text not null,
  file_type text not null,
  file_url text not null,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ashby candidates cache table
create table public.ashby_candidates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ashby_id text not null unique,
  name text not null,
  email text,
  phone text,
  location text,
  linkedin_url text,
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
  created_at_ashby timestamp with time zone,
  updated_at_ashby timestamp with time zone,
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
  -- Cache metadata
  cached_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_ashby_candidate unique(user_id, ashby_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index idx_users_email on public.users(email);
create index idx_applicants_user_id on public.applicants(user_id);
create index idx_applicants_status on public.applicants(status);
create index idx_applicants_ashby_candidate_id on public.applicants(ashby_candidate_id);
create index idx_files_applicant_id on public.files(applicant_id);
create index idx_ashby_candidates_user_id on public.ashby_candidates(user_id);
create index idx_ashby_candidates_ashby_id on public.ashby_candidates(ashby_id);
create index idx_ashby_candidates_email on public.ashby_candidates(email);
create index idx_ashby_candidates_application_id on public.ashby_candidates(application_id);
create index idx_ashby_candidates_cv_storage_path on public.ashby_candidates(cv_storage_path) where cv_storage_path is not null;
create index idx_ashby_candidates_emails on public.ashby_candidates using gin (emails);
create index idx_ashby_candidates_phone_numbers on public.ashby_candidates using gin (phone_numbers);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Apply updated_at triggers
create trigger handle_users_updated_at before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger handle_applicants_updated_at before update on public.applicants
  for each row execute procedure public.handle_updated_at();

create trigger handle_ashby_candidates_updated_at before update on public.ashby_candidates
  for each row execute procedure public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.applicants enable row level security;
alter table public.files enable row level security;
alter table public.ashby_candidates enable row level security;

-- Users policies
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Applicants policies
create policy "Users can view own applicants" on public.applicants
  for select using (auth.uid() = user_id);

create policy "Users can insert own applicants" on public.applicants
  for insert with check (auth.uid() = user_id);

create policy "Users can update own applicants" on public.applicants
  for update using (auth.uid() = user_id);

create policy "Users can delete own applicants" on public.applicants
  for delete using (auth.uid() = user_id);

-- Files policies
create policy "Users can view files for own applicants" on public.files
  for select using (
    exists (
      select 1 from public.applicants
      where applicants.id = files.applicant_id
      and applicants.user_id = auth.uid()
    )
  );

create policy "Users can upload files for own applicants" on public.files
  for insert with check (
    exists (
      select 1 from public.applicants
      where applicants.id = files.applicant_id
      and applicants.user_id = auth.uid()
    )
  );

create policy "Users can delete files for own applicants" on public.files
  for delete using (
    exists (
      select 1 from public.applicants
      where applicants.id = files.applicant_id
      and applicants.user_id = auth.uid()
    )
  );

-- Ashby candidates policies
create policy "Users can manage own Ashby candidates" on public.ashby_candidates
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Create storage bucket for candidate CVs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-cvs',
  'candidate-cvs', 
  false,
  52428800, -- 50MB
  '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain}'
) on conflict (id) do nothing;

-- Storage policies for candidate CVs
create policy "Users can upload CVs to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'candidate-cvs' and
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can view own CVs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'candidate-cvs' and
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can update own CVs" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'candidate-cvs' and
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can delete own CVs" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'candidate-cvs' and
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- =============================================================================
-- USER MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Get user's applicants
create or replace function public.get_user_applicants(user_uuid uuid)
returns setof public.applicants as $$
begin
  return query
  select * from public.applicants
  where user_id = user_uuid
  order by created_at desc;
end;
$$ language plpgsql security definer;

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
    else
      -- Create new applicant
      insert into public.applicants (
        user_id, name, email, phone, github_url, linkedin_url,
        analysis, status, ashby_candidate_id, ashby_sync_status, ashby_last_synced_at
      ) values (
        new.user_id, new.name, new.email, new.phone, null, new.linkedin_url,
        new.analysis_result, 'completed', new.ashby_id, 'synced', now()
      );
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
  order by ac.updated_at_ashby desc nulls last, ac.created_at_ashby desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable security definer;

-- =============================================================================
-- COMMENTS
-- =============================================================================

comment on table public.users is 'User profiles linked to auth.users';
comment on table public.applicants is 'Job applicants being verified through the platform';
comment on table public.files is 'Uploaded documents associated with applicants';
comment on table public.ashby_candidates is 'Cache of candidates from Ashby ATS integration';
comment on column public.applicants.ashby_candidate_id is 'Links to ashby_candidates.ashby_id for synced candidates';
comment on column public.ashby_candidates.cv_storage_path is 'Path to CV file stored in Supabase Storage candidate-cvs bucket';