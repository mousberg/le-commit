-- Simple User to Applicant Schema (No Workspaces)
-- Clean, minimal schema for MVP without workspace complexity

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- CORE TABLES: Ultra-simple relationships
-- ============================================================================

-- Users table (minimal profile data)
create table users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade unique not null,
  email text not null,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Applicants table (belongs directly to user)
create table applicants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  email text,
  status text not null default 'uploading' check (status in ('uploading', 'processing', 'analyzing', 'completed', 'failed')),
  
  -- Core data
  cv_data jsonb,
  linkedin_data jsonb,
  github_data jsonb,
  analysis_result jsonb,
  individual_analysis jsonb,
  cross_reference_analysis jsonb,
  
  -- Metadata
  original_filename text,
  original_github_url text,
  score integer,
  role text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Files table (belongs to applicant)
create table files (
  id uuid primary key default uuid_generate_v4(),
  applicant_id uuid references applicants(id) on delete cascade not null,
  file_type text not null check (file_type in ('cv', 'linkedin', 'github', 'other')),
  original_filename text not null,
  storage_path text not null,
  storage_bucket text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES: Simple performance optimization
-- ============================================================================

create index idx_users_auth_user_id on users(auth_user_id);
create index idx_applicants_user_id on applicants(user_id);
create index idx_applicants_status on applicants(status);
create index idx_files_applicant_id on files(applicant_id);

-- ============================================================================
-- TRIGGERS: Updated at
-- ============================================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at 
  before update on users
  for each row execute function update_updated_at_column();

create trigger update_applicants_updated_at 
  before update on applicants
  for each row execute function update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY: Super simple policies
-- ============================================================================

-- Enable RLS
alter table users enable row level security;
alter table applicants enable row level security;
alter table files enable row level security;

-- Users can only see/manage their own profile
create policy "users_own_profile" on users
  for all to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Users can only see/manage their own applicants
create policy "applicants_own" on applicants
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

-- Users can only see/manage files for their own applicants
create policy "files_own" on files
  for all to authenticated
  using (
    applicant_id in (
      select a.id from applicants a
      join users u on a.user_id = u.id
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    applicant_id in (
      select a.id from applicants a
      join users u on a.user_id = u.id
      where u.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- STORAGE: Simple file storage
-- ============================================================================

-- Create storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('cv-files', 'cv-files', false, 52428800, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('linkedin-files', 'linkedin-files', false, 52428800, array['application/pdf']),
  ('other-files', 'other-files', false, 52428800, null);

-- Simple storage policy (users access their own applicant files)
create policy "storage_user_files" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('cv-files', 'linkedin-files', 'other-files') and
    (storage.foldername(name))[1] in (
      select a.id::text from applicants a
      join users u on a.user_id = u.id
      where u.auth_user_id = auth.uid()
    )
  )
  with check (
    bucket_id in ('cv-files', 'linkedin-files', 'other-files') and
    (storage.foldername(name))[1] in (
      select a.id::text from applicants a
      join users u on a.user_id = u.id
      where u.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- USER MANAGEMENT: Auto-create user profiles
-- ============================================================================

-- Function to handle new user signup
create or replace function handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.users (auth_user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  return new;
exception 
  when unique_violation then
    -- User already exists, skip
    return new;
end;
$$;

-- Trigger to create user profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- UTILITY FUNCTIONS: Simple helpers
-- ============================================================================

-- Get user's applicants (simple, no workspace complexity)
create or replace function get_user_applicants()
returns table (
  applicant_id uuid,
  applicant_name text,
  applicant_email text,
  status text,
  score integer,
  role text,
  file_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
security definer
set search_path = public
language plpgsql
as $$
begin
  return query
  select
    a.id,
    a.name,
    a.email,
    a.status,
    a.score,
    a.role,
    (select count(*) from files f where f.applicant_id = a.id),
    a.created_at,
    a.updated_at
  from applicants a
  join users u on a.user_id = u.id
  where u.auth_user_id = auth.uid()
  order by a.created_at desc;
end;
$$;