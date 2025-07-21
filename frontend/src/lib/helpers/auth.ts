import { NextRequest, NextResponse } from 'next/server';
// Remove static import to prevent client-side bundling issues
import { getServerDatabaseService } from '@/lib/services/database.server';

// Simple auth helper for API routes
export async function getAuthenticatedUser() {
  try {
    // Dynamic import to avoid pulling server code into client bundles
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Authentication required', success: false },
          { status: 401 }
        )
      };
    }

    return { user, error: null };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication failed', success: false },
        { status: 500 }
      )
    };
  }
}

// Simple workspace access helper
export async function checkWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRole?: 'admin' | 'owner'
) {
  try {
    const dbService = await getServerDatabaseService();

    const hasAccess = await dbService.validateWorkspaceAccess(
      workspaceId,
      userId,
      requiredRole
    );

    if (!hasAccess) {
      return {
        hasAccess: false,
        error: NextResponse.json(
          { error: 'Access denied to workspace', success: false },
          { status: 403 }
        )
      };
    }

    return { hasAccess: true, error: null, dbService };
  } catch (error) {
    console.error('Workspace access error:', error);
    return {
      hasAccess: false,
      error: NextResponse.json(
        { error: 'Failed to check workspace access', success: false },
        { status: 500 }
      )
    };
  }
}

// Extract workspace ID from request (URL params or body)
export async function getWorkspaceId(request: NextRequest): Promise<string | null> {
  // Try URL params first
  const url = new URL(request.url);
  let workspaceId = url.searchParams.get('workspaceId');

  // Try path params
  if (!workspaceId) {
    const pathParts = url.pathname.split('/');
    const workspaceIndex = pathParts.findIndex(part => part === 'workspaces');
    if (workspaceIndex !== -1 && pathParts[workspaceIndex + 1]) {
      workspaceId = pathParts[workspaceIndex + 1];
    }
  }

  // Try request body for POST/PUT
  if (!workspaceId && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.clone().json();
      workspaceId = body.workspaceId;
    } catch {
      // Body might not be JSON, that's ok
    }
  }

  return workspaceId;
}

// Simple error response helper
export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { error: message, success: false },
    { status }
  );
}

// Simple success response helper
export function createSuccessResponse(data: Record<string, unknown>, status: number = 200) {
  return NextResponse.json(
    { ...data, success: true },
    { status }
  );
}
