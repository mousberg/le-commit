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

    // Check if CV is already stored
    if (candidate.cv_storage_path) {
      // Generate signed URL for existing stored CV
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('candidate-cvs')
        .createSignedUrl(candidate.cv_storage_path, 3600); // 1 hour expiry

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
        storage_path: candidate.cv_storage_path
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

    // Get download URL from Ashby
    const fileResponse = await ashbyClient.getResumeUrl(candidate.resume_file_handle);

    if (!fileResponse.success) {
      return NextResponse.json(
        { error: fileResponse.error?.message || 'Failed to get resume URL from Ashby', success: false },
        { status: 500 }
      );
    }

    const downloadUrl = fileResponse.results?.results?.url || fileResponse.results?.url;
    
    if (!downloadUrl) {
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

    // Update candidate record with storage path
    const updateResult = await supabase
      .from('ashby_candidates')
      .update({ cv_storage_path: uploadData.path })
      .eq('ashby_id', candidateId)
      .eq('user_id', user.id);

    if (updateResult.error) {
      console.error('Error updating candidate with storage path:', updateResult.error);
      // File is uploaded but database not updated - log for manual cleanup if needed
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
      storage_path: uploadData.path
    });

  } catch (error) {
    console.error('Error storing CV:', error);
    return NextResponse.json(
      { error: 'Failed to store CV', success: false },
      { status: 500 }
    );
  }
}