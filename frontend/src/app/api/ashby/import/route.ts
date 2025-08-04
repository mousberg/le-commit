// Ashby Import API - DISABLED FOR NEW ARCHITECTURE
// TODO: Re-implement Ashby integration with new event-driven architecture

/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    return NextResponse.json({
      success: false,
      error: 'Ashby integration disabled - TODO: Re-implement with new architecture',
      candidates: [],
      count: 0
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

    return NextResponse.json({
      success: false,
      error: 'Ashby integration disabled - TODO: Re-implement with new architecture'
    });

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

    return NextResponse.json({
      success: false,
      error: 'Ashby integration disabled - TODO: Re-implement with new architecture'
    });

  } catch (error) {
    console.error('Error in Ashby import PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}