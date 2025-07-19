import { NextRequest, NextResponse } from 'next/server';
import { getServerDatabaseService } from '@/lib/services/database';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // Get database service
    const dbService = await getServerDatabaseService();

    // Get user's workspaces
    const workspaces = await dbService.getUserWorkspaces({
      userId: user.id,
      limit,
      offset
    });

    return NextResponse.json({
      workspaces,
      total: workspaces.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces', success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required', success: false },
        { status: 400 }
      );
    }

    // Get database service
    const dbService = await getServerDatabaseService();

    // Create workspace
    const workspace = await dbService.createWorkspace({
      name: name.trim(),
      description: description?.trim()
    });

    // Add creator as owner to workspace_members
    await dbService.addWorkspaceMember(workspace.id, user.id, 'owner');

    return NextResponse.json({
      workspace,
      success: true
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace', success: false },
      { status: 500 }
    );
  }
}
