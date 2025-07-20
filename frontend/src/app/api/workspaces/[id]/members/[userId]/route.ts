import { NextRequest, NextResponse } from 'next/server';
import { getServerDatabaseService } from '@/lib/services/database';
import { createClient } from '@/lib/supabase/server';
import { withPutMiddleware, withDeleteMiddleware, ValidationSchemas } from '@/lib/middleware/apiWrapper';
import { ApiHandlerContext } from '@/lib/middleware/apiWrapper';

export const PUT = withPutMiddleware(
  async (context: ApiHandlerContext) => {
    try {
      const { id: workspaceId, userId: targetUserId } = await context.params;
      const { user } = context;
      const { role } = context.request.body;

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

      // Prevent changing the role of the last owner
      if (existingMember.role === 'owner' && role !== 'owner') {
        const allMembers = await dbService.getWorkspaceMembers(workspaceId);
        const ownerCount = allMembers.filter(m => m.role === 'owner').length;

        if (ownerCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot change the role of the last owner of the workspace', success: false },
            { status: 400 }
          );
        }
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
  },
  {
    requireAuth: true,
    validation: {
      body: ValidationSchemas.workspaceMember.updateRole
    },
    enableLogging: true
  }
);

export const DELETE = withDeleteMiddleware(
  async (context: ApiHandlerContext) => {
    try {
      const { id: workspaceId, userId: targetUserId } = await context.params;
      const { user } = context;

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

      // Prevent users from removing themselves if they are the last owner
      if (targetUserId === user.id && existingMember.role === 'owner') {
        const allMembers = await dbService.getWorkspaceMembers(workspaceId);
        const ownerCount = allMembers.filter(m => m.role === 'owner').length;

        if (ownerCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove yourself as the last owner. Transfer ownership first.', success: false },
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
  },
  {
    requireAuth: true,
    enableLogging: true
  }
);
