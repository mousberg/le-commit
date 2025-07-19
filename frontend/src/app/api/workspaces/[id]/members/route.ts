import { NextRequest, NextResponse } from 'next/server';
import { getServerDatabaseService } from '@/lib/services/database';
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

    // Get workspace members
    const members = await dbService.getWorkspaceMembers(workspaceId);

    return NextResponse.json({
      members,
      total: members.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace members', success: false },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const { userId, email, role = 'read_only' } = await request.json();

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'User ID or email is required', success: false },
        { status: 400 }
      );
    }

    if (!['owner', 'admin', 'read_only'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, admin, or read_only', success: false },
        { status: 400 }
      );
    }

    // Get database service
    const dbService = await getServerDatabaseService();

    // Validate permission to invite members
    const canInvite = await dbService.canUserInviteMembers(workspaceId, user.id);
    if (!canInvite) {
      return NextResponse.json(
        { error: 'Access denied to invite members', success: false },
        { status: 403 }
      );
    }

    let targetUserId = userId;

    // If email is provided instead of userId, look up the user
    if (!targetUserId && email) {
      // For now, we'll require the userId to be provided
      // In a full implementation, you might want to send invitations via email
      return NextResponse.json(
        { error: 'User ID is required. Email invitations not yet implemented.', success: false },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await dbService.getWorkspaceMember(workspaceId, targetUserId);
    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace', success: false },
        { status: 409 }
      );
    }

    // Add workspace member
    const member = await dbService.addWorkspaceMember(workspaceId, targetUserId, role);

    return NextResponse.json({
      member,
      success: true
    });
  } catch (error) {
    console.error('Error adding workspace member:', error);
    return NextResponse.json(
      { error: 'Failed to add workspace member', success: false },
      { status: 500 }
    );
  }
}
