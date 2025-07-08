import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface TranscriptEntry {
  speaker: string;
  timestamp: string;
  text: string;
}

interface TranscriptData {
  conversation_id: string;
  status: string;
  call_duration_secs: number;
  message_count: number;
  transcript: TranscriptEntry[];
}

export async function POST(request: NextRequest) {
  try {
    const { transcript }: { transcript: TranscriptData } = await request.json();

    if (!transcript || !transcript.transcript || transcript.transcript.length === 0) {
      return NextResponse.json(
        { error: 'No transcript data provided or transcript is empty' },
        { status: 400 }
      );
    }

    console.log('Analyzing transcript for conversation:', transcript.conversation_id);

    // Format transcript for AI analysis
    const formattedTranscript = transcript.transcript
      .map(entry => `${entry.speaker}: ${entry.text}`)
      .join('\n');

    // Create AI prompt for reference call analysis
    const systemPrompt = `You are an expert HR analyst specializing in reference call analysis. Your job is to analyze reference call transcripts and provide a concise, professional summary.

ANALYSIS GUIDELINES:
- Focus on the reference's actual statements about the candidate
- Identify key strengths, weaknesses, and overall sentiment
- Note any red flags or concerns mentioned
- Assess the reference's recommendation level
- Keep the summary to 1-2 sentences maximum
- Be objective and professional

SUMMARY FORMAT:
Provide a brief summary that captures:
1. Overall sentiment (positive/mixed/negative)
2. Key strengths or concerns mentioned
3. Whether they would recommend the candidate

EXAMPLE GOOD SUMMARIES:
- "Positive feedback on technical skills and teamwork, would hire again."
- "Mixed review citing strong output but communication challenges."
- "Highly recommends candidate, praised leadership and reliability."
- "Concerns raised about deadlines, but acknowledged creativity."`;

    const userPrompt = `Please analyze this reference call transcript and provide a concise professional summary:

TRANSCRIPT:
${formattedTranscript}

Provide only the summary, no additional text or formatting.`;

    // Call OpenAI for analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the more cost-effective model for summarization
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userPrompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3 // Lower temperature for more consistent summaries
    });

    const summary = completion.choices[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error('Failed to generate summary from AI response');
    }

    console.log('Generated summary for conversation:', transcript.conversation_id, summary);

    return NextResponse.json({
      success: true,
      summary,
      conversationId: transcript.conversation_id,
      analysisTimestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing transcript:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: `Failed to analyze transcript: ${errorMessage}`,
        success: false 
      },
      { status: 500 }
    );
  }
} 