import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get available candidates for import
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Get cached Ashby candidates from database
    const { data: ashbyCandidates, error: dbError } = await supabase
      .from('ashby_candidates')
      .select('*')
      .eq('user_id', user.id)
      .is('unmask_applicant_id', null) // Only show unlinked candidates
      .order('ashby_updated_at', { ascending: false })
      .limit(100);

    if (dbError) {
      console.error('Error fetching Ashby candidates:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch candidates', success: false },
        { status: 500 }
      );
    }

    // Transform candidates for frontend
    const candidates = (ashbyCandidates || []).map(candidate => ({
      id: candidate.ashby_id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      position: candidate.position,
      company: candidate.company,
      location: candidate.location_summary,
      linkedIn: candidate.linkedin_url,
      github: candidate.github_url,
      hasResume: candidate.has_resume,
      createdAt: candidate.ashby_created_at,
      updatedAt: candidate.ashby_updated_at,
      source: candidate.source_title,
      creditedTo: candidate.credited_to_name,
      tags: candidate.tags || []
    }));

    return NextResponse.json({
      success: true,
      candidates,
      count: candidates.length
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
    const { candidateIds } = body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: 'No candidates selected for import', success: false },
        { status: 400 }
      );
    }

    // Get the selected Ashby candidates
    const { data: candidates, error: fetchError } = await supabase
      .from('ashby_candidates')
      .select('*')
      .eq('user_id', user.id)
      .in('ashby_id', candidateIds)
      .is('unmask_applicant_id', null);

    if (fetchError) {
      console.error('Error fetching candidates:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch candidates', success: false },
        { status: 500 }
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No valid candidates found for import', success: false },
        { status: 400 }
      );
    }

    // The sync_ashby_candidate_to_applicant trigger will automatically create applicants
    // We just need to update the ashby_candidates to trigger the sync
    const importResults = [];

    for (const candidate of candidates) {
      try {
        // Touch the updated_at to trigger sync
        const { error: updateError } = await supabase
          .from('ashby_candidates')
          .update({ 
            updated_at: new Date().toISOString(),
            // Ensure required fields are set
            name: candidate.name || 'Unknown',
            email: candidate.email || null,
            phone: candidate.phone || null
          })
          .eq('id', candidate.id);

        if (updateError) {
          importResults.push({
            candidateId: candidate.ashby_id,
            success: false,
            error: updateError.message
          });
        } else {
          importResults.push({
            candidateId: candidate.ashby_id,
            success: true
          });
        }
      } catch (error) {
        importResults.push({
          candidateId: candidate.ashby_id,
          success: false,
          error: error instanceof Error ? error.message : 'Import failed'
        });
      }
    }

    const successCount = importResults.filter(r => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      imported: successCount,
      failed: importResults.length - successCount,
      results: importResults
    });

  } catch (error) {
    console.error('Error in Ashby import POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// PUT - Link existing applicant with Ashby candidate
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
    const { applicantId, ashbyCandidateId } = body;

    if (!applicantId || !ashbyCandidateId) {
      return NextResponse.json(
        { error: 'Both applicantId and ashbyCandidateId are required', success: false },
        { status: 400 }
      );
    }

    // Use the database function to link the records
    const { data, error: linkError } = await supabase
      .rpc('link_applicant_to_ashby_candidate', {
        p_applicant_id: applicantId,
        p_ashby_candidate_id: ashbyCandidateId,
        p_user_id: user.id
      });

    if (linkError) {
      console.error('Error linking applicant to Ashby candidate:', linkError);
      return NextResponse.json(
        { error: 'Failed to link records', success: false },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Invalid applicant or candidate ID', success: false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully linked applicant to Ashby candidate'
    });

  } catch (error) {
    console.error('Error in Ashby import PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}