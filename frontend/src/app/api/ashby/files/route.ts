// Ashby Files API - Unified endpoint for file operations
// GET: Get resume URL from Ashby
// POST: Download and store CV in Supabase Storage

import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';

// GET - Get resume URL from Ashby
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

    if (!process.env.ASHBY_API_KEY) {
      return NextResponse.json(
        { error: 'Ashby integration not configured', success: false },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileHandle = searchParams.get('fileHandle');

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

    return NextResponse.json({
      success: true,
      url: fileResponse.results?.url,
      fileHandle
    });

  } catch (error) {
    console.error('Error getting resume URL:', error);
    return NextResponse.json(
      { error: 'Failed to get resume URL', success: false },
      { status: 500 }
    );
  }
}

// POST - Download and store CV in Supabase Storage
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
    const { candidateId, fileHandle } = body;

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required', success: false },
        { status: 400 }
      );
    }

    // Get candidate from database
    const candidateResult = await supabase
      .from('ashby_candidates')
      .select('*')
      .eq('ashby_id', candidateId)
      .eq('user_id', user.id)
      .single();

    if (candidateResult.error) {
      return NextResponse.json(
        { error: 'Candidate not found', success: false },
        { status: 404 }
      );
    }

    const candidate = candidateResult.data;
    const resumeFileHandle = fileHandle || candidate.resume_file_handle?.handle || candidate.resume_file_handle;

    if (!resumeFileHandle) {
      return NextResponse.json(
        { error: 'No resume file available for this candidate', success: false },
        { status: 400 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY
    });

    // Get the download URL from Ashby
    const fileResponse = await ashbyClient.getResumeUrl(resumeFileHandle);

    if (!fileResponse.success || !fileResponse.results?.url) {
      return NextResponse.json(
        { 
          error: fileResponse.error?.message || 'Failed to get resume URL', 
          success: false
        },
        { status: 500 }
      );
    }

    // Download the file
    const downloadResponse = await fetch(fileResponse.results.url);
    
    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download resume from Ashby', success: false },
        { status: 500 }
      );
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const contentType = downloadResponse.headers.get('content-type') || 'application/pdf';
    
    // Determine file extension
    let extension = '.pdf';
    if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      extension = '.docx';
    } else if (contentType.includes('application/msword')) {
      extension = '.doc';
    }

    // Create file path
    const fileName = `${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume_${candidateId}${extension}`;
    const filePath = `ashby-cvs/${user.id}/${fileName}`;

    // Upload to Supabase Storage
    const uploadResult = await supabase.storage
      .from('cv-files')
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadResult.error) {
      console.error('Upload error:', uploadResult.error);
      return NextResponse.json(
        { error: 'Failed to store resume in storage', success: false },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('cv-files')
      .getPublicUrl(filePath);

    // Update candidate record with storage path
    await supabase
      .from('ashby_candidates')
      .update({
        cv_storage_path: filePath,
        resume_url: publicUrlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('ashby_id', candidateId)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Resume successfully stored',
      storagePath: filePath,
      publicUrl: publicUrlData.publicUrl,
      fileName,
      fileSize: fileBuffer.byteLength,
      contentType
    });

  } catch (error) {
    console.error('Error storing CV:', error);
    return NextResponse.json(
      { error: 'Failed to store CV', success: false },
      { status: 500 }
    );
  }
}