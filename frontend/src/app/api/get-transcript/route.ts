import { NextRequest, NextResponse } from 'next/server';

// Helper function to format seconds to MM:SS
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversationId parameter' },
        { status: 400 }
      );
    }

    console.log('Fetching transcript for conversation:', conversationId);

    // Make direct API call to ElevenLabs REST API
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations`, {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const conversationsData = await response.json();
    console.log('Conversations response:', conversationsData);

    // Find the specific conversation
    const conversation = conversationsData.conversations?.find(
      (conv: { conversation_id: string }) => conv.conversation_id === conversationId
    );

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get the conversation details which includes the transcript
    try {
      const conversationDetailsResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
      });

      if (!conversationDetailsResponse.ok) {
        console.log('Failed to fetch conversation details:', conversationDetailsResponse.status);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch conversation details',
          conversationId: conversationId
        });
      }

      const conversationDetails = await conversationDetailsResponse.json();
      console.log('Conversation details response:', conversationDetails);

      // Transform the transcript format from ElevenLabs to our expected format
      let formattedTranscript = null;
      // The transcript can be either in body.transcript or directly in transcript
      const transcriptData = conversationDetails.body?.transcript || conversationDetails.transcript;
      
      if (transcriptData && transcriptData.length > 0) {
        formattedTranscript = {
          conversation_id: conversationId,
          status: conversation.status,
          call_duration_secs: conversation.call_duration_secs,
          message_count: conversation.message_count,
          transcript: transcriptData.map((entry: { role: string; time_in_call_secs?: number; message?: string; text?: string }) => ({
            speaker: entry.role === 'user' ? 'Reference' : 'AI Agent',
            timestamp: formatTime(entry.time_in_call_secs || 0),
            text: entry.message || entry.text || ''
          }))
        };
      }

      return NextResponse.json({
        success: true,
        conversation: conversation,
        transcript: formattedTranscript,
        transcriptError: formattedTranscript ? null : 'No transcript messages available yet',
        conversationId: conversationId,
        hasTranscript: !!formattedTranscript
      });

    } catch (error) {
      console.error('Error fetching conversation details:', error);
      return NextResponse.json({
        success: true,
        conversation: conversation,
        transcript: null,
        transcriptError: 'Failed to fetch transcript',
        conversationId: conversationId,
        hasTranscript: false
      });
    }

  } catch (error) {
    console.error('Error fetching transcript:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: `Failed to fetch transcript: ${errorMessage}`,
        success: false 
      },
      { status: 500 }
    );
  }
} 