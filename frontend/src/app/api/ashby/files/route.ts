// Ashby Files API - CV download webhook endpoint
// POST: Download and store CV in Supabase Storage (called by database triggers)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAshbyApiKey } from '@/lib/ashby/server';

export async function POST(request: NextRequest) {
  try {
    // Create server-side client with service role key
    const supabase = await createClient();
    
    // For webhook calls, we'll use the service role key to bypass RLS
    // This is safe because the trigger already validated the candidate belongs to the user
    
    const body = await request.json();
    const { candidateId, fileHandle } = body;

    if (!candidateId || !fileHandle) {
      return NextResponse.json(
        { error: 'candidateId and fileHandle are required', success: false },
        { status: 400 }
      );
    }

    // Get candidate from database (using service role - no RLS restrictions)
    const { data: candidate, error: candidateError } = await supabase
      .from('ashby_candidates')
      .select('*, user_id, unmask_applicant_id')
      .eq('ashby_id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('Candidate not found:', candidateError);
      return NextResponse.json(
        { error: 'Candidate not found', success: false },
        { status: 404 }
      );
    }

    if (!candidate.unmask_applicant_id) {
      return NextResponse.json(
        { error: 'Candidate not linked to applicant', success: false },
        { status: 400 }
      );
    }

    // Get user's API key from database
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', candidate.user_id)
      .single();

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ashby integration not configured for user', success: false },
        { status: 500 }
      );
    }

    // Import AshbyClient dynamically
    const AshbyClient = (await import('@/lib/ashby/client')).AshbyClient;
    
    const ashbyClient = new AshbyClient({
      apiKey: apiKey
    });

    // Get the download URL from Ashby
    const fileResponse = await ashbyClient.getResumeUrl(fileHandle);

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
    const filePath = `ashby-cvs/${candidate.user_id}/${fileName}`;

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

    // Create file record in files table
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        user_id: candidate.user_id,
        file_type: 'cv',
        original_filename: fileName,
        storage_path: filePath,
        storage_bucket: 'cv-files',
        file_size: fileBuffer.byteLength,
        mime_type: contentType
      })
      .select()
      .single();

    if (fileError) {
      console.error('Error creating file record:', fileError);
      return NextResponse.json(
        { error: 'Failed to create file record', success: false },
        { status: 500 }
      );
    }

    // Update applicant with cv_file_id and status
    const { error: updateError } = await supabase
      .from('applicants')
      .update({
        cv_file_id: fileRecord.id,
        cv_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', candidate.unmask_applicant_id);

    if (updateError) {
      console.error('Error updating applicant:', updateError);
      return NextResponse.json(
        { error: 'Failed to update applicant', success: false },
        { status: 500 }
      );
    }

    console.log(`✅ CV downloaded and processed for candidate ${candidateId}`);

    return NextResponse.json({
      success: true,
      message: 'Resume successfully processed',
      fileName,
      fileSize: fileBuffer.byteLength
    });

  } catch (error) {
    console.error('CV processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process CV', success: false },
      { status: 500 }
    );
  }
}