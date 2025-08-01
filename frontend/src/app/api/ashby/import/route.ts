// Ashby Import API - Import candidates from ashby_candidates to applicants table

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  importAshbyCandidateToApplicants,
  bulkImportAshbyCandidates,
  getUnimportedAshbyCandidates,
  getLinkedAshbyCandidates,
  type MappingResult,
  type BulkMappingResult
} from '@/lib/services/ashby-applicant-mapper';

// GET - Get available candidates for import
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'unimported';

    let candidates;
    try {
      if (type === 'linked') {
        candidates = await getLinkedAshbyCandidates(user.id);
      } else {
        candidates = await getUnimportedAshbyCandidates(user.id);
      }
    } catch (error) {
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to fetch candidates',
          success: false 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      candidates,
      count: candidates.length,
      type
    });

  } catch (error) {
    console.error('Error in Ashby import GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// POST - Import candidates to applicants table
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
    const { 
      ashbyIds, 
      ashbyId, 
      options = {} 
    }: {
      ashbyIds?: string[];
      ashbyId?: string;
      options?: {
        updateExisting?: boolean;
        skipIfExists?: boolean;
      };
    } = body;

    // Validate input
    if (!ashbyIds && !ashbyId) {
      return NextResponse.json(
        { error: 'Either ashbyIds array or single ashbyId required', success: false },
        { status: 400 }
      );
    }

    try {
      let result: MappingResult | BulkMappingResult;

      if (ashbyId) {
        // Single import
        const { data: ashbyCandidate, error: fetchError } = await supabase
          .from('ashby_candidates')
          .select('*')
          .eq('ashby_id', ashbyId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !ashbyCandidate) {
          return NextResponse.json(
            { error: 'Ashby candidate not found', success: false },
            { status: 404 }
          );
        }

        result = await importAshbyCandidateToApplicants(ashbyCandidate, user.id, options);
      } else {
        // Bulk import
        result = await bulkImportAshbyCandidates(ashbyIds!, user.id, options);
      }

      if (!result.success) {
        return NextResponse.json(
          { 
            error: 'error' in result ? result.error : 'Import failed',
            success: false,
            result
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        result,
        message: ashbyId 
          ? 'Candidate imported successfully' 
          : `Bulk import completed: ${(result as BulkMappingResult).summary.created} created, ${(result as BulkMappingResult).summary.updated} updated, ${(result as BulkMappingResult).summary.skipped} skipped, ${(result as BulkMappingResult).summary.errors} errors`
      });

    } catch (error) {
      console.error('Import error:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Import failed',
          success: false 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in Ashby import POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// PUT - Sync applicant data back to Ashby candidate
export async function PUT(request: NextRequest) {
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
    const { applicantId }: { applicantId: string } = body;

    if (!applicantId) {
      return NextResponse.json(
        { error: 'Applicant ID required', success: false },
        { status: 400 }
      );
    }

    try {
      const { syncApplicantToAshbyCandidate } = await import('@/lib/services/ashby-applicant-mapper');
      const result = await syncApplicantToAshbyCandidate(applicantId, user.id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, success: false },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Applicant data synced to Ashby candidate successfully'
      });

    } catch (error) {
      console.error('Sync error:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Sync failed',
          success: false 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in Ashby import PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}