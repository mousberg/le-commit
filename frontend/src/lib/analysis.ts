import { Groq } from 'groq-sdk';
import { Applicant } from './interfaces/applicant';
import { CvData } from './interfaces/cv';
import { LinkedInData } from './interfaces/applicant';
import { GitHubData } from './interfaces/github';
import { AnalysisResult } from './interfaces/analysis';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Count available data sources for an applicant
 */
function countAvailableDataSources(applicant: Applicant): number {
  return [
    applicant.cv_data,
    applicant.li_data,
    applicant.gh_data
  ].filter(Boolean).length;
}

/**
 * Create a fallback analysis result when insufficient data is available
 */
function createInsufficientDataFallback(applicantId: string, availableDataSources: number): AnalysisResult {
  return {
    score: 50,
    summary: availableDataSources === 0
      ? 'No data sources available for credibility analysis.'
      : 'Analysis completed with limited data sources.',
    flags: [{
      type: 'yellow',
      category: 'verification',
      message: availableDataSources === 0
        ? 'No data sources (CV, LinkedIn, or GitHub) available for analysis.'
        : `Analysis performed with ${availableDataSources}/3 data sources. Additional sources would improve accuracy.`,
      severity: availableDataSources === 0 ? 5 : 3
    }],
    suggestedQuestions: availableDataSources === 0
      ? ['Could you provide a CV, LinkedIn profile, or GitHub profile for analysis?']
      : ['Could you provide additional information sources (CV, LinkedIn, or GitHub) to improve analysis accuracy?'],
    analysisDate: new Date().toISOString(),
    sources: []
  };
}

/**
 * Create an error fallback analysis result
 */
export function createErrorFallback(error?: string): AnalysisResult {
  return {
    score: 50,
    summary: 'Analysis could not be completed due to technical error.',
    flags: [{
      type: 'yellow',
      category: 'verification',
      message: 'Analysis could not be completed due to technical error',
      severity: 5
    }],
    suggestedQuestions: ['Could you provide additional information about your background?'],
    analysisDate: new Date().toISOString(),
    sources: [],
    ...(error && { error })
  };
}

/**
 * Main analysis function that performs comprehensive credibility analysis in a single call
 */
export async function analyzeApplicant(applicant: Applicant): Promise<Applicant> {
  console.log(`Starting comprehensive analysis for applicant ${applicant.id}`);

  try {
    // Count available data sources
    const availableDataSources = countAvailableDataSources(applicant);

    // Run analysis even with just one data source
    if (availableDataSources === 0) {
      console.log(`No data sources available for applicant ${applicant.id}. Cannot perform analysis.`);

      // Return applicant with no data fallback
      return {
        ...applicant,
        ai_data: createInsufficientDataFallback(applicant.id, availableDataSources),
        score: 50
      };
    }

    const analysisResult = await performComprehensiveAnalysis(
      applicant.cv_data || undefined,
      applicant.li_data || undefined,
      applicant.gh_data || undefined,
      applicant.name,
      applicant.email || undefined,
      undefined // role field doesn't exist in new model
    );

    // Update applicant with analysis results
    return {
      ...applicant,
      ai_data: analysisResult,
      score: analysisResult.score
    };
  } catch (error) {
    console.error(`Error during analysis for applicant ${applicant.id}:`, error);

    // Return applicant with basic analysis indicating error
    return {
      ...applicant,
      ai_data: createErrorFallback(error instanceof Error ? error.message : undefined),
      score: 50
    };
  }
}

/**
 * Perform comprehensive credibility analysis in a single call
 */
async function performComprehensiveAnalysis(
  cvData?: CvData,
  linkedinData?: LinkedInData,
  githubData?: GitHubData,
  name?: string,
  email?: string,
  role?: string
): Promise<AnalysisResult> {
  const availableSourcesCount = [cvData, linkedinData, githubData].filter(Boolean).length;

  const prompt = `
You are a credibility-checking assistant inside Unmask, a tool used by hiring managers to verify whether candidates are being honest and consistent in their job applications.

Your job is to review structured data about a candidate and assess the overall *authenticity* of the profile. You are not scoring technical ability — only consistency and believability.

**Important:** You are analyzing a candidate with ${availableSourcesCount} data sources available. This analysis is performed because we have sufficient data sources to perform cross-verification.

**Candidate Information:**
- Name: ${name || 'Not provided'}
- Email: ${email || 'Not provided'}
- Role: ${role || 'Not specified'}

**Available Data Sources:**
- CV: ${cvData ? 'Available' : 'Not available'}
- LinkedIn: ${linkedinData ? 'Available' : 'Not available'}
- GitHub: ${githubData ? 'Available' : 'Not available'}

**Data:**
CV Data: ${cvData ? JSON.stringify(cvData, null, 2) : 'Not provided'}
LinkedIn Data: ${linkedinData ? JSON.stringify(linkedinData, null, 2) : 'Not provided'}
GitHub Data: ${githubData ? JSON.stringify(githubData, null, 2) : 'Not provided'}

**Your Tasks:**

1. **Compare CV and LinkedIn information** (if both available)
   - Check if the full name in the CV matches the LinkedIn data
   - Evaluate if job titles, company names, and employment dates are consistent
   - Flag unrealistic career jumps (e.g., 3 unicorns in a year, vague titles)
   - Flag aliases or recent account creation (if metadata is available)

2. **Verify education**
   - Check that the institutions in the CV are real and align with those on LinkedIn (if visible)
   - Flag degrees in the CV that don't show up on LinkedIn

3. **Evaluate LinkedIn signals** (if provided)
   - Does the candidate have at least 30–50 connections? (a near-zero number may signal a ghost profile)
   - Do they have any activity, such as posts or comments?
   - Are there any recommendations listed?
   - Do their connections match the companies they list?

4. **Evaluate GitHub signals** (if provided)
   - Are repositories high quality with documentation?
   - Do commit patterns show consistent, genuine activity?
   - Are projects substantial and original vs tutorial following?
   - Does the profile appear professional and complete?

5. **Identify red/yellow flags**
   - Red flag: major inconsistency (e.g. job listed in CV not on LinkedIn, alias or unverifiable employer)
   - Yellow flag: soft concern (e.g. no GitHub, inactive LinkedIn, unverified university)

6. **Suggest 1–3 questions to ask the candidate if credibility is not clear**

**Scoring Guidelines:**
- 90-100: Highly credible, minimal concerns
- 70-89: Generally credible with minor concerns
- 50-69: Moderate concerns, requires attention
- 30-49: Significant red flags, requires investigation
- 0-29: High risk, major credibility issues

**Output Format:**

Return a JSON object with:
{
  "score": 0-100,
  "summary": "1-2 sentence judgment",
  "flags": [{"type": "red"|"yellow", "category": "consistency"|"verification"|"authenticity"|"activity", "message": "specific concern", "severity": 1-10}],
  "suggestedQuestions": ["array of clarifying questions to ask the candidate"],
  "sources": [{"type": "cv"|"linkedin"|"github", "available": boolean, "score": 0-100, "flags": [], "analysisDetails": {}}]
}

Be objective. Do not make assumptions. Only work with the structured data provided. If data is missing, acknowledge it appropriately but still provide analysis based on what is available.
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return {
      score: result.score || 50,
      summary: result.summary || 'Analysis completed with available data.',
      flags: (result.flags || []).map((flag: Record<string, unknown>) => ({
        type: flag.type === 'red' || flag.type === 'yellow' ? flag.type : 'yellow',
        category: flag.category || 'verification',
        message: flag.message || 'Analysis concern detected',
        severity: typeof flag.severity === 'number' ? Math.max(1, Math.min(10, flag.severity)) : 5
      })),
      suggestedQuestions: result.suggestedQuestions || [],
      analysisDate: new Date().toISOString(),
      sources: result.sources || []
    };
  } catch (error) {
    console.error('Comprehensive analysis failed:', error);
    return {
      score: 50,
      summary: 'Analysis could not be completed due to technical error.',
      flags: [{ type: 'yellow', category: 'verification', message: 'Analysis system temporarily unavailable', severity: 5 }],
      suggestedQuestions: ['Could you provide additional information about your background?'],
      analysisDate: new Date().toISOString(),
      sources: []
    };
  }
}
