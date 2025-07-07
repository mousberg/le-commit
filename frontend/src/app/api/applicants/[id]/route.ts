import { NextRequest, NextResponse } from 'next/server';
import { loadApplicant, saveApplicant, deleteApplicant } from '@/lib/fileStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicant = loadApplicant(id);

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
    const applicant = loadApplicant(id);

    if (!applicant) {
      return NextResponse.json(
        { error: 'Applicant not found', success: false },
        { status: 404 }
      );
    }

    const updatedApplicant = {
      ...applicant,
      ...updates
    };

    saveApplicant(updatedApplicant);

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
    const deleted = deleteApplicant(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Applicant not found', success: false },
        { status: 404 }
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
