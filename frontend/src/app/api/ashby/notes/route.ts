// Ashby Notes API - Create notes for candidates
// POST: Create a note for a specific candidate

import { NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { getAshbyApiKey } from '@/lib/ashby/server';
import { createClient } from '@/lib/supabase/server';

async function createNoteHandler(context: ApiHandlerContext) {
  const { body: requestBody } = context;

  try {
    const body = requestBody as Record<string, unknown>;
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

    // Get user's API key from context (middleware provides authenticated user)
    const supabase = await createClient();
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', context.user.id)
      .single();

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: apiKey
    });

    // Create note for the candidate
    const noteResponse = await ashbyClient.createNote({
      candidateId: candidateId as string,
      note: note as string,
      sendNotifications: sendNotifications as boolean
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

export const POST = withApiMiddleware(createNoteHandler, {
  requireAuth: true,
  enableCors: true,
  enableLogging: true,
  rateLimit: { 
    maxRequests: 30,
    windowMs: 60000 // 1-minute window
  }
});