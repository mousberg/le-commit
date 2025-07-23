-- Fix users table to use auth.users(id) as primary key directly
-- This eliminates the dual ID complexity

-- Drop existing constraints and recreate table properly
drop table if exists files cascade;
drop table if exists applicants cascade;
drop table if exists users cascade;

-- Create users table with auth.users(id) as primary key
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Recreate applicants table
create table applicants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  email text,
  status text not null default 'uploading' check (status in ('uploading', 'processing', 'analyzing', 'completed', 'failed')),
  cv_data jsonb,
  linkedin_data jsonb,
  github_data jsonb,
  analysis_result jsonb,
  individual_analysis jsonb,
  cross_reference_analysis jsonb,
  original_filename text,
  original_github_url text,
  score integer,
  role text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Recreate files table
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

-- Recreate indexes
create index idx_applicants_user_id on applicants(user_id);
create index idx_applicants_status on applicants(status);
create index idx_files_applicant_id on files(applicant_id);

-- Recreate triggers
create trigger update_users_updated_at 
  before update on users
  for each row execute function update_updated_at_column();

create trigger update_applicants_updated_at 
  before update on applicants
  for each row execute function update_updated_at_column();

-- Enable RLS
alter table users enable row level security;
alter table applicants enable row level security;
alter table files enable row level security;

-- Super simple RLS policies (no more auth_user_id complexity)
create policy "users_own_profile" on users
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "applicants_own" on applicants
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "files_own" on files
  for all to authenticated
  using (
    applicant_id in (
      select id from applicants where user_id = auth.uid()
    )
  )
  with check (
    applicant_id in (
      select id from applicants where user_id = auth.uid()
    )
  );

-- Update storage policy
drop policy if exists "storage_user_files" on storage.objects;
create policy "storage_user_files" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('cv-files', 'linkedin-files', 'other-files') and
    (storage.foldername(name))[1] in (
      select a.id::text from applicants a where a.user_id = auth.uid()
    )
  )
  with check (
    bucket_id in ('cv-files', 'linkedin-files', 'other-files') and
    (storage.foldername(name))[1] in (
      select a.id::text from applicants a where a.user_id = auth.uid()
    )
  );

-- Update user creation function (drop trigger first)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
create or replace function handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  return new;
exception 
  when unique_violation then
    return new;
end;
$$;

-- Update utility function
drop function if exists get_user_applicants();
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
  where a.user_id = auth.uid()
  order by a.created_at desc;
end;
$$;

-- Recreate trigger for user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();