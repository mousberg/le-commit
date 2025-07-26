// Ashby Pull API - Read-only candidate pulling for testing

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Validate API key is configured
    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'ASHBY_API_KEY not configured', success: false },
        { status: 500 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50); // Max 50 for safety
    const cursor = url.searchParams.get('cursor');
    const autoCreate = url.searchParams.get('auto_create') === 'true';
    const onlyWithData = url.searchParams.get('only_with_data') === 'true'; // Only candidates with LinkedIn or resume

    console.log(`📥 Pulling ${limit} candidates from Ashby (read-only mode)`);

    // Initialize Ashby client
    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY
    });

    // Fetch candidates from Ashby
    const candidatesResponse = await ashbyClient.listCandidates({
      limit,
      cursor: cursor || undefined,
      includeArchived: false
    });

    if (!candidatesResponse.success) {
      return NextResponse.json(
        { 
          error: `Failed to fetch candidates from Ashby: ${candidatesResponse.error?.message}`, 
          success: false 
        },
        { status: 500 }
      );
    }

    const allCandidates = candidatesResponse.results?.results || [];
    
    // Filter candidates if requested
    let candidates = allCandidates;
    if (onlyWithData) {
      candidates = allCandidates.filter(c => c.linkedInUrl || c.resumeFileHandle);
      console.log(`🔍 Filtered to ${candidates.length} candidates with LinkedIn or resume data`);
    }

    console.log(`📊 Processing ${candidates.length} candidates`);

    // Process each candidate
    const processedCandidates = [];
    let created = 0;
    let existing = 0;
    let errors = 0;

    for (const candidate of candidates) {
      try {
        const processedCandidate: any = {
          ashby_id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          linkedin_url: candidate.linkedInUrl || null,
          has_resume: !!candidate.resumeFileHandle,
          resume_file_handle: candidate.resumeFileHandle || null,
          created_at: candidate.createdAt,
          tags: candidate.tags || [],
          custom_fields: candidate.customFields || {}
        };

        // Get resume URL if available (read-only operation)
        if (candidate.resumeFileHandle) {
          try {
            const resumeResponse = await ashbyClient.getResumeUrl(candidate.resumeFileHandle);
            if (resumeResponse.success) {
              processedCandidate.resume_url = resumeResponse.results?.url;
            }
          } catch (resumeError) {
            console.warn(`Failed to get resume URL for candidate ${candidate.id}:`, resumeError);
            processedCandidate.resume_fetch_error = 'Failed to fetch resume URL';
          }
        }

        // Check if applicant already exists in Unmask
        const existingApplicant = await supabase
          .from('applicants')
          .select('id, status, ashby_sync_status')
          .eq('ashby_candidate_id', candidate.id)
          .single();

        if (existingApplicant.data) {
          processedCandidate.unmask_applicant_id = existingApplicant.data.id;
          processedCandidate.unmask_status = existingApplicant.data.status;
          processedCandidate.sync_status = existingApplicant.data.ashby_sync_status;
          processedCandidate.action = 'existing';
          existing++;
        } else if (autoCreate) {
          // Create new applicant in Unmask
          const applicantData = {
            user_id: user.id,
            name: candidate.name || 'Unknown',
            email: candidate.email || '',
            status: 'pending_from_ashby',
            original_linkedin_url: candidate.linkedInUrl || null,
            ashby_candidate_id: candidate.id,
            ashby_sync_status: 'pending',
            priority: 'normal',
            created_at: new Date().toISOString()
          };

          const createResult = await supabase
            .from('applicants')
            .insert(applicantData)
            .select()
            .single();

          if (createResult.error) {
            throw createResult.error;
          }

          processedCandidate.unmask_applicant_id = createResult.data.id;
          processedCandidate.action = 'created';
          created++;

          // If we have resume data, we could trigger processing here
          if (candidate.resumeFileHandle || candidate.linkedInUrl) {
            processedCandidate.ready_for_processing = true;
          }
        } else {
          processedCandidate.action = 'not_created';
        }

        processedCandidates.push(processedCandidate);

      } catch (processingError) {
        console.error(`Error processing candidate ${candidate.id}:`, processingError);
        errors++;
        processedCandidates.push({
          ashby_id: candidate.id,
          name: candidate.name,
          action: 'error',
          error: processingError instanceof Error ? processingError.message : 'Processing error'
        });
      }
    }

    // Summary stats
    const summary = {
      total_fetched: allCandidates.length,
      filtered_count: candidates.length,
      created_in_unmask: created,
      already_existing: existing,
      processing_errors: errors,
      with_linkedin: candidates.filter(c => c.linkedInUrl).length,
      with_resume: candidates.filter(c => c.resumeFileHandle).length,
      ready_for_verification: processedCandidates.filter(pc => pc.ready_for_processing).length
    };

    return NextResponse.json({
      success: true,
      read_only_mode: true,
      summary,
      candidates: processedCandidates,
      pagination: {
        next_cursor: candidatesResponse.results?.nextCursor,
        more_available: candidatesResponse.results?.moreDataAvailable || false
      },
      options: {
        limit,
        cursor,
        auto_create: autoCreate,
        only_with_data: onlyWithData
      }
    });

  } catch (error) {
    console.error('Error in Ashby pull endpoint:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Pull failed', 
        success: false 
      },
      { status: 500 }
    );
  }
}

// POST endpoint for triggering verification of pulled candidates
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { applicant_ids, priority = 'normal' } = body;

    if (!applicant_ids || !Array.isArray(applicant_ids)) {
      return NextResponse.json(
        { error: 'applicant_ids array required', success: false },
        { status: 400 }
      );
    }

    // Update priority for selected applicants
    const updateResult = await supabase
      .from('applicants')
      .update({ 
        priority,
        updated_at: new Date().toISOString()
      })
      .in('id', applicant_ids)
      .eq('user_id', user.id) // Security: only update user's own applicants
      .select();

    if (updateResult.error) {
      throw updateResult.error;
    }

    // TODO: Trigger actual verification processing here
    // For now, just update the status
    await supabase
      .from('applicants')
      .update({ status: 'queued_for_processing' })
      .in('id', applicant_ids);

    return NextResponse.json({
      success: true,
      message: `Queued ${applicant_ids.length} applicants for verification`,
      updated_count: updateResult.data?.length || 0,
      priority
    });

  } catch (error) {
    console.error('Error queuing verification:', error);
    return NextResponse.json(
      { error: 'Failed to queue verification', success: false },
      { status: 500 }
    );
  }
}