-- =============================================================================
-- Seed file for Le-Commit (Unmask) platform
-- =============================================================================
-- Creates a test user that can be used for development and testing
-- 
-- Login credentials:
-- Email: test@unmask.click
-- Password: password123
-- =============================================================================

-- Insert test user into auth.users table (for authentication)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'team@unmask.click',
  crypt('lecommit42', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Test User"}',
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- Insert corresponding user into public.users table (this will be created automatically by trigger, but adding for completeness)
INSERT INTO public.users (id, email, full_name, ashby_api_key) VALUES
  ('00000000-0000-0000-0000-000000000001', 'team@unmask.click', 'Test User', null)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;
