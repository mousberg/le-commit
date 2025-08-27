import { NextResponse } from 'next/server';
import { startProcessing, validateRequestBody } from '@/lib/processing';
import { processGitHubAccount } from '@/lib/github';

export async function POST(request: Request) {
  // Validate request body
  const bodyValidation = validateRequestBody(request);
  if (bodyValidation) return bodyValidation;

  const body = await request.json();
  const { applicant_id, github_url } = body;

  if (!applicant_id || !github_url) {
    return NextResponse.json(
      { error: 'applicant_id and github_url are required' },
      { status: 400 }
    );
  }

  // Use the reusable processing function
  return startProcessing(
    applicant_id,
    'gh_status',
    async () => {
      return await processGitHubAccount(github_url, {
        maxRepos: 50,
        includeOrganizations: true,
        analyzeContent: true,
        maxContentAnalysis: 3,
        includeActivity: true
      });
    },
    'GitHub'
  );
}
