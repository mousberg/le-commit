import { NextResponse } from 'next/server';
import { getServerDatabaseService } from '@/lib/services/database.server';
import { withGetMiddleware, withPostMiddleware, ValidationSchemas } from '@/lib/middleware/apiWrapper';
import { ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { createClient } from '@/lib/supabase/server';

export const GET = withGetMiddleware(
  async (context: ApiHandlerContext) => {
    try {
      const { id: workspaceId } = await context.params;
      const { user } = context;

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
  },
  {
    requireAuth: true,
    enableLogging: true
  }
);

export const POST = withPostMiddleware(
  async (context: ApiHandlerContext) => {
    try {
      const { id: workspaceId } = await context.params;
      const { user } = context;
      const { userId, email, role = 'read_only' } = context.request.body;

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
        // Look up user by email
        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
          filter: {
            email: email
          }
        });

        if (userError || !userData || userData.users.length === 0) {
          // In a real implementation, you would send an invitation email here
          return NextResponse.json(
            {
              error: 'User not found with this email. Email invitations are not yet implemented.',
              success: false
            },
            { status: 404 }
          );
        }

        // Get the first user that matches the email
        targetUserId = userData.users[0].id;
      }

      if (!targetUserId) {
        return NextResponse.json(
          { error: 'User ID or valid email is required', success: false },
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
  },
  {
    requireAuth: true,
    validation: {
      body: ValidationSchemas.workspaceMember.add
    },
    enableLogging: true
  }
);
