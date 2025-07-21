import { NextRequest, NextResponse } from 'next/server';
import { getServerDatabaseService } from '@/lib/services/database.server';
import { createStorageService } from '@/lib/services/storage';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;

    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Get database service
    const dbService = await getServerDatabaseService();

    // Validate workspace access
    const hasAccess = await dbService.validateWorkspaceAccess(workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to workspace', success: false },
        { status: 403 }
      );
    }

    // Get workspace
    const workspace = await dbService.getWorkspace(workspaceId);

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found', success: false },
        { status: 404 }
      );
    }

    // Get user's role in the workspace
    const userRole = await dbService.getUserWorkspaceRole(workspaceId, user.id);

    return NextResponse.json({
      workspace: {
        ...workspace,
        role: userRole
      },
      success: true
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace', success: false },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;

    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    const { name, description } = await request.json();

    // Get database service
    const dbService = await getServerDatabaseService();

    // Validate permission to modify workspace
    const canModify = await dbService.canUserModifyWorkspace(workspaceId, user.id);
    if (!canModify) {
      return NextResponse.json(
        { error: 'Access denied to modify workspace', success: false },
        { status: 403 }
      );
    }

    // Check if workspace exists
    const existingWorkspace = await dbService.getWorkspace(workspaceId);
    if (!existingWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found', success: false },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: { name?: string; description?: string | null } = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Workspace name must be a non-empty string', success: false },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    // Update workspace
    const updatedWorkspace = await dbService.updateWorkspace(workspaceId, updateData);

    return NextResponse.json({
      workspace: updatedWorkspace,
      success: true
    });
  } catch (error) {
    console.error('Error updating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to update workspace', success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;

    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Get database service
    const dbService = await getServerDatabaseService();

    // Validate permission to delete workspace (only owners can delete)
    const canDelete = await dbService.canUserDeleteWorkspace(workspaceId, user.id);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Access denied to delete workspace', success: false },
        { status: 403 }
      );
    }

    // Check if workspace exists
    const existingWorkspace = await dbService.getWorkspace(workspaceId);
    if (!existingWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found', success: false },
        { status: 404 }
      );
    }

    // Get all applicants in the workspace to clean up their files
    const applicants = await dbService.listApplicants({ workspaceId });

    // Delete all files for all applicants in the workspace
    const storageService = await createStorageService(dbService);
    for (const applicant of applicants) {
      try {
        await storageService.deleteAllApplicantFiles(applicant.id);
      } catch (error) {
        console.error(`Failed to delete files for applicant ${applicant.id}:`, error);
        // Continue with deletion even if file cleanup fails
      }
    }

    // Delete workspace (this will cascade delete applicants and members due to foreign key constraints)
    const deleted = await dbService.deleteWorkspace(workspaceId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete workspace', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return NextResponse.json(
      { error: 'Failed to delete workspace', success: false },
      { status: 500 }
    );
  }
}
