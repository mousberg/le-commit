/* eslint-disable @typescript-eslint/no-explicit-any */
// Ashby Resume Download API
import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';

// GET - Download resume by file handle
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

    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fileHandle } = body;

    if (!fileHandle) {
      return NextResponse.json(
        { error: 'File handle is required', success: false },
        { status: 400 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY
    });

    // Get the download URL from Ashby
    const fileResponse = await ashbyClient.getResumeUrl(fileHandle);

    if (!fileResponse.success) {
      return NextResponse.json(
        { 
          error: fileResponse.error?.message || 'Failed to get resume URL', 
          success: false
        },
        { status: 500 }
      );
    }

    // Handle nested response structure from Ashby
    const downloadUrl = (fileResponse.results as any)?.results?.url || fileResponse.results?.url;
    
    if (!downloadUrl) {
      return NextResponse.json(
        { 
          error: 'No download URL returned from Ashby', 
          success: false
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: downloadUrl
    });

  } catch (error) {
    console.error('Error getting resume URL:', error);
    return NextResponse.json(
      { error: 'Failed to get resume URL', success: false },
      { status: 500 }
    );
  }
}