import { Groq } from 'groq-sdk';
import { Applicant } from './interfaces/applicant';
import { CvData } from './interfaces/cv';
import { GitHubData } from './interfaces/github';
import { AnalysisResult } from './interfaces/analysis';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Main analysis function that performs comprehensive credibility analysis in a single call
 */
export async function analyzeApplicant(applicant: Applicant): Promise<Applicant> {
  console.log(`Starting comprehensive analysis for applicant ${applicant.id}`);

  try {
    const analysisResult = await performComprehensiveAnalysis(
      applicant.cv_data || undefined,
      applicant.linkedin_data || undefined,
      applicant.github_data || undefined,
      applicant.name,
      applicant.email || undefined,
      applicant.role || undefined
    );

    // Update applicant with analysis results
    return {
      ...applicant,
      analysis_result: analysisResult,
      score: analysisResult.credibilityScore
    };
  } catch (error) {
    console.error(`Error during analysis for applicant ${applicant.id}:`, error);

    // Return applicant with basic analysis indicating error
    return {
      ...applicant,
      analysis_result: {
        credibilityScore: 50,
        summary: 'Analysis failed due to technical error.',
        flags: [{
          type: 'yellow',
          category: 'verification',
          message: 'Analysis could not be completed due to technical error',
          severity: 5
        }],
        suggestedQuestions: ['Could you provide additional information about your background?'],
        analysisDate: new Date().toISOString(),
        sources: []
      },
      score: 50
    };
  }
}

/**
 * Perform comprehensive credibility analysis in a single call
 */
async function performComprehensiveAnalysis(
  cvData?: CvData,
  linkedinData?: CvData,
  githubData?: GitHubData,
  name?: string,
  email?: string,
  role?: string
): Promise<AnalysisResult> {
  const prompt = `
You are a credibility-checking assistant inside Unmask, a tool used by hiring managers to verify whether candidates are being honest and consistent in their job applications.

Your job is to review structured data about a candidate and assess the overall *authenticity* of the profile. You are not scoring technical ability — only consistency and believability.

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
  "credibilityScore": 0-100,
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
      credibilityScore: result.credibilityScore || 50,
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
      credibilityScore: 50,
      summary: 'Analysis could not be completed due to technical error.',
      flags: [{ type: 'yellow', category: 'verification', message: 'Analysis system temporarily unavailable', severity: 5 }],
      suggestedQuestions: ['Could you provide additional information about your background?'],
      analysisDate: new Date().toISOString(),
      sources: []
    };
  }
}
