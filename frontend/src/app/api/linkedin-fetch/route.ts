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

  // Custom processing with special error handling for LinkedIn
  try {
    return await startProcessing(
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
          const maxAttempts = 36; // Reduced from 60 to 36 (3 minutes max)
          let lastStatus = 'unknown';

          while (attempts < maxAttempts) {
            const result = await checkLinkedInJob(jobId);
            
            // Log status changes for better monitoring
            if (result.status !== lastStatus) {
              console.log(`📊 LinkedIn job ${jobId} status changed: ${lastStatus} → ${result.status} (attempt ${attempts + 1}/${maxAttempts})`);
              lastStatus = result.status;
            }
            
            if (result.status === 'completed' && result.data) {
              linkedinData = processLinkedInData(result.data);
              console.log(`✅ LinkedIn job ${jobId} completed successfully with data`);
              break;
            } else if (result.status === 'failed') {
              console.log(`❌ LinkedIn job ${jobId} failed - profile may be private or inaccessible`);
              throw new Error('LinkedIn profile not accessible - snapshot empty or blocked');
            } else if (result.status === 'completed' && !result.data) {
              // This should not happen with our updated logic, but handle it gracefully
              console.log(`⚠️ LinkedIn job ${jobId} completed but returned no data - treating as failed`);
              throw new Error('LinkedIn profile returned no data');
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          }

          if (!linkedinData) {
            console.log(`⏰ LinkedIn job ${jobId} timed out after ${maxAttempts} attempts`);
            throw new Error(`LinkedIn job timed out after ${Math.floor(maxAttempts * 5 / 60)} minutes`);
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
  } catch (error) {
    // Check if this is a profile accessibility error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isProfileInaccessible = errorMessage.includes('snapshot empty') || 
                                 errorMessage.includes('not accessible') || 
                                 errorMessage.includes('blocked') ||
                                 errorMessage.includes('private');
    
    if (isProfileInaccessible) {
      // Handle privately/blocked profiles by marking as 'not_provided' instead of 'error'
      console.log(`🔒 LinkedIn profile not accessible for ${applicant_id} - marking as not_provided`);
      
      const supabase = createServiceRoleClient();
      await supabase
        .from('applicants')
        .update({ 
          li_status: 'not_provided',
          li_data: {
            error: 'Profile not accessible (private or blocked)',
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', applicant_id);
      
      return NextResponse.json({
        success: true,
        applicant_id: applicant_id,
        message: 'LinkedIn profile not accessible - marked as not provided'
      });
    }
    
    // Re-throw other errors to let startProcessing handle them normally
    throw error;
  }
}