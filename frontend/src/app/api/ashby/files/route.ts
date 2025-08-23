// Ashby Files API - CV download webhook endpoint
// POST: Download and store CV in Supabase Storage (called by database triggers)

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAshbyApiKey } from '@/lib/ashby/server';

export async function POST(request: NextRequest) {
  try {
    // Create server-side client with service role key
    const supabase = createServiceRoleClient();
    
    // For webhook calls, we'll use the service role key to bypass RLS
    // This is safe because the trigger already validated the candidate belongs to the user
    
    const body = await request.json();
    const { candidateId, fileHandle, applicantId, userId, mode } = body;


    if (!candidateId || !fileHandle) {
      return NextResponse.json(
        { error: 'candidateId and fileHandle are required', success: false },
        { status: 400 }
      );
    }

    // Extract the actual file handle ID from the JSON object
    let actualFileHandle: string;
    if (typeof fileHandle === 'string') {
      actualFileHandle = fileHandle;
    } else if (typeof fileHandle === 'object' && fileHandle !== null) {
      // Handle JSONB object from database - extract the file handle token
      const fileHandleObj = fileHandle as { id?: string; fileHandle?: string; handle?: string };
      actualFileHandle = fileHandleObj.handle || fileHandleObj.id || fileHandleObj.fileHandle || '';
      if (!actualFileHandle) {
        console.error('❌ Could not extract file handle from object:', fileHandle);
        return NextResponse.json(
          { error: 'Invalid file handle format', success: false },
          { status: 400 }
        );
      }
    } else {
      console.error('❌ Invalid file handle type:', typeof fileHandle, fileHandle);
      return NextResponse.json(
        { error: 'Invalid file handle format', success: false },
        { status: 400 }
      );
    }


    // Get candidate from database (using service role - no RLS restrictions)
    let candidate = null;
    let candidateError = null;
    let retries = 3;
    
    while (retries > 0 && !candidate) {
      const { data, error } = await supabase
        .from('ashby_candidates')
        .select('*, user_id, unmask_applicant_id')
        .eq('ashby_id', candidateId)
        .maybeSingle(); // Use maybeSingle to avoid error on no rows

      candidate = data;
      candidateError = error;
      
      if (!candidate && retries > 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
      }
      retries--;
    }

    if (candidateError || !candidate) {
      console.error('Candidate not found after retries:', candidateError);
      return NextResponse.json(
        { error: 'Candidate not found', success: false },
        { status: 404 }
      );
    }

    const targetUserId = userId || candidate.user_id;
    
    // For shared_file mode, we need an applicant ID
    if (mode !== 'file_only') {
      const targetApplicantId = applicantId || candidate.unmask_applicant_id;
      
      if (!targetApplicantId) {
        return NextResponse.json(
          { error: 'Candidate not linked to applicant', success: false },
          { status: 400 }
        );
      }
    }

    // Get user's API key from database
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', targetUserId)
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
    const fileResponse = await ashbyClient.getResumeUrl(actualFileHandle);

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

    // Create file path using the same pattern as form uploads
    const fileName = `${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume_${candidateId}${extension}`;
    const filePath = `${candidate.user_id}/${Date.now()}_${fileName}`;

    // Upload to Supabase Storage
    const uploadResult = await supabase.storage
      .from('candidate-cvs')
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
        user_id: targetUserId,
        file_type: 'cv',
        original_filename: fileName,
        storage_path: filePath,
        storage_bucket: 'candidate-cvs',
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

    if (mode === 'shared_file') {
      // Shared file mode: Update both ashby_candidate and applicant with same file reference
      const targetApplicantId = applicantId || candidate.unmask_applicant_id;
      
      // Update ashby_candidates with the file reference
      const { error: ashbyUpdateError } = await supabase
        .from('ashby_candidates')
        .update({
          cv_file_id: fileRecord.id,
          updated_at: new Date().toISOString()
        })
        .eq('ashby_id', candidateId);

      if (ashbyUpdateError) {
        console.error('Error updating ashby candidate:', ashbyUpdateError);
      }

      // Update applicant with the same file reference
      if (targetApplicantId) {
        const { error: updateError } = await supabase
          .from('applicants')
          .update({
            cv_file_id: fileRecord.id,
            cv_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetApplicantId);

        if (updateError) {
          console.error('Error updating applicant:', updateError);
          return NextResponse.json(
            { error: 'Failed to update applicant', success: false },
            { status: 500 }
          );
        }
      }

    } else {
      // Legacy mode: Update existing applicant only
      const targetApplicantId = applicantId || candidate.unmask_applicant_id;
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          cv_file_id: fileRecord.id,
          cv_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetApplicantId);

      if (updateError) {
        console.error('Error updating applicant:', updateError);
        return NextResponse.json(
          { error: 'Failed to update applicant', success: false },
          { status: 500 }
        );
      }

      console.log(`📝 CV file stored for ATS candidate ${targetApplicantId}`);

    }


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