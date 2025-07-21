// Example: How to refactor your existing routes with simple helpers
import { NextRequest } from 'next/server';
import {
  getAuthenticatedUser,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/helpers/auth';
import { createWorkspaceSchema, paginationSchema } from '@/lib/schemas/simple-validation';
import { getServerDatabaseService } from '@/lib/services/database.server';

// GET /api/workspaces - Simplified version
export async function GET(request: NextRequest) {
  // Simple auth check
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  try {
    // Simple validation of query params
    const url = new URL(request.url);
    const queryData = Object.fromEntries(url.searchParams.entries());
    const { limit, offset } = paginationSchema.parse(queryData);

    // Get data
    const dbService = await getServerDatabaseService();
    const workspaces = await dbService.getUserWorkspaces({
      userId: user!.id,
      limit,
      offset
    });

    return createSuccessResponse({
      workspaces,
      total: workspaces.length
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return createErrorResponse('Failed to fetch workspaces', 500);
  }
}

// POST /api/workspaces - Simplified version
export async function POST(request: NextRequest) {
  // Simple auth check
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  try {
    // Simple validation
    const body = await request.json();
    const { name, description } = createWorkspaceSchema.parse(body);

    // Create workspace
    const dbService = await getServerDatabaseService();
    const workspace = await dbService.createWorkspace({ name, description });

    // Add user as owner
    await dbService.addWorkspaceMember(workspace.id, user!.id, 'owner');

    return createSuccessResponse({ workspace }, 201);
  } catch (error) {
    console.error('Error creating workspace:', error);
    return createErrorResponse('Failed to create workspace', 500);
  }
}
