// Store CV from Ashby to Supabase Storage
import { NextRequest, NextResponse } from 'next/server';
import { AshbyClient } from '@/lib/ashby/client';
import { createClient } from '@/lib/supabase/server';

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
    const { candidateId } = body;

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

    // Check if CV is already stored in files table
    const existingFileResult = await supabase
      .from('files')
      .select('*')
      .eq('applicant_id', candidate.unmask_applicant_id)
      .eq('file_type', 'cv')
      .eq('source', 'ashby')
      .single();

    if (existingFileResult.data) {
      // Generate signed URL for existing stored CV
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('candidate-cvs')
        .createSignedUrl(existingFileResult.data.storage_path, 3600); // 1 hour expiry

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        return NextResponse.json(
          { error: 'Failed to generate download URL', success: false },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        url: signedUrlData.signedUrl,
        cached: true,
        storage_path: existingFileResult.data.storage_path,
        file_id: existingFileResult.data.id
      });
    }

    // CV not stored yet - download from Ashby and store
    if (!candidate.resume_file_handle) {
      return NextResponse.json(
        { error: 'No resume file handle available', success: false },
        { status: 400 }
      );
    }

    const ashbyClient = new AshbyClient({
      apiKey: process.env.ASHBY_API_KEY
    });

    // Get download URL from Ashby (handle both string and object formats)
    const fileHandle = typeof candidate.resume_file_handle === 'string' 
      ? candidate.resume_file_handle 
      : candidate.resume_file_handle?.handle;
      
    const fileResponse = await ashbyClient.getResumeUrl(fileHandle);

    if (!fileResponse.success) {
      console.error('Failed to get resume URL from Ashby:', fileResponse.error);
      return NextResponse.json(
        { error: fileResponse.error?.message || 'Failed to get resume URL from Ashby', success: false },
        { status: 500 }
      );
    }

    const downloadUrl = fileResponse.results?.url;
    
    if (!downloadUrl) {
      console.error('No download URL in Ashby response:', fileResponse.results);
      return NextResponse.json(
        { error: 'No download URL returned from Ashby', success: false },
        { status: 500 }
      );
    }

    // Download the file from Ashby
    const fileDownloadResponse = await fetch(downloadUrl);
    
    if (!fileDownloadResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download file from Ashby', success: false },
        { status: 500 }
      );
    }

    const fileBuffer = await fileDownloadResponse.arrayBuffer();
    const fileName = `${user.id}/${candidateId}/${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf`;

    // Store in Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate-cvs')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to store CV file', success: false },
        { status: 500 }
      );
    }

    // Create file record
    const fileRecord = {
      applicant_id: candidate.unmask_applicant_id,
      file_name: fileName.split('/').pop() || 'resume.pdf',
      file_type: 'cv' as const,
      storage_path: uploadData.path,
      storage_bucket: 'candidate-cvs',
      file_size: fileBuffer.byteLength,
      mime_type: 'application/pdf',
      source: 'ashby' as const,
      source_metadata: {
        ashby_candidate_id: candidateId,
        resume_file_handle: candidate.resume_file_handle
      }
    };

    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert(fileRecord)
      .select()
      .single();

    if (fileError) {
      console.error('Error creating file record:', fileError);
      // File is uploaded but database record not created - log for manual cleanup
    }

    // Generate signed URL for the stored file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('candidate-cvs')
      .createSignedUrl(uploadData.path, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'CV stored but failed to generate download URL', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: signedUrlData.signedUrl,
      cached: false,
      storage_path: uploadData.path,
      file_id: fileData?.id
    });

  } catch (error) {
    console.error('Error storing CV:', error);
    return NextResponse.json(
      { error: 'Failed to store CV', success: false },
      { status: 500 }
    );
  }
}