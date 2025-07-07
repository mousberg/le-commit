import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Initialize ElevenLabs client
const client = new ElevenLabsClient({ 
  apiKey: process.env.ELEVENLABS_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, candidateName, referenceName, companyName, roleTitle, workDuration } = await request.json();

    if (!phoneNumber || !candidateName || !referenceName) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, candidateName, referenceName' },
        { status: 400 }
      );
    }

    console.log('Initiating ElevenLabs outbound call for:', { 
      candidateName, 
      referenceName, 
      phoneNumber,
      companyName,
      roleTitle,
      workDuration 
    });

    // Make outbound call using ElevenLabs native API
    const callResponse = await client.conversationalAi.twilio.outboundCall({
      agentId: process.env.ELEVENLABS_AGENT_ID!,
      agentPhoneNumberId: process.env.ELEVENLABS_AGENT_PHONE_ID!,
      toNumber: phoneNumber,
      conversationInitiationClientData: {
        dynamicVariables: {
          candidate_name: candidateName,
          reference_name: referenceName,
          company_name: companyName || '',
          role_title: roleTitle || '',
          work_duration: workDuration || ''
        }
      }
    });

    console.log('ElevenLabs call initiated successfully:', {
      conversationId: callResponse.conversationId,
      callSid: callResponse.callSid,
      success: callResponse.success,
      message: callResponse.message
    });

    return NextResponse.json({
      success: true,
      conversationId: callResponse.conversationId,
      callSid: callResponse.callSid,
      message: callResponse.message || 'Reference call initiated successfully',
      candidateName,
      referenceName,
      phoneNumber,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error making ElevenLabs outbound call:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: `Failed to initiate reference call: ${errorMessage}`,
        success: false 
      },
      { status: 500 }
    );
  }
} 