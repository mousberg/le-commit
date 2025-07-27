-- Create the candidate-cvs storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-cvs',
  'candidate-cvs', 
  false,
  52428800, -- 50MB
  '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain}'
) on conflict (id) do nothing;

-- Create storage policies for candidate CVs
-- Policy: Users can upload CVs to their own folder
create policy "Users can upload CVs to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'candidate-cvs' and
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- Policy: Users can view/download CVs from their own folder
create policy "Users can view own CVs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'candidate-cvs' and
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- Policy: Users can update/replace CVs in their own folder
create policy "Users can update own CVs" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'candidate-cvs' and
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

-- Policy: Users can delete CVs from their own folder
create policy "Users can delete own CVs" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'candidate-cvs' and
    (auth.uid())::text = (string_to_array(name, '/'))[1]
  );