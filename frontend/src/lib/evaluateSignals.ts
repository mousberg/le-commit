/**
  * CV signals
  * LinkedIn signals
  * Combined signals
  */

import Groq from 'groq-sdk';
import { Signal, SignalEvaluation } from './interfaces/signals';
import { CvData, ContractType, LanguageLevel } from './interfaces/cv';
import { LinkedInData } from './interfaces/linkedin';
import { ALL_SIGNALS } from './signals';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface EvaluationContext {
  cvData?: CvData;
  linkedinData?: LinkedInData;
  additionalContext?: Record<string, unknown>;
}

export interface SignalEvaluationResult {
  signal: Signal;
  evaluation: SignalEvaluation;
  timestamp: Date;
}

/**
 * Evaluate a single signal using Groq
 */
async function evaluateSignal(
  signal: Signal,
  context: EvaluationContext
): Promise<SignalEvaluationResult> {
  // Check if we have the required data for this signal
  if (signal.requiresCV && !context.cvData) {
    return {
      signal,
      evaluation: {
        evaluation_score: 0,
        reason: 'CV data required but not provided'
      },
      timestamp: new Date()
    };
  }

  if (signal.requiresLinkedIn && !context.linkedinData) {
    return {
      signal,
      evaluation: {
        evaluation_score: 0,
        reason: 'LinkedIn data required but not provided'
      },
      timestamp: new Date()
    };
  }

  // Prepare the context data for the AI evaluation
  const contextData = {
    cvData: signal.requiresCV ? context.cvData : null,
    linkedinData: signal.requiresLinkedIn ? context.linkedinData : null,
    additionalContext: context.additionalContext || {}
  };

  // Create a detailed prompt for the AI to evaluate the signal
  const systemPrompt = `
You are an expert background verification specialist. You need to evaluate a specific signal for authenticity and credibility.

Signal to evaluate: ${signal.name}
Description: ${signal.description}
Importance: ${signal.importance}

Your task is to analyze the provided data and return a JSON object with:
- evaluation_score: A number between 0 and 1 (0 = completely fails the signal, 1 = perfectly passes the signal)
- reason: A clear explanation of why you gave this score

Consider the following factors:
1. Data consistency and accuracy
2. Timeline plausibility
3. Technical feasibility
4. Professional authenticity
5. Red flags or inconsistencies

Be thorough but concise in your reasoning.
`;

  const userPrompt = `
Please evaluate this signal based on the following data:

${JSON.stringify(contextData, null, 2)}

Return only a valid JSON object with evaluation_score and reason fields.
`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from Groq API');
    }

    const evaluation = JSON.parse(responseContent) as SignalEvaluation;

    // Validate the evaluation
    if (typeof evaluation.evaluation_score !== 'number' ||
        evaluation.evaluation_score < 0 ||
        evaluation.evaluation_score > 1) {
      throw new Error('Invalid evaluation score');
    }

    return {
      signal,
      evaluation,
      timestamp: new Date()
    };

  } catch (error) {
    console.error(`Error evaluating signal ${signal.name}:`, error);
    return {
      signal,
      evaluation: {
        evaluation_score: 0,
        reason: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      timestamp: new Date()
    };
  }
}

/**
 * Evaluate all signals in parallel
 */
export async function evaluateAllSignals(
  context: EvaluationContext,
  signalsToEvaluate: Signal[] = ALL_SIGNALS
): Promise<SignalEvaluationResult[]> {
  console.log(`Starting evaluation of ${signalsToEvaluate.length} signals...`);

  // Filter signals based on available data
  const applicableSignals = signalsToEvaluate.filter(signal => {
    if (signal.requiresCV && !context.cvData) return false;
    if (signal.requiresLinkedIn && !context.linkedinData) return false;
    return true;
  });

  console.log(`Evaluating ${applicableSignals.length} applicable signals...`);

  // Evaluate all signals in parallel
  const evaluationPromises = applicableSignals.map(signal =>
    evaluateSignal(signal, context)
  );

  try {
    const results = await Promise.all(evaluationPromises);
    console.log(`Completed evaluation of ${results.length} signals`);
    return results;
  } catch (error) {
    console.error('Error in parallel signal evaluation:', error);
    throw error;
  }
}

/**
 * Calculate an overall authenticity score based on signal evaluations
 */
