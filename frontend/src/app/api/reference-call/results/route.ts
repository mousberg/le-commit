import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { agentId, callSid, transcript, analysis, status } = data;

    console.log('Received ElevenLabs AI results:', {
      agentId,
      callSid,
      status,
      transcriptLength: transcript?.length || 0,
      timestamp: new Date().toISOString(),
    });

    // Process the AI analysis results
    const processedResults = processAIAnalysis(transcript, analysis);

    // Here you would typically save results to your database
    console.log('Processed reference check results:', {
      agentId,
      callSid,
      ...processedResults,
    });

    return NextResponse.json({
      success: true,
      message: 'Results received and processed',
      results: processedResults,
    });
  } catch (error) {
    console.error('Error processing AI results:', error);
    return NextResponse.json(
      { error: 'Failed to process results' },
      { status: 500 }
    );
  }
}

function processAIAnalysis(transcript: string, analysis: any) {
  // Simple analysis for demo - in production, this would be more sophisticated
  const keywords = {
    positive: ['excellent', 'great', 'good', 'reliable', 'recommend', 'skilled', 'talented', 'professional', 'outstanding'],
    negative: ['poor', 'bad', 'unreliable', 'problems', 'concerns', 'issues', 'wouldn\'t recommend', 'terrible'],
    technical: ['technical', 'coding', 'programming', 'development', 'software', 'engineering', 'skills'],
  };

  const text = transcript?.toLowerCase() || '';
  
  const positiveScore = keywords.positive.filter(word => text.includes(word)).length;
  const negativeScore = keywords.negative.filter(word => text.includes(word)).length;
  const technicalMentions = keywords.technical.filter(word => text.includes(word)).length;

  let sentiment = 'neutral';
  if (positiveScore > negativeScore) sentiment = 'positive';
  if (negativeScore > positiveScore) sentiment = 'negative';

  const credibilityScore = Math.max(1, Math.min(10, 5 + positiveScore - negativeScore + technicalMentions));

  return {
    sentiment,
    credibilityScore,
    technicalMentions,
    positiveKeywords: keywords.positive.filter(word => text.includes(word)),
    negativeKeywords: keywords.negative.filter(word => text.includes(word)),
    summary: `Reference appears ${sentiment} with credibility score ${credibilityScore}/10`,
    transcript,
    analysis: analysis || 'AI analysis pending',
    timestamp: new Date().toISOString(),
  };
} 