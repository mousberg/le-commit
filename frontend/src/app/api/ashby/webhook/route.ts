// Ashby Webhook Handler for Unmask Integration

import { NextRequest, NextResponse } from 'next/server';
import { AshbyWebhookEvent } from '@/lib/ashby/types';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-ashby-signature');
    const webhookSecret = process.env.ASHBY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('ASHBY_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const payload = await request.text();
    
    if (signature && !AshbyClient.verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: AshbyWebhookEvent = JSON.parse(payload);
    console.log(`Received Ashby webhook: ${event.type}`, event.id);

    // Process the webhook event
    await processAshbyWebhook(event);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing Ashby webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processAshbyWebhook(event: AshbyWebhookEvent) {
  const supabase = await createClient();
  
  switch (event.type) {
    case 'candidate.created':
      await handleCandidateCreated(event, supabase);
      break;
    
    case 'candidate.updated':
      await handleCandidateUpdated(event);
      break;
    
    case 'application.created':
      await handleApplicationCreated(event, supabase);
      break;
    
    case 'application.stage_changed':
      await handleApplicationStageChanged(event, supabase);
      break;
    
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}

async function handleCandidateCreated(event: AshbyWebhookEvent, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { candidateId } = event.data;
  
  if (!candidateId) {
    console.error('No candidateId in candidate.created event');
    return;
  }

  try {
    // Initialize Ashby client
    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY!
    });

    // Fetch full candidate details from Ashby
    const candidateResponse = await ashbyClient.getCandidate(candidateId);
    
    if (!candidateResponse.success || !candidateResponse.results) {
      console.error('Failed to fetch candidate from Ashby:', candidateResponse.error);
      return;
    }

    const candidate = candidateResponse.results;

    // Check if we should auto-process this candidate
    const shouldAutoProcess = await shouldAutoProcessCandidate(candidate);
    
    if (!shouldAutoProcess) {
      console.log(`Skipping auto-processing for candidate ${candidateId}`);
      return;
    }

    // Create applicant in Unmask system
    await createUnmaskApplicant(candidate, supabase);
    
  } catch (error) {
    console.error(`Error handling candidate.created for ${candidateId}:`, error);
  }
}

async function handleCandidateUpdated(event: AshbyWebhookEvent) {
  const { candidateId } = event.data;
  
  console.log(`Candidate ${candidateId} updated in Ashby`);
  
  // Check if this update requires re-verification
  // This could be triggered by updated resume, LinkedIn URL, etc.
  
  // Implementation depends on specific update triggers you want to handle
}

async function handleApplicationCreated(event: AshbyWebhookEvent, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { candidateId, applicationId } = event.data;
  
  if (!candidateId) {
    console.error('No candidateId in application.created event');
    return;
  }

  // This is a good trigger point for automated verification
  // New application = candidate is actively being considered
  console.log(`New application ${applicationId} for candidate ${candidateId}`);
  
  // You might want to prioritize verification for active applications
  await prioritizeVerification(candidateId, supabase);
}

async function handleApplicationStageChanged(event: AshbyWebhookEvent, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { candidateId, applicationId, currentStage, previousStage } = event.data;
  
  console.log(`Application ${applicationId} moved from ${previousStage} to ${currentStage}`);
  
  // Trigger verification at key stages (e.g., "Phone Screen", "Technical Interview")
  const verificationStages = ['phone_screen', 'technical_interview', 'final_interview'];
  
  if (currentStage && verificationStages.includes(currentStage.toLowerCase())) {
    if (candidateId) {
      await triggerUrgentVerification(candidateId, supabase);
    }
  }
}

interface CandidateData {
  socialLinks?: Array<{ type: string; url?: string }>;
  resumeFileHandle?: string | { id: string; name: string; handle: string };
  name?: string;
  primaryEmailAddress?: { value: string };
  emailAddresses?: Array<{ value: string }>;
  id: string;
}

async function shouldAutoProcessCandidate(candidate: CandidateData): Promise<boolean> {
  // Define rules for auto-processing
  // For example: only process if LinkedIn URL or resume is present
  
  const hasLinkedIn = !!candidate.socialLinks?.find(link => link.type === 'LinkedIn');
  const hasResume = !!candidate.resumeFileHandle;
  
  // You might also check for specific tags, job types, etc.
  return hasLinkedIn || hasResume;
}

async function createUnmaskApplicant(candidate: CandidateData, supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    // Map Ashby candidate to Unmask applicant format
    const applicantData = {
      name: candidate.name || 'Unknown',
      email: candidate.primaryEmailAddress?.value || candidate.emailAddresses?.[0]?.value || '',
      status: 'pending_ashby_sync',
      original_linkedin_url: candidate.socialLinks?.find(link => link.type === 'LinkedIn')?.url || null,
      ashby_candidate_id: candidate.id,
      user_id: 'system', // Use system user for Ashby-created applicants
      created_at: new Date().toISOString()
    };

    // Insert into Unmask database
    const result = await supabase
      .from('applicants')
      .insert(applicantData)
      .select()
      .single();

    if (result.error) {
      throw new Error(`Failed to create applicant: ${result.error.message}`);
    }

    const applicant = result.data;
    console.log(`Created Unmask applicant ${applicant.id} for Ashby candidate ${candidate.id}`);

    // Download and process resume if available
    if (candidate.resumeFileHandle) {
      const fileHandle = typeof candidate.resumeFileHandle === 'string' 
        ? candidate.resumeFileHandle 
        : candidate.resumeFileHandle.handle;
      await processAshbyResume(applicant.id, fileHandle);
    }

    // Start verification process
    await startVerificationProcess(applicant.id, candidate);

  } catch (error) {
    console.error('Error creating Unmask applicant:', error);
    throw error;
  }
}

async function processAshbyResume(applicantId: string, fileHandle: string) {
  try {
    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY!
    });

    // Get resume URL from Ashby
    const urlResponse = await ashbyClient.getResumeUrl(fileHandle);
    
    if (!urlResponse.success || !urlResponse.results?.url) {
      console.error('Failed to get resume URL from Ashby');
      return;
    }

    // Download resume
    const resumeResponse = await fetch(urlResponse.results.url);
    const resumeBuffer = await resumeResponse.arrayBuffer();

    // Convert to File-like object for processing
    // const resumeFile = new File([resumeBuffer], 'resume.pdf', { type: 'application/pdf' });

    // TODO: Integrate with existing CV processing pipeline
    // This would call your existing processCvPdf function
    console.log(`Downloaded resume for applicant ${applicantId}, size: ${resumeBuffer.byteLength} bytes`);

  } catch (error) {
    console.error(`Error processing resume for applicant ${applicantId}:`, error);
  }
}

async function startVerificationProcess(applicantId: string, candidate: CandidateData) {
  // This would trigger your existing verification pipeline
  // Similar to the processApplicantAsync function but adapted for Ashby integration
  
  console.log(`Starting verification for applicant ${applicantId} (Ashby candidate ${candidate.id})`);
  
  // You could add this to a job queue for async processing
  // or call your existing processing functions directly
}

async function prioritizeVerification(candidateId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  // Mark existing verification as high priority
  await supabase
    .from('applicants')
    .update({ 
      priority: 'high',
      updated_at: new Date().toISOString()
    })
    .eq('ashby_candidate_id', candidateId);
}

async function triggerUrgentVerification(candidateId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  // Mark for urgent processing (e.g., complete within 1 hour)
  await supabase
    .from('applicants')
    .update({ 
      priority: 'urgent',
      updated_at: new Date().toISOString()
    })
    .eq('ashby_candidate_id', candidateId);
}