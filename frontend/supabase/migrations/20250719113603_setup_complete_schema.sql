-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(auth_user_id)
);

-- Create workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace_members table
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'read_only')),
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Create applicants table
CREATE TABLE applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'analyzing', 'completed', 'failed')),

    -- Core data stored as JSONB for flexibility
    cv_data JSONB,
    linkedin_data JSONB,
    github_data JSONB,
    analysis_result JSONB,
    individual_analysis JSONB,
    cross_reference_analysis JSONB,

    -- Metadata
    original_filename TEXT,
    original_github_url TEXT,
    score INTEGER,
    role TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL CHECK (file_type IN ('cv', 'linkedin', 'github', 'other')),
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for performance optimization
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role);

CREATE INDEX idx_applicants_workspace_id ON applicants(workspace_id);
CREATE INDEX idx_applicants_status ON applicants(status);
CREATE INDEX idx_applicants_created_at ON applicants(created_at);
CREATE INDEX idx_applicants_email ON applicants(email);
CREATE INDEX idx_applicants_name ON applicants(name);

CREATE INDEX idx_files_applicant_id ON files(applicant_id);
CREATE INDEX idx_files_file_type ON files(file_type);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at);
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$BODY$
language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON applicants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Enable Row Level Security (disabled for workspaces/workspace_members for MVP)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;  -- Disabled for MVP
-- ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;  -- Disabled for MVP
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());
-- RLS Policies for workspaces table
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
    FOR SELECT USING (
        id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Workspace owners can update their workspaces" ON workspaces
    FOR UPDATE USING (
        owner_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Workspace owners can delete their workspaces" ON workspaces
    FOR DELETE USING (
        owner_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );
-- RLS Policies for workspace_members table
CREATE POLICY "Users can view workspace members for their workspaces" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Workspace owners and admins can manage members" ON workspace_members
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND role IN ('owner', 'admin')
        )
    );
-- RLS Policies for applicants table
CREATE POLICY "Users can view applicants in their workspaces" ON applicants
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Workspace admins and owners can modify applicants" ON applicants
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND role IN ('owner', 'admin')
        )
    );
-- RLS Policies for files table
CREATE POLICY "Users can view files for applicants in their workspaces" ON files
    FOR SELECT USING (
        applicant_id IN (
            SELECT a.id FROM applicants a
            JOIN workspace_members wm ON a.workspace_id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Workspace admins and owners can manage files" ON files
    FOR ALL USING (
        applicant_id IN (
            SELECT a.id FROM applicants a
            JOIN workspace_members wm ON a.workspace_id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND wm.role IN ('owner', 'admin')
        )
    );
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('cv-files', 'cv-files', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('linkedin-files', 'linkedin-files', false, 52428800, ARRAY['application/pdf']),
    ('other-files', 'other-files', false, 52428800, NULL);
-- Storage policies for cv-files bucket
CREATE POLICY "Users can view CV files in their workspaces" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'cv-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Workspace admins can upload CV files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'cv-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace admins can delete CV files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'cv-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND wm.role IN ('owner', 'admin')
        )
    );
-- Storage policies for linkedin-files bucket
CREATE POLICY "Users can view LinkedIn files in their workspaces" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'linkedin-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Workspace admins can upload LinkedIn files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'linkedin-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace admins can delete LinkedIn files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'linkedin-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND wm.role IN ('owner', 'admin')
        )
    );
-- Storage policies for other-files bucket
CREATE POLICY "Users can view other files in their workspaces" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'other-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Workspace admins can upload other files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'other-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace admins can delete other files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'other-files' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND wm.role IN ('owner', 'admin')
        )
    );
-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS
$BODY$
BEGIN
    INSERT INTO public.users (auth_user_id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$BODY$
LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Create function to get user's workspaces with role information
CREATE OR REPLACE FUNCTION get_user_workspaces(user_auth_id UUID)
RETURNS TABLE (
    workspace_id UUID,
    workspace_name TEXT,
    workspace_description TEXT,
    owner_id UUID,
    user_role TEXT,
    member_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS
$BODY$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name,
        w.description,
        w.owner_id,
        wm.role,
        (SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id),
        w.created_at
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    JOIN users u ON wm.user_id = u.id
    WHERE u.auth_user_id = user_auth_id
    ORDER BY w.created_at DESC;
END;
$BODY$
LANGUAGE plpgsql SECURITY DEFINER;
-- Create function to get workspace applicants with file counts
CREATE OR REPLACE FUNCTION get_workspace_applicants(workspace_uuid UUID, user_auth_id UUID)
RETURNS TABLE (
    applicant_id UUID,
    applicant_name TEXT,
    applicant_email TEXT,
    status TEXT,
    score INTEGER,
    role TEXT,
    file_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS
$BODY$
BEGIN
    -- Check if user has access to this workspace
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = workspace_uuid
        AND u.auth_user_id = user_auth_id
    ) THEN
        RAISE EXCEPTION 'Access denied to workspace';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.name,
        a.email,
        a.status,
        a.score,
        a.role,
        (SELECT COUNT(*) FROM files f WHERE f.applicant_id = a.id),
        a.created_at,
        a.updated_at
    FROM applicants a
    WHERE a.workspace_id = workspace_uuid
    ORDER BY a.created_at DESC;
END;
$BODY$
LANGUAGE plpgsql SECURITY DEFINER;
