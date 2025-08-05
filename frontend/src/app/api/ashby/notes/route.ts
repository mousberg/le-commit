// Ashby Notes API - Create notes for candidates
// POST: Create a note for a specific candidate

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { candidateId, note, sendNotifications = false } = body;

    // Validate required parameters
    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required', success: false },
        { status: 400 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: 'Note content is required', success: false },
        { status: 400 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY
    });

    // Create note for the candidate
    const noteResponse = await ashbyClient.createNote({
      candidateId,
      note,
      sendNotifications
    });

    if (!noteResponse.success) {
      return NextResponse.json(
        { 
          error: noteResponse.error?.message || 'Failed to create note', 
          success: false
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note created successfully',
      noteId: noteResponse.results?.id,
      candidateId,
      note,
      sendNotifications,
      createdAt: noteResponse.results?.createdAt || new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note', success: false },
      { status: 500 }
    );
  }
}