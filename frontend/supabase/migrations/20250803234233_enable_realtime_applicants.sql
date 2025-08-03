-- Enable realtime for applicants table
-- This is required for real-time subscriptions to work properly

-- Enable replica identity (required for realtime updates)
ALTER TABLE public.applicants REPLICA IDENTITY FULL;

-- Add the applicants table to the supabase_realtime publication
-- This allows real-time subscriptions to receive INSERT, UPDATE, DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE public.applicants;

-- Optional: Enable realtime for related tables if needed
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

ALTER TABLE public.files REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.files;

-- Verify the tables are added to the publication
-- This can be checked with: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';