import { NextRequest, NextResponse } from 'next/server';
import { getServerDatabaseService } from '@/lib/services/database';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: workspaceId, userId: targetUserId } = await params;

    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    const { role } = await request.json();

    if (!role || !['owner', 'admin', 'read_only'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, admin, or read_only', success: false },
        { status: 400 }
      );
    }

    // Get database service
    const dbService = await getServerDatabaseService();

    // Validate permission to manage members
    const canManage = await dbService.validateWorkspaceMemberManagement(workspaceId, user.id, targetUserId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied to manage this member', success: false },
        { status: 403 }
      );
    }

    // Check if member exists
    const existingMember = await dbService.getWorkspaceMember(workspaceId, targetUserId);
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Member not found in workspace', success: false },
        { status: 404 }
      );
    }

    // Update member role
    const updatedMember = await dbService.updateWorkspaceMemberRole(workspaceId, targetUserId, role);

    return NextResponse.json({
      member: updatedMember,
      success: true
    });
  } catch (error) {
    console.error('Error updating workspace member:', error);
    return NextResponse.json(
      { error: 'Failed to update workspace member', success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: workspaceId, userId: targetUserId } = await params;

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

    // Validate permission to remove members
    const canRemove = await dbService.canUserRemoveMembers(workspaceId, user.id, targetUserId);
    if (!canRemove) {
      return NextResponse.json(
        { error: 'Access denied to remove this member', success: false },
        { status: 403 }
      );
    }

    // Check if member exists
    const existingMember = await dbService.getWorkspaceMember(workspaceId, targetUserId);
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Member not found in workspace', success: false },
        { status: 404 }
      );
    }

    // Prevent removing the last owner
    if (existingMember.role === 'owner') {
      const allMembers = await dbService.getWorkspaceMembers(workspaceId);
      const ownerCount = allMembers.filter(m => m.role === 'owner').length;

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner of the workspace', success: false },
          { status: 400 }
        );
      }
    }

    // Remove workspace member
    const removed = await dbService.removeWorkspaceMember(workspaceId, targetUserId);

    if (!removed) {
      return NextResponse.json(
        { error: 'Failed to remove workspace member', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing workspace member:', error);
    return NextResponse.json(
      { error: 'Failed to remove workspace member', success: false },
      { status: 500 }
    );
  }
}
