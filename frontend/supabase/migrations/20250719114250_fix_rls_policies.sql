-- Fix RLS policies to avoid infinite recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view applicants in their workspaces" ON applicants;
DROP POLICY IF EXISTS "Workspace admins and owners can modify applicants" ON applicants;
DROP POLICY IF EXISTS "Users can view files for applicants in their workspaces" ON files;
DROP POLICY IF EXISTS "Workspace admins and owners can manage files" ON files;

-- Create improved RLS policies without recursion

-- Workspaces policies - simplified to avoid recursion
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = workspaces.id
            AND u.auth_user_id = auth.uid()
        )
    );

-- Workspace members policies - base case without recursion
CREATE POLICY "Users can view workspace members for their workspaces" ON workspace_members
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners and admins can manage members" ON workspace_members
    FOR ALL USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w
            JOIN users u ON w.owner_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
        OR workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND wm.role = 'admin'
        )
    );

-- Applicants policies - using direct joins to avoid recursion
CREATE POLICY "Users can view applicants in their workspaces" ON applicants
    FOR SELECT USING (
        workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace admins and owners can modify applicants" ON applicants
    FOR ALL USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w
            JOIN users u ON w.owner_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
        OR workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND wm.role IN ('admin')
        )
    );

-- Files policies - using direct joins
CREATE POLICY "Users can view files for applicants in their workspaces" ON files
    FOR SELECT USING (
        applicant_id IN (
            SELECT a.id FROM applicants a
            JOIN workspace_members wm ON a.workspace_id = wm.workspace_id
            JOIN users u ON wm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace admins and owners can manage files" ON files
    FOR ALL USING (
        applicant_id IN (
            SELECT a.id FROM applicants a
            JOIN workspaces w ON a.workspace_id = w.id
            JOIN users u ON w.owner_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
        OR applicant_id IN (
            SELECT a.id FROM applicants a
            JOIN workspace_members wm ON a.workspace_id = wm.workspace_id
            JOIN users u ON wm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND wm.role = 'admin'
        )
    );
