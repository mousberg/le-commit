import { NextRequest, NextResponse } from 'next/server';

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
      (conv: any) => conv.conversation_id === conversationId
    );

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // For now, return a mock transcript since the exact transcript API structure is not clear
    // TODO: Replace with actual transcript API call when structure is confirmed
    const mockTranscript = {
      conversation_id: conversationId,
      status: conversation.status,
      call_duration_secs: conversation.call_duration_secs,
      message_count: conversation.message_count,
      transcript: [
        {
          speaker: "AI Agent",
          timestamp: "00:00:05",
          text: "Hi Jane Smith, I'm calling to do a quick reference check for John Doe who worked with you at Previous Company. Do you have about 3-4 minutes?"
        },
        {
          speaker: "Reference",
          timestamp: "00:00:15",
          text: "Yes, sure. I remember John well."
        },
        {
          speaker: "AI Agent", 
          timestamp: "00:00:20",
          text: "Great! In what context did you work with John at Previous Company?"
        },
        {
          speaker: "Reference",
          timestamp: "00:00:25",
          text: "John was a senior developer on my team. He worked on several key projects during his time here."
        },
        {
          speaker: "AI Agent",
          timestamp: "00:00:35",
          text: "Can you share any specific projects you remember John working on?"
        },
        {
          speaker: "Reference",
          timestamp: "00:00:40",
          text: "He led the development of our customer portal redesign and contributed significantly to our API optimization project."
        },
        {
          speaker: "AI Agent",
          timestamp: "00:00:50",
          text: "How would you describe John's work style and reliability?"
        },
        {
          speaker: "Reference",
          timestamp: "00:00:55",
          text: "John was very dependable and detail-oriented. He always met his deadlines and produced high-quality code."
        },
        {
          speaker: "AI Agent",
          timestamp: "00:01:05",
          text: "What were John's main strengths?"
        },
        {
          speaker: "Reference",
          timestamp: "00:01:10",
          text: "His technical skills were excellent, especially in React and Node.js. He was also great at mentoring junior developers."
        },
        {
          speaker: "AI Agent",
          timestamp: "00:01:20",
          text: "Would you work with John again if you had the opportunity?"
        },
        {
          speaker: "Reference",
          timestamp: "00:01:25",
          text: "Absolutely. I would hire him again without hesitation."
        },
        {
          speaker: "AI Agent",
          timestamp: "00:01:30",
          text: "Thank you Jane, this has been really helpful for understanding John's background."
        }
      ]
    };

    return NextResponse.json({
      success: true,
      conversation: conversation,
      transcript: mockTranscript,
      conversationId: conversationId,
      note: "This is a mock transcript. Real transcript integration pending ElevenLabs API structure confirmation."
    });

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