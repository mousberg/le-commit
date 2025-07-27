/* eslint-disable @typescript-eslint/no-explicit-any */
// Ashby Test API - Fetch first few candidates for testing

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in test mode
    const isTestMode = process.env.NODE_ENV === 'development' || request.nextUrl.searchParams.get('test') === 'true';
    
    if (!isTestMode) {
      return NextResponse.json(
        { error: 'Test endpoint only available in development mode', success: false },
        { status: 403 }
      );
    }

    // Validate API key is configured
    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'ASHBY_API_KEY not configured', success: false },
        { status: 500 }
      );
    }

    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20); // Max 20 for safety
    const includeResume = url.searchParams.get('include_resume') === 'true';
    const createApplicants = url.searchParams.get('create_applicants') === 'true';

    console.log(`🧪 Test mode: Fetching ${limit} candidates from Ashby`);

    // Initialize Ashby client
    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY
    });

    // Fetch candidates from Ashby
    const candidatesResponse = await ashbyClient.listCandidates({
      limit,
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

    const candidates = candidatesResponse.results?.results || [];
    console.log(`📊 Retrieved ${candidates.length} candidates from Ashby`);

    // Process each candidate
    const processedCandidates = [];

    for (const candidate of candidates) {
      try {
        const processedCandidate: {
          ashby_id: string;
          name: string;
          email: string;
          linkedin_url: string | null;
          has_resume: boolean;
          created_at: string;
          tags: string[];
          resume_url?: string;
          resume_file_handle?: string;
          resume_error?: string;
          unmask_applicant_id?: string;
          created_in_unmask?: boolean;
          already_exists?: boolean;
          db_error?: string;
        } = {
          ashby_id: candidate.id,
          name: candidate.name,
          email: candidate.primaryEmailAddress?.value || candidate.emailAddresses?.[0]?.value || '',
          linkedin_url: candidate.socialLinks?.find((link: any) => link.type === 'LinkedIn')?.url || null,
          has_resume: !!candidate.resumeFileHandle,
          created_at: candidate.createdAt,
          tags: candidate.tags || []
        };

        // Optionally fetch resume details
        if (includeResume && candidate.resumeFileHandle) {
          try {
            const fileHandle = typeof candidate.resumeFileHandle === 'string' ? candidate.resumeFileHandle : (candidate.resumeFileHandle as any)?.handle;
            const resumeResponse = await ashbyClient.getResumeUrl(fileHandle);
            if (resumeResponse.success) {
              processedCandidate.resume_url = resumeResponse.results?.url;
              processedCandidate.resume_file_handle = fileHandle;
            }
          } catch (resumeError) {
            console.warn(`Failed to get resume URL for candidate ${candidate.id}:`, resumeError);
            processedCandidate.resume_error = 'Failed to fetch resume URL';
          }
        }

        // Optionally create applicants in Unmask database
        if (createApplicants) {
          try {
            // Check if applicant already exists
            const existingApplicant = await supabase
              .from('applicants')
              .select('id')
              .eq('ashby_candidate_id', candidate.id)
              .single();

            if (existingApplicant.error && existingApplicant.error.code !== 'PGRST116') {
              throw existingApplicant.error;
            }

            if (!existingApplicant.data) {
              // Create new applicant
              const applicantData = {
                user_id: user.id,
                name: candidate.name || 'Unknown',
                email: candidate.primaryEmailAddress?.value || candidate.emailAddresses?.[0]?.value || '',
                status: 'pending_ashby_test',
                original_linkedin_url: candidate.socialLinks?.find((link: any) => link.type === 'LinkedIn')?.url || null,
                ashby_candidate_id: candidate.id,
                ashby_sync_status: 'pending',
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
              processedCandidate.created_in_unmask = true;
            } else {
              processedCandidate.unmask_applicant_id = existingApplicant.data.id;
              processedCandidate.created_in_unmask = false;
              processedCandidate.already_exists = true;
            }
          } catch (dbError) {
            console.error(`Failed to create applicant for candidate ${candidate.id}:`, dbError);
            processedCandidate.db_error = dbError instanceof Error ? dbError.message : 'Database error';
          }
        }

        processedCandidates.push(processedCandidate);

      } catch (processingError) {
        console.error(`Error processing candidate ${candidate.id}:`, processingError);
        processedCandidates.push({
          ashby_id: candidate.id,
          name: candidate.name,
          processing_error: processingError instanceof Error ? processingError.message : 'Processing error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      test_mode: true,
      total_fetched: candidates.length,
      candidates: processedCandidates,
      options: {
        limit,
        include_resume: includeResume,
        create_applicants: createApplicants
      },
      next_cursor: candidatesResponse.results?.nextCursor,
      more_available: candidatesResponse.results?.moreDataAvailable || false
    });

  } catch (error) {
    console.error('Error in Ashby test endpoint:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test failed', 
        success: false 
      },
      { status: 500 }
    );
  }
}

// POST endpoint for testing specific actions
export async function POST(request: NextRequest) {
  try {
    const isTestMode = process.env.NODE_ENV === 'development';
    
    if (!isTestMode) {
      return NextResponse.json(
        { error: 'Test endpoint only available in development mode', success: false },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, candidateId, data } = body;

    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'ASHBY_API_KEY not configured', success: false },
        { status: 500 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY
    });

    let result;

    switch (action) {
      case 'get_candidate':
        if (!candidateId) {
          return NextResponse.json(
            { error: 'candidateId required for get_candidate action', success: false },
            { status: 400 }
          );
        }
        result = await ashbyClient.getCandidate(candidateId);
        break;

      case 'update_candidate':
        if (!candidateId) {
          return NextResponse.json(
            { error: 'candidateId required for update_candidate action', success: false },
            { status: 400 }
          );
        }
        result = await ashbyClient.updateCandidate({
          candidateId,
          customFields: data?.customFields || { test_field: 'test_value' },
          tags: data?.tags || { add: ['unmask-test'] }
        });
        break;

      case 'test_connection':
        // Test basic API connection
        result = await ashbyClient.listCandidates({ limit: 1 });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: get_candidate, update_candidate, test_connection', success: false },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      action,
      result: result.results,
      error: result.error
    });

  } catch (error) {
    console.error('Error in Ashby test POST:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test action failed', 
        success: false 
      },
      { status: 500 }
    );
  }
}