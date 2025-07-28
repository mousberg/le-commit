-- Remove the storage policy that references the old buckets
drop policy if exists "storage_user_files" on storage.objects;

-- Delete any existing objects in the buckets before removing them
delete from storage.objects where bucket_id in ('cv-files', 'linkedin-files', 'other-files');

-- Remove the unused storage buckets
delete from storage.buckets where id in ('cv-files', 'linkedin-files', 'other-files');