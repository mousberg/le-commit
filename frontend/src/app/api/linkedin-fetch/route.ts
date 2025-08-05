import { NextResponse } from 'next/server';
import { startProcessing, validateRequestBody } from '@/lib/processing';
import { startLinkedInJob, checkLinkedInJob, processLinkedInData } from '@/lib/linkedin-api';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // Validate request body
  const bodyValidation = validateRequestBody(request);
  if (bodyValidation) return bodyValidation;

  const body = await request.json();
  const { applicant_id, linkedin_url } = body;

  if (!applicant_id || !linkedin_url) {
    return NextResponse.json(
      { error: 'applicant_id and linkedin_url are required' },
      { status: 400 }
    );
  }

  // Use the reusable processing function
  return startProcessing(
    applicant_id,
    'li_status',
    async () => {
      console.log(`🚀 Starting LinkedIn job for ${applicant_id}`);
      const { jobId, isExisting } = await startLinkedInJob(linkedin_url);

      let linkedinData;

      if (isExisting) {
        // For existing snapshots, try to get data directly
        console.log(`♻️ Using existing LinkedIn snapshot ${jobId}`);
        const result = await checkLinkedInJob(jobId, true);
        if (result.data) {
          linkedinData = processLinkedInData(result.data);
        } else {
          throw new Error('No data available from existing snapshot');
        }
      } else {
        // Poll until complete for new jobs
        console.log(`⏳ Waiting for LinkedIn job ${jobId} to complete...`);
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max

        while (attempts < maxAttempts) {
          const result = await checkLinkedInJob(jobId);
          if (result.status === 'completed' && result.data) {
            linkedinData = processLinkedInData(result.data);
            break;
          } else if (result.status === 'failed') {
            throw new Error('LinkedIn job failed');
          }

          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }

        if (!linkedinData) {
          throw new Error('LinkedIn job timed out');
        }
      }

      // Update name from LinkedIn data if available
      if (linkedinData && linkedinData.name) {
        const supabase = createServiceRoleClient();
        await supabase
          .from('applicants')
          .update({ name: linkedinData.name })
          .eq('id', applicant_id);
      }

      return linkedinData;
    },
    'LinkedIn'
  );
}