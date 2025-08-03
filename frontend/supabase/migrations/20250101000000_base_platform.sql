-- =============================================================================
-- Base Platform Schema for Le-Commit (Unmask) - Core hiring verification platform
-- =============================================================================
-- This migration contains the core platform functionality without ATS integrations.
-- This includes user management, applicant tracking, file storage, and basic verification.
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table (profile data linked to auth.users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Applicants table (candidates being verified)
create table if not exists public.applicants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  email text not null,
  phone text,
  github_url text,
  linkedin_url text,
  analysis jsonb,
  status text not null default 'uploading' check (status in ('uploading', 'processing', 'analyzing', 'completed', 'failed')),
  
  -- Core data
  cv_data jsonb,
  linkedin_data jsonb,
  github_data jsonb,
  analysis_result jsonb,
  individual_analysis jsonb,
  cross_reference_analysis jsonb,
  
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Files table (uploaded documents)
create table if not exists public.files (
  id uuid default uuid_generate_v4() primary key,
  applicant_id uuid references public.applicants(id) on delete cascade not null,
  file_name text not null,
  file_type text not null check (file_type in ('cv', 'resume', 'cover_letter', 'transcript', 'other')),
  storage_path text not null, -- path in Supabase storage
  storage_bucket text not null default 'candidate-cvs',
  file_size bigint,
  mime_type text,
  source text check (source in ('upload', 'ashby', 'linkedin', 'other')),
  source_metadata jsonb, -- e.g., ashby file handle info
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_applicants_user_id on public.applicants(user_id);
create index if not exists idx_applicants_status on public.applicants(status);
create index if not exists idx_files_applicant_id on public.files(applicant_id);
create index if not exists idx_files_file_type on public.files(file_type);
create index if not exists idx_files_source on public.files(source);

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
drop trigger if exists handle_users_updated_at on public.users;
create trigger handle_users_updated_at before update on public.users
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_applicants_updated_at on public.applicants;
create trigger handle_applicants_updated_at before update on public.applicants
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_files_updated_at on public.files;
create trigger handle_files_updated_at before update on public.files
  for each row execute procedure public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.applicants enable row level security;
alter table public.files enable row level security;

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

-- =============================================================================
-- COMMENTS
-- =============================================================================

comment on table public.users is 'User profiles linked to auth.users';
comment on table public.applicants is 'Job applicants being verified through the platform';
comment on table public.files is 'Uploaded documents associated with applicants';