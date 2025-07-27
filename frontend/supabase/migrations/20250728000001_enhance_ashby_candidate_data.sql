-- Enhance Ashby candidate data capture
-- Add missing fields from Ashby API response for better LinkedIn and contact data

-- Add missing contact and professional information
alter table ashby_candidates 
add column if not exists phone_number text,
add column if not exists all_emails jsonb default '[]',
add column if not exists all_phone_numbers jsonb default '[]',
add column if not exists social_links jsonb default '[]',
add column if not exists position text,
add column if not exists company text,
add column if not exists school text,
add column if not exists github_url text,
add column if not exists location_summary text,
add column if not exists location_details jsonb,
add column if not exists timezone text,
add column if not exists source_info jsonb,
add column if not exists all_file_handles jsonb default '[]',
add column if not exists profile_url text;

-- Add indexes for new searchable fields
create index if not exists idx_ashby_candidates_company on ashby_candidates(company);
create index if not exists idx_ashby_candidates_position on ashby_candidates(position);
create index if not exists idx_ashby_candidates_school on ashby_candidates(school);
create index if not exists idx_ashby_candidates_phone on ashby_candidates(phone_number);
create index if not exists idx_ashby_candidates_github_url on ashby_candidates(github_url);