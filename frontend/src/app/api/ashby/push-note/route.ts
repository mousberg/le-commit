// Ashby Notes API - Create notes for candidates
// POST: Create a note for a specific candidate

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { getAshbyApiKey } from '@/lib/ashby/server';
import { createClient } from '@/lib/supabase/server';
import { getAshbyIdFromApplicantId } from '@/lib/ashby/utils';

async function createNoteHandler(context: ApiHandlerContext) {
  const { body: requestBody } = context;

  try {
    const body = requestBody as Record<string, unknown>;
    const { applicantId, note, sendNotifications = false } = body;

    // Validate required parameters
    if (!applicantId) {
      return NextResponse.json(
        { error: 'Applicant ID is required', success: false },
        { status: 400 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: 'Note content is required', success: false },
        { status: 400 }
      );
    }

    // Get user's API key
    const supabase = await createClient();
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', context.user.id)
      .single();

    // Get ashby_id from applicant ID using utility function
    const ashbyLookup = await getAshbyIdFromApplicantId(supabase, applicantId as string, context.user.id);
    if (!ashbyLookup.success) {
      return NextResponse.json(
        { error: ashbyLookup.error, success: false },
        { status: 404 }
      );
    }

    const ashbyId = ashbyLookup.ashbyId!;

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

    // Create note for the candidate using ashby_id
    const noteResponse = await ashbyClient.createNote({
      candidateId: ashbyId,
      note: note as string,
      sendNotifications: sendNotifications as boolean
    });

    if (!noteResponse.success) {
      const errorMessage = noteResponse.error?.message || 'Failed to create note';
      const isRateLimit = noteResponse.error?.code === 'RATE_LIMIT_EXCEEDED';

      return NextResponse.json(
        { 
          error: errorMessage,
          success: false,
          isRateLimit,
          retryAfter: isRateLimit ? (noteResponse.error?.retryAfter || 60) : undefined
        },
        { status: isRateLimit ? 503 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note created successfully',
      noteId: noteResponse.results?.id,
      applicantId,
      ashbyId,
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

// Handle webhook calls from database triggers
// Removed handleWebhookCall and handleUserCall functions
// Now using simplified single-path architecture

// POST - Create note for candidate (simplified single-path architecture)
// Both user calls and queue processor calls use the same middleware-wrapped path
export async function POST(request: NextRequest) {
  try {
    // Use the middleware to get proper auth context
    // Works for both user calls and queue processor calls (with service role client)
    const middlewareResponse = await withApiMiddleware(createNoteHandler, {
      requireAuth: true,
      enableCors: true
    })(request, { params: Promise.resolve({}) });

    // Log success
    if (middlewareResponse.status === 200) {
      console.log('✅ POST /api/ashby/push-note 200');
    }
    
    return middlewareResponse;
  } catch (error) {
    console.error('Error in notes API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}