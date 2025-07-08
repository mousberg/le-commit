import { Groq } from 'groq-sdk';
import { Applicant } from './interfaces/applicant';
import { CvData } from './interfaces/cv';
import { GitHubData } from './interfaces/github';
import {
  AnalysisResult,
  CvAnalysis,
  LinkedInAnalysis,
  GitHubAnalysis,
  CrossReferenceAnalysis
} from './interfaces/analysis';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Main analysis function that orchestrates all analysis types
 */
export async function analyzeApplicant(applicant: Applicant): Promise<Applicant> {
  console.log(`Starting comprehensive analysis for applicant ${applicant.id}`);

  try {
    const analysisResults = await Promise.allSettled([
      analyzeCV(applicant.cvData),
      analyzeLinkedIn(applicant.linkedinData),
      analyzeGitHub(applicant.githubData),
      crossReferenceAnalysis(applicant.cvData, applicant.linkedinData, applicant.githubData)
    ]);

    // Process results
    const cvAnalysis = analysisResults[0].status === 'fulfilled' ? analysisResults[0].value : null;
    const linkedinAnalysis = analysisResults[1].status === 'fulfilled' ? analysisResults[1].value : null;
    const githubAnalysis = analysisResults[2].status === 'fulfilled' ? analysisResults[2].value : null;
    const crossRefAnalysis = analysisResults[3].status === 'fulfilled' ? analysisResults[3].value : null;

    // Generate overall analysis
    const overallAnalysis = await generateOverallAnalysis(
      applicant,
      cvAnalysis,
      linkedinAnalysis,
      githubAnalysis,
      crossRefAnalysis
    );

    // Update applicant with analysis results
    return {
      ...applicant,
      analysisResult: overallAnalysis,
      individualAnalysis: {
        cv: cvAnalysis || undefined,
        linkedin: linkedinAnalysis || undefined,
        github: githubAnalysis || undefined
      },
      crossReferenceAnalysis: crossRefAnalysis || undefined,
      score: overallAnalysis.credibilityScore
    };
  } catch (error) {
    console.error(`Error during analysis for applicant ${applicant.id}:`, error);

    // Return applicant with basic analysis indicating error
    return {
      ...applicant,
      analysisResult: {
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
 * Analyze CV data for credibility and completeness
 */
async function analyzeCV(cvData?: CvData): Promise<CvAnalysis | null> {
  if (!cvData) return null;

  const prompt = `
Analyze this CV data for credibility and completeness. Focus on:

1. **Timeline Consistency**: Check for realistic career progression, no overlapping positions, reasonable gaps
2. **Experience Realism**: Evaluate if job titles and responsibilities match experience level and industry norms
3. **Education Verification**: Check if institutions and degrees seem legitimate
4. **Skills Credibility**: Assess if listed skills align with experience and roles
5. **Completeness**: Evaluate how complete the profile is

CV Data:
${JSON.stringify(cvData, null, 2)}

Evaluate the following specifically:
- Are there any timeline gaps or overlaps in employment/education?
- Do job titles progress logically?
- Are the listed skills realistic for the experience level?
- Does the education appear legitimate?
- Is the contact information complete?

Return a JSON object with:
{
  "completenessScore": 0-100,
  "consistencyScore": 0-100,
  "experienceRealism": 0-100,
  "skillsCredibility": 0-100,
  "educationVerification": ["array of concerns about education"],
  "timelineGaps": [{"type": "employment|education", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "durationMonths": number, "severity": "minor|moderate|major"}],
  "flags": [{"type": "red|yellow", "category": "consistency|verification|completeness|authenticity", "message": "specific concern", "severity": 1-10}]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-3.1-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return processAnalysisResult(result) as unknown as CvAnalysis;
  } catch (error) {
    console.error('CV analysis failed:', error);
    return {
      completenessScore: 50,
      consistencyScore: 50,
      experienceRealism: 50,
      educationVerification: [],
      timelineGaps: [],
      skillsCredibility: 50,
      flags: [{ type: 'yellow', category: 'verification', message: 'CV analysis failed', severity: 5 }]
    };
  }
}

/**
 * Analyze LinkedIn data for authenticity and activity
 */
async function analyzeLinkedIn(linkedinData?: CvData): Promise<LinkedInAnalysis | null> {
  if (!linkedinData) return null;

  const prompt = `
Analyze this LinkedIn profile data for authenticity and credibility. Focus on:

1. **Profile Completeness**: How complete is the profile?
2. **Activity Level**: Signs of genuine engagement vs ghost profile
3. **Network Quality**: Connection patterns and recommendations
4. **Content Authenticity**: Quality and consistency of profile information
5. **Account Signals**: Age, activity patterns, verification signals

LinkedIn Data:
${JSON.stringify(linkedinData, null, 2)}

Evaluate:
- Does the profile appear complete and professional?
- Are there signs of genuine activity and engagement?
- Do the connections and recommendations seem authentic?
- Is the content consistent and believable?

Return a JSON object with:
{
  "profileCompleteness": 0-100,
  "activityLevel": 0-100,
  "networkQuality": 0-100,
  "contentAuthenticity": 0-100,
  "cvConsistency": 0-100,
  "connectionCount": estimated_number_or_null,
  "hasActivity": boolean,
  "hasRecommendations": boolean,
  "flags": [{"type": "red|yellow", "category": "authenticity|activity|completeness", "message": "specific concern", "severity": 1-10}]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-3.1-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return processAnalysisResult(result) as unknown as LinkedInAnalysis;
  } catch (error) {
    console.error('LinkedIn analysis failed:', error);
    return {
      profileCompleteness: 50,
      activityLevel: 50,
      networkQuality: 50,
      contentAuthenticity: 50,
      cvConsistency: 50,
      hasActivity: false,
      hasRecommendations: false,
      flags: [{ type: 'yellow', category: 'verification', message: 'LinkedIn analysis failed', severity: 5 }]
    };
  }
}

/**
 * Analyze GitHub data for technical credibility
 */
async function analyzeGitHub(githubData?: GitHubData): Promise<GitHubAnalysis | null> {
  if (!githubData) return null;

  const prompt = `
Analyze this GitHub profile for technical credibility and authenticity. Focus on:

1. **Code Quality**: Repository quality, documentation, best practices
2. **Activity Consistency**: Commit patterns, contribution regularity
3. **Contribution Realism**: Are contributions genuine and meaningful?
4. **Profile Completeness**: Bio, contact info, professional presentation
5. **Skills Alignment**: Do repositories match claimed technical skills?
6. **Project Quality**: Evidence of real projects vs tutorial following

GitHub Data:
${JSON.stringify(githubData, null, 2)}

Evaluate:
- Are the repositories high quality with good documentation?
- Do commit patterns show consistent, genuine activity?
- Are the projects substantial and original?
- Does the profile appear professional and complete?

Return a JSON object with:
{
  "codeQuality": 0-100,
  "activityConsistency": 0-100,
  "contributionRealism": 0-100,
  "profileCompleteness": 0-100,
  "skillsAlignment": 0-100,
  "projectQuality": 0-100,
  "flags": [{"type": "red|yellow", "category": "authenticity|activity|completeness", "message": "specific concern", "severity": 1-10}]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-3.1-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return processAnalysisResult(result) as unknown as GitHubAnalysis;
  } catch (error) {
    console.error('GitHub analysis failed:', error);
    return {
      codeQuality: 50,
      activityConsistency: 50,
      contributionRealism: 50,
      profileCompleteness: 50,
      skillsAlignment: 50,
      projectQuality: 50,
      flags: [{ type: 'yellow', category: 'verification', message: 'GitHub analysis failed', severity: 5 }]
    };
  }
}

/**
 * Cross-reference analysis between all data sources
 */
async function crossReferenceAnalysis(
  cvData?: CvData,
  linkedinData?: CvData,
  githubData?: GitHubData
): Promise<CrossReferenceAnalysis | null> {
  if (!cvData) return null;

  const prompt = `
Compare and cross-reference these data sources for consistency and authenticity:

CV Data: ${JSON.stringify(cvData, null, 2)}
LinkedIn Data: ${linkedinData ? JSON.stringify(linkedinData, null, 2) : 'Not provided'}
GitHub Data: ${githubData ? JSON.stringify(githubData, null, 2) : 'Not provided'}

Analyze for:
1. **Name Consistency**: Do names match across sources?
2. **Experience Consistency**: Job titles, companies, dates alignment
3. **Skills Consistency**: Technical and professional skills alignment
4. **Education Consistency**: Degrees and institutions matching
5. **Timeline Consistency**: Employment dates and career progression
6. **Contact Information**: Email, location consistency

Look for:
- Name mismatches or inconsistencies
- Different job titles for the same role
- Misaligned employment dates
- Skills listed in one source but not others
- Education discrepancies

Return a JSON object with:
{
  "nameConsistency": boolean,
  "cvLinkedInConsistency": 0-100,
  "cvGitHubConsistency": 0-100,
  "linkedInGitHubConsistency": 0-100,
  "experienceConsistency": [{"field": "string", "cvValue": "string", "linkedinValue": "string", "githubValue": "string", "severity": "minor|moderate|major", "description": "string"}],
  "skillsConsistency": [{"field": "string", "cvValue": "string", "linkedinValue": "string", "githubValue": "string", "severity": "minor|moderate|major", "description": "string"}],
  "educationConsistency": [{"field": "string", "cvValue": "string", "linkedinValue": "string", "githubValue": "string", "severity": "minor|moderate|major", "description": "string"}],
  "flags": [{"type": "red|yellow", "category": "consistency", "message": "specific inconsistency", "severity": 1-10}]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-3.1-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return processAnalysisResult(result) as unknown as CrossReferenceAnalysis;
  } catch (error) {
    console.error('Cross-reference analysis failed:', error);
    return {
      nameConsistency: true,
      cvLinkedInConsistency: 50,
      cvGitHubConsistency: 50,
      linkedInGitHubConsistency: 50,
      experienceConsistency: [],
      skillsConsistency: [],
      educationConsistency: [],
      flags: [{ type: 'yellow', category: 'verification', message: 'Cross-reference analysis failed', severity: 5 }]
    };
  }
}

/**
 * Generate overall credibility analysis and recommendations
 */
async function generateOverallAnalysis(
  applicant: Applicant,
  cvAnalysis?: CvAnalysis | null,
  linkedinAnalysis?: LinkedInAnalysis | null,
  githubAnalysis?: GitHubAnalysis | null,
  crossRefAnalysis?: CrossReferenceAnalysis | null
): Promise<AnalysisResult> {
  const prompt = `
You are a credibility-checking assistant for Unmask, a hiring verification tool.

Analyze this candidate's overall credibility based on their data sources and individual analyses:

**Candidate**: ${applicant.name} (${applicant.email})
**Role**: ${applicant.role || 'Not specified'}

**Available Data Sources:**
- CV: ${applicant.cvData ? 'Available' : 'Not available'}
- LinkedIn: ${applicant.linkedinData ? 'Available' : 'Not available'}
- GitHub: ${applicant.githubData ? 'Available' : 'Not available'}

**Individual Analysis Results:**
CV Analysis: ${cvAnalysis ? JSON.stringify(cvAnalysis, null, 2) : 'Not analyzed'}
LinkedIn Analysis: ${linkedinAnalysis ? JSON.stringify(linkedinAnalysis, null, 2) : 'Not analyzed'}
GitHub Analysis: ${githubAnalysis ? JSON.stringify(githubAnalysis, null, 2) : 'Not analyzed'}
Cross-Reference Analysis: ${crossRefAnalysis ? JSON.stringify(crossRefAnalysis, null, 2) : 'Not analyzed'}

**Your Task:**
Generate an overall credibility assessment focusing on:
1. Consistency across all data sources
2. Authenticity signals and red flags
3. Completeness and professionalism
4. Technical credibility (if applicable)
5. Specific areas of concern that warrant follow-up

**Scoring Guidelines:**
- 90-100: Highly credible, minimal concerns
- 70-89: Generally credible with minor concerns
- 50-69: Moderate concerns, requires attention
- 30-49: Significant red flags, requires investigation
- 0-29: High risk, major credibility issues

Return a JSON object with:
{
  "credibilityScore": 0-100,
  "summary": "1-2 sentences about overall assessment",
  "flags": [{"type": "red|yellow", "category": "consistency|verification|completeness|authenticity|activity", "message": "specific concern", "severity": 1-10}],
  "suggestedQuestions": ["array of 1-3 specific questions to ask the candidate"],
  "sources": [{"type": "cv|linkedin|github", "available": boolean, "score": 0-100, "flags": [], "analysisDetails": {}}]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-3.1-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
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
    console.error('Overall analysis failed:', error);
    return {
      credibilityScore: 50,
      summary: 'Analysis completed with limited data due to technical constraints.',
      flags: [{ type: 'yellow', category: 'verification', message: 'Overall analysis could not be completed', severity: 5 }],
      suggestedQuestions: ['Could you provide additional information about your background?'],
      analysisDate: new Date().toISOString(),
      sources: []
    };
  }
}

/**
 * Helper function to process and clean analysis results
 */
function processAnalysisResult(result: Record<string, unknown>): Record<string, unknown> {
  // Clean and validate the result structure
  const cleaned: Record<string, unknown> = {
    ...result,
    flags: (result.flags as Record<string, unknown>[] || []).map((flag: Record<string, unknown>) => ({
      type: flag.type === 'red' || flag.type === 'yellow' ? flag.type : 'yellow',
      category: flag.category || 'verification',
      message: flag.message || 'Analysis concern detected',
      severity: typeof flag.severity === 'number' ? Math.max(1, Math.min(10, flag.severity)) : 5
    }))
  };

  // Ensure numeric fields are valid numbers
  const numericFields = ['completenessScore', 'consistencyScore', 'experienceRealism', 'skillsCredibility',
    'profileCompleteness', 'activityLevel', 'networkQuality', 'contentAuthenticity', 'cvConsistency',
    'codeQuality', 'activityConsistency', 'contributionRealism', 'projectQuality', 'skillsAlignment',
    'cvLinkedInConsistency', 'cvGitHubConsistency', 'linkedInGitHubConsistency'];

  numericFields.forEach(field => {
    if (field in cleaned) {
      const value = cleaned[field];
      if (typeof value !== 'number' || isNaN(value)) {
        cleaned[field] = 50; // Default score
      } else {
        cleaned[field] = Math.max(0, Math.min(100, value)); // Clamp to 0-100
      }
    }
  });

  // Ensure required arrays exist
  const arrayFields = ['flags', 'timelineGaps', 'educationVerification', 'experienceConsistency', 'skillsConsistency', 'educationConsistency'];
  arrayFields.forEach(field => {
    if (!(field in cleaned) || !Array.isArray(cleaned[field])) {
      cleaned[field] = [];
    }
  });

  // Ensure boolean fields exist
  if (typeof cleaned.nameConsistency !== 'boolean') {
    cleaned.nameConsistency = true;
  }
  if (typeof cleaned.hasActivity !== 'boolean') {
    cleaned.hasActivity = false;
  }
  if (typeof cleaned.hasRecommendations !== 'boolean') {
    cleaned.hasRecommendations = false;
  }

  return cleaned;
}
