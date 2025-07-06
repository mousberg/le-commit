import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, candidateName, referenceName, companyName, roleTitle, workDuration } = await request.json();

    if (!phoneNumber || !candidateName || !referenceName) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, candidateName, referenceName' },
        { status: 400 }
      );
    }

    console.log('Creating reference call for:', { 
      candidateName, 
      referenceName, 
      phoneNumber,
      companyName,
      roleTitle,
      workDuration 
    });

    // Make call using ElevenLabs Conversational Agent API
    const callResponse = await initiateElevenLabsCall(
      phoneNumber,
      candidateName, 
      referenceName, 
      companyName, 
      roleTitle, 
      workDuration
    );
    
    if (!callResponse.success) {
      throw new Error(`Failed to initiate call: ${callResponse.error}`);
    }

    // Store call details for tracking
    console.log('Call initiated:', {
      conversationId: callResponse.conversationId,
      candidateName,
      referenceName,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      conversationId: callResponse.conversationId,
      message: 'Reference call initiated with ElevenLabs agent',
      candidateName,
      referenceName,
    });
  } catch (error) {
    console.error('Error making reference call:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to initiate reference call: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function initiateElevenLabsCall(
  phoneNumber: string,
  candidateName: string, 
  referenceName: string, 
  companyName?: string, 
  roleTitle?: string, 
  workDuration?: string
) {
  try {
    // Create dynamic context for the conversation
    const context = {
      candidate_name: candidateName,
      reference_name: referenceName,
      company_name: companyName || 'their previous workplace',
      role_title: roleTitle || 'their role',
      work_duration: workDuration || 'some time'
    };

    // Call ElevenLabs Conversational Agent API
    const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        agent_id: process.env.ELEVENLABS_AGENT_ID!,
        user_id: `reference_${Date.now()}`,
        phone_number_id: process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID!,
        phone_number: phoneNumber,
        context: context,
        // Pass variables to the agent
        variables: {
          candidate_name: candidateName,
          reference_name: referenceName,
          company_name: companyName || 'their previous workplace',
          role_title: roleTitle || 'their role',
          work_duration: workDuration || 'some time'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('ElevenLabs call initiated:', {
      conversationId: data.conversation_id,
      candidateName,
      referenceName,
      context,
    });

    return {
      success: true,
      conversationId: data.conversation_id,
      context,
    };
  } catch (error) {
    console.error('Error calling ElevenLabs API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage,
    };
  }
} 