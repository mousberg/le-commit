import { NextRequest, NextResponse } from 'next/server';
import { getServerDatabaseService } from '@/lib/services/database';
import { SupabaseStorageService } from '@/lib/services/storage';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Validate applicant access
    const hasAccess = await dbService.canUserViewApplicant(id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to applicant', success: false },
        { status: 403 }
      );
    }

    // Get applicant
    const applicant = await dbService.getApplicant(id);

    if (!applicant) {
      return NextResponse.json(
        { error: 'Applicant not found', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ applicant, success: true });
  } catch (error) {
    console.error('Error fetching applicant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applicant', success: false },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

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

    // Validate applicant modification access
    const hasAccess = await dbService.canUserModifyApplicant(id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to modify applicant', success: false },
        { status: 403 }
      );
    }

    // Check if applicant exists
    const existingApplicant = await dbService.getApplicant(id);
    if (!existingApplicant) {
      return NextResponse.json(
        { error: 'Applicant not found', success: false },
        { status: 404 }
      );
    }

    // Update applicant
    const updatedApplicant = await dbService.updateApplicant(id, updates);

    return NextResponse.json({ applicant: updatedApplicant, success: true });
  } catch (error) {
    console.error('Error updating applicant:', error);
    return NextResponse.json(
      { error: 'Failed to update applicant', success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Validate applicant modification access
    const hasAccess = await dbService.canUserModifyApplicant(id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to delete applicant', success: false },
        { status: 403 }
      );
    }

    // Check if applicant exists
    const existingApplicant = await dbService.getApplicant(id);
    if (!existingApplicant) {
      return NextResponse.json(
        { error: 'Applicant not found', success: false },
        { status: 404 }
      );
    }

    // Delete all associated files first
    const storageService = new SupabaseStorageService(dbService);
    await storageService.deleteAllApplicantFiles(id);

    // Delete applicant from database
    const deleted = await dbService.deleteApplicant(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete applicant', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting applicant:', error);
    return NextResponse.json(
      { error: 'Failed to delete applicant', success: false },
      { status: 500 }
    );
  }
}
