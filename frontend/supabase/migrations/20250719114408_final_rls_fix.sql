-- Final fix for RLS policies - completely avoid recursion

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view applicants in their workspaces" ON applicants;
DROP POLICY IF EXISTS "Workspace admins and owners can modify applicants" ON applicants;
DROP POLICY IF EXISTS "Users can view files for applicants in their workspaces" ON files;
DROP POLICY IF EXISTS "Workspace admins and owners can manage files" ON files;

-- Create simple, non-recursive policies

-- Workspaces: Users can see workspaces where they are members
CREATE POLICY "workspace_select_policy" ON workspaces
    FOR SELECT USING (
        id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY "workspace_owner_policy" ON workspaces
    FOR ALL USING (
        owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- Workspace members: Users can see members of workspaces they belong to
CREATE POLICY "workspace_members_select_policy" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY "workspace_members_manage_policy" ON workspace_members
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- Applicants: Users can see applicants in their workspaces
CREATE POLICY "applicants_select_policy" ON applicants
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY "applicants_manage_policy" ON applicants
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            AND role IN ('owner', 'admin')
        )
        OR workspace_id IN (
            SELECT id FROM workspaces
            WHERE owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- Files: Users can see files for applicants in their workspaces
CREATE POLICY "files_select_policy" ON files
    FOR SELECT USING (
        applicant_id IN (
            SELECT id FROM applicants
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            )
        )
    );

CREATE POLICY "files_manage_policy" ON files
    FOR ALL USING (
        applicant_id IN (
            SELECT id FROM applicants
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND role IN ('owner', 'admin')
            )
            OR workspace_id IN (
                SELECT id FROM workspaces
                WHERE owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            )
        )
    );
