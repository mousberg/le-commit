// Webhook Push Note API - Internal service for webhook queue processor
// POST: Create note for candidate (service role authentication only)

import { NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { withServiceRoleOnly, type ServiceRoleContext } from '@/lib/middleware/serviceRoleAuth';
import { getAshbyApiKey } from '@/lib/ashby/server';
import { getAshbyIdFromApplicantId } from '@/lib/ashby/utils';

async function webhookPushNoteHandler(context: ServiceRoleContext) {
  const { body: requestBody } = context;

  try {
    const body = requestBody as Record<string, unknown>;
    const { applicantId, userId, note, sendNotifications = false } = body;

    // Validate required parameters
    if (!applicantId || !userId) {
      return NextResponse.json(
        { error: 'applicantId and userId are required', success: false },
        { status: 400 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: 'Note content is required', success: false },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get user's API key
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', userId)
      .single();

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ashby integration not configured for user', success: false },
        { status: 500 }
      );
    }

    // Get ashby_id from applicant ID using utility function
    const ashbyLookup = await getAshbyIdFromApplicantId(supabase, applicantId as string, userId as string);
    if (!ashbyLookup.success) {
      return NextResponse.json(
        { error: ashbyLookup.error, success: false },
        { status: 404 }
      );
    }

    const ashbyClient = new AshbyClient({ apiKey });

    // Create note for the candidate using ashby_id
    const noteResponse = await ashbyClient.createNote({
      candidateId: ashbyLookup.ashbyId!,
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
      message: 'Note created successfully via webhook',
      noteId: noteResponse.results?.id,
      applicantId,
      ashbyId: ashbyLookup.ashbyId!,
      note,
      sendNotifications,
      createdAt: noteResponse.results?.createdAt || new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in webhook push note:', error);
    return NextResponse.json(
      { error: 'Failed to create note', success: false },
      { status: 500 }
    );
  }
}

// POST - Create note for candidate (service role only - for webhook queue processor)
export const POST = withServiceRoleOnly(webhookPushNoteHandler);