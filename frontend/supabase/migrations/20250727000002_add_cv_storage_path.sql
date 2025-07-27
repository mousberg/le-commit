-- Add storage path column to track stored CV files
alter table ashby_candidates 
add column cv_storage_path text;

-- Add index for faster lookups
create index idx_ashby_candidates_cv_storage_path on ashby_candidates(cv_storage_path);

-- Comment to document the column
comment on column ashby_candidates.cv_storage_path is 'Path to stored CV file in Supabase Storage bucket candidate-cvs';