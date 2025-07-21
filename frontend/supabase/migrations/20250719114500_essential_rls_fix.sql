-- Simple RLS policy fix - focus on security essentials
-- Add basic indexes for auth lookups only

-- Essential indexes for auth performance
create index if not exists idx_users_auth_user_id on public.users (auth_user_id);
create index if not exists idx_workspace_members_lookup on public.workspace_members (workspace_id, user_id);

-- Drop existing problematic policies
drop policy if exists "workspace_select_policy" on workspaces;
drop policy if exists "workspace_owner_policy" on workspaces;
drop policy if exists "workspace_members_select_policy" on workspace_members;
drop policy if exists "workspace_members_manage_policy" on workspace_members;
drop policy if exists "applicants_select_policy" on applicants;
drop policy if exists "applicants_manage_policy" on applicants;
drop policy if exists "files_select_policy" on files;
drop policy if exists "files_manage_policy" on files;

-- Simple, secure policies with TO authenticated clauses

-- Workspaces (fixed: no reference to workspace_members to avoid recursion)
create policy "workspaces_select" on workspaces
  for select
  to authenticated
  using (
    owner_id = (select id from users where auth_user_id = (select auth.uid()))
  );

create policy "workspaces_manage" on workspaces
  for all
  to authenticated
  using (
    owner_id = (select id from users where auth_user_id = (select auth.uid()))
  );

-- Workspace members (fixed: no self-reference)
create policy "workspace_members_select" on workspace_members
  for select
  to authenticated
  using (
    user_id = (select id from users where auth_user_id = (select auth.uid()))
  );

create policy "workspace_members_manage" on workspace_members
  for all
  to authenticated
  using (
    workspace_id in (
      select id from workspaces
      where owner_id = (select id from users where auth_user_id = (select auth.uid()))
    )
  );

-- Applicants
create policy "applicants_select" on applicants
  for select
  to authenticated
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = (select id from users where auth_user_id = (select auth.uid()))
    )
  );

create policy "applicants_manage" on applicants
  for all
  to authenticated
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = (select id from users where auth_user_id = (select auth.uid()))
      and role in ('owner', 'admin')
    )
  );

-- Files
create policy "files_select" on files
  for select
  to authenticated
  using (
    applicant_id in (
      select id from applicants
      where workspace_id in (
        select workspace_id from workspace_members
        where user_id = (select id from users where auth_user_id = (select auth.uid()))
      )
    )
  );

create policy "files_manage" on files
  for all
  to authenticated
  using (
    applicant_id in (
      select id from applicants
      where workspace_id in (
        select workspace_id from workspace_members
        where user_id = (select id from users where auth_user_id = (select auth.uid()))
        and role in ('owner', 'admin')
      )
    )
  );