export function calculateOverallScore(results: SignalEvaluationResult[]): {
  overallScore: number;
  weightedScore: number;
  summary: {
    totalSignals: number;
    passedSignals: number;
    failedSignals: number;
    averageScore: number;
  };
} {
  if (results.length === 0) {
    return {
      overallScore: 0,
      weightedScore: 0,
      summary: {
        totalSignals: 0,
        passedSignals: 0,
        failedSignals: 0,
        averageScore: 0
      }
    };
  }

  const totalWeight = results.reduce((sum, result) => sum + result.signal.importance, 0);
  const weightedSum = results.reduce((sum, result) =>
    sum + (result.evaluation.evaluation_score * result.signal.importance), 0
  );

  const averageScore = results.reduce((sum, result) =>
    sum + result.evaluation.evaluation_score, 0
  ) / results.length;

  const passedSignals = results.filter(result => result.evaluation.evaluation_score >= 0.7).length;
  const failedSignals = results.filter(result => result.evaluation.evaluation_score < 0.3).length;

  return {
    overallScore: averageScore,
    weightedScore: weightedSum / totalWeight,
    summary: {
      totalSignals: results.length,
      passedSignals,
      failedSignals,
      averageScore
    }
  };
}

/**
 * Get high-risk signals (those that failed evaluation)
 */
export function getHighRiskSignals(
  results: SignalEvaluationResult[],
  threshold: number = 0.3
): SignalEvaluationResult[] {
  return results
    .filter(result => result.evaluation.evaluation_score < threshold)
    .sort((a, b) => b.signal.importance - a.signal.importance);
}

/**
 * Example usage function
 */
export async function exampleEvaluation() {
  // Example CV data (this would come from your CV parsing)
  const exampleCvData: CvData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    personalWebsite: 'https://johndoe.dev',
    professionalSummary: 'Senior Software Engineer with 5 years of experience',
    jobTitle: 'Senior Software Engineer',
    professionalExperiences: [
      {
        companyName: 'Tech Corp',
        title: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        type: 'PERMANENT_CONTRACT' as ContractType,
        startYear: 2020,
        startMonth: 1,
        endYear: 2024,
        endMonth: 12,
        ongoing: false,
        description: 'Led development of microservices architecture using Node.js and React',
        associatedSkills: ['Node.js', 'React', 'AWS', 'Docker']
      }
    ],
    otherExperiences: [],
    educations: [
      {
        degree: 'Bachelor of Science in Computer Science',
        institution: 'Stanford University',
        location: 'Stanford, CA',
        startYear: 2016,
        endYear: 2020,
        ongoing: false,
        description: 'Focus on software engineering and algorithms',
        associatedSkills: ['Java', 'Python', 'Data Structures']
      }
    ],
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS'],
    languages: [
      {
        language: 'English',
        level: 'NATIVE_BILINGUAL' as LanguageLevel
      }
    ],
    publications: [],
    distinctions: [],
    hobbies: ['Programming', 'Rock Climbing'],
    references: [],
    certifications: [],
    other: {}
  };

  // Example LinkedIn data (this would come from LinkedIn scraping/API)
  const exampleLinkedinData: LinkedInData = {
    name: 'John Doe',
    headline: 'Senior Software Engineer at Tech Corp',
    location: 'San Francisco, CA',
    connections: 500,
    profileUrl: 'https://linkedin.com/in/johndoe',
    experience: [
      {
        company: 'Tech Corp',
        title: 'Senior Software Engineer',
        duration: '2020 - Present',
        description: 'Leading microservices development'
      }
    ],
    education: [
      {
        school: 'Stanford University',
        degree: 'Bachelor of Science, Computer Science',
        years: '2016 - 2020'
      }
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'AWS'],
    activity: {
      posts: 15,
      likes: 50,
      comments: 25
    }
  };

  const context: EvaluationContext = {
    cvData: exampleCvData,
    linkedinData: exampleLinkedinData,
    additionalContext: {
      evaluationDate: new Date().toISOString(),
      evaluatorId: 'system'
    }
  };

  try {
    const results = await evaluateAllSignals(context);
    const overallScore = calculateOverallScore(results);
    const highRiskSignals = getHighRiskSignals(results);

    console.log('=== EVALUATION RESULTS ===');
    console.log('Overall Score:', overallScore);
    console.log('High Risk Signals:', highRiskSignals.length);

    if (highRiskSignals.length > 0) {
      console.log('\n=== HIGH RISK SIGNALS ===');
      highRiskSignals.forEach(result => {
        console.log(`${result.signal.name}: ${result.evaluation.evaluation_score} - ${result.evaluation.reason}`);
      });
    }

    return { results, overallScore, highRiskSignals };
  } catch (error) {
    console.error('Example evaluation failed:', error);
    throw error;
  }
}

// Export the main evaluation function
export { evaluateSignal };
