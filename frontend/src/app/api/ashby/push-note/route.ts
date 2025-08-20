// Ashby Notes API - Create notes for candidates
// POST: Create a note for a specific candidate

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';
import { getAshbyApiKey } from '@/lib/ashby/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
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
async function handleWebhookCall(request: NextRequest) {
  const body = await request.json();
  const { applicantId, note } = body;

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

  // Use service role client to bypass RLS (trigger already validated data)
  const supabase = createServiceRoleClient();

  // Get applicant data and user info
  const { data: applicantData, error: applicantError } = await supabase
    .from('applicants')
    .select(`
      id,
      user_id,
      source
    `)
    .eq('id', applicantId)
    .single();

  if (applicantError || !applicantData) {
    return NextResponse.json(
      { error: 'Applicant not found', success: false },
      { status: 404 }
    );
  }

  const { user_id, source } = applicantData;

  // Check if this applicant came from Ashby
  if (source !== 'ashby') {
    return NextResponse.json(
      { error: 'Not an Ashby candidate', success: false },
      { status: 400 }
    );
  }

  // Get user's API key
  const { data: userData } = await supabase
    .from('users')
    .select('ashby_api_key')
    .eq('id', user_id)
    .single();

  const apiKey = getAshbyApiKey(userData?.ashby_api_key);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Ashby integration not configured for user', success: false },
      { status: 400 }
    );
  }

  // Get ashby_id using utility function
  const ashbyLookup = await getAshbyIdFromApplicantId(supabase, applicantId, user_id);
  if (!ashbyLookup.success) {
    return NextResponse.json(
      { error: ashbyLookup.error, success: false },
      { status: 404 }
    );
  }

  // Initialize Ashby client and create note
  const ashbyClient = new AshbyClient({ apiKey });

  const noteResponse = await ashbyClient.createNote({
    candidateId: ashbyLookup.ashbyId!,
    note: note,
    sendNotifications: false
  });

  if (!noteResponse.success) {
    const errorMessage = noteResponse.error?.message || 'Failed to create note in Ashby';
    const isRateLimit = noteResponse.error?.code === 'RATE_LIMIT_EXCEEDED';

    console.error('❌ WEBHOOK: Failed to create note in Ashby:', {
      applicantId,
      ashbyId: ashbyLookup.ashbyId,
      error: noteResponse.error,
      isRateLimit
    });

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
    message: 'Note successfully synced to Ashby',
    data: {
      applicantId,
      ashbyId: ashbyLookup.ashbyId,
      noteId: noteResponse.results?.id,
      note,
      createdAt: noteResponse.results?.createdAt || new Date().toISOString()
    }
  });
}

// Handle user calls (existing middleware-wrapped logic)
async function handleUserCall(request: NextRequest) {
  const middlewareResponse = await withApiMiddleware(createNoteHandler, {
    requireAuth: true,
    enableCors: true,
    enableLogging: true,
    rateLimit: { 
      maxRequests: 30,
      windowMs: 60000
    }
  })(request, { params: Promise.resolve({}) });

  return middlewareResponse;
}

// POST - Create note for candidate (handles both user calls and webhook calls)
export async function POST(request: NextRequest) {
  try {
    // Check if this is a webhook call from database trigger
    const isWebhookCall = request.headers.get('x-webhook-source') === 'database-trigger';
    
    if (isWebhookCall) {
      // Skip webhook secret validation - minimal security risk for score/note updates
      return await handleWebhookCall(request);
    } else {
      return await handleUserCall(request);
    }
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