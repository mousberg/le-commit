// Ashby Files API - CV download webhook endpoint
// POST: Download and store CV in Supabase Storage (called by database triggers)

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAshbyApiKey } from '@/lib/ashby/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let logContext = {
    candidateId: 'unknown',
    userId: 'unknown',
    fileHandle: 'unknown',
    step: 'initialization'
  };
  
  try {
    // Create server-side client with service role key
    const supabase = createServiceRoleClient();
    
    const body = await request.json();
    const { candidateId, fileHandle, applicantId, userId, mode } = body;
    
    // Update log context
    logContext = {
      candidateId: candidateId || 'missing',
      userId: userId || 'missing', 
      fileHandle: typeof fileHandle === 'string' ? fileHandle.substring(0, 20) + '...' : typeof fileHandle,
      step: 'request_validation'
    };
    
    console.log(`📥 [AshbyFiles] Processing CV for candidate ${candidateId}`);


    if (!candidateId || !fileHandle) {
      console.error('❌ [AshbyFiles] Missing required fields:', { candidateId: !!candidateId, fileHandle: !!fileHandle });
      return NextResponse.json(
        { error: 'candidateId and fileHandle are required', success: false },
        { status: 400 }
      );
    }

    // Extract the actual file handle ID from the JSON object
    logContext.step = 'file_handle_extraction';
    let actualFileHandle: string;
    
    console.log('🔍 [AshbyFiles] Extracting file handle:', { 
      type: typeof fileHandle, 
      isNull: fileHandle === null,
      keys: typeof fileHandle === 'object' ? Object.keys(fileHandle || {}) : 'N/A'
    });
    
    if (typeof fileHandle === 'string') {
      actualFileHandle = fileHandle;

    } else if (typeof fileHandle === 'object' && fileHandle !== null) {
      // Handle JSONB object from database - extract the file handle token
      const fileHandleObj = fileHandle as { id?: string; fileHandle?: string; handle?: string };
      actualFileHandle = fileHandleObj.handle || fileHandleObj.id || fileHandleObj.fileHandle || '';
      

      
      if (!actualFileHandle) {
        console.error('❌ [AshbyFiles] Could not extract file handle from object:', fileHandle);
        return NextResponse.json(
          { error: 'Invalid file handle format', success: false },
          { status: 400 }
        );
      }
    } else {
      console.error('❌ [AshbyFiles] Invalid file handle type:', typeof fileHandle, fileHandle);
      return NextResponse.json(
        { error: 'Invalid file handle format', success: false },
        { status: 400 }
      );
    }


    // Get candidate from database (using service role - no RLS restrictions)
    logContext.step = 'candidate_lookup';
    let candidate = null;
    let candidateError = null;
    let retries = 3;
    
    console.log('🔍 [AshbyFiles] Looking up candidate:', { candidateId, retriesLeft: retries });
    
    while (retries > 0 && !candidate) {
      const { data, error } = await supabase
        .from('ashby_candidates')
        .select('*, user_id, unmask_applicant_id')
        .eq('ashby_id', candidateId)
        .maybeSingle(); // Use maybeSingle to avoid error on no rows

      candidate = data;
      candidateError = error;
      
      console.log(`🔄 [AshbyFiles] Candidate lookup attempt ${4 - retries}:`, {
        found: !!candidate,
        error: error?.message || 'none',
        candidateId: candidate?.ashby_id,
        hasApplicantId: !!candidate?.unmask_applicant_id,
        userId: candidate?.user_id
      });
      
      if (!candidate && retries > 1) {
        console.log('⏳ [AshbyFiles] Retrying candidate lookup in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
      }
      retries--;
    }

    if (candidateError || !candidate) {
      console.error('❌ [AshbyFiles] Candidate not found after retries:', {
        candidateId,
        error: candidateError?.message,
        retriesAttempted: 3
      });
      return NextResponse.json(
        { error: 'Candidate not found', success: false },
        { status: 404 }
      );
    }
    


    const targetUserId = userId || candidate.user_id;
    logContext.step = 'applicant_validation';
    
    // For shared_file mode, we need an applicant ID
    if (mode !== 'file_only') {
      const targetApplicantId = applicantId || candidate.unmask_applicant_id;
      

      
      if (!targetApplicantId) {
        console.error('❌ [AshbyFiles] Candidate not linked to applicant:', {
          candidateId: candidate.ashby_id,
          candidateName: candidate.name,
          mode,
          providedApplicantId: applicantId,
          candidateApplicantId: candidate.unmask_applicant_id
        });
        return NextResponse.json(
          { error: 'Candidate not linked to applicant', success: false },
          { status: 400 }
        );
      }
    }

    // Get user's API key from database
    logContext.step = 'api_key_lookup';

    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', targetUserId)
      .single();

    if (userError) {
      console.error('❌ [AshbyFiles] Error fetching user data:', {
        userId: targetUserId,
        error: userError.message
      });
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    if (!apiKey) {
      console.error('❌ [AshbyFiles] Ashby API key not configured:', {
        userId: targetUserId,
        hasApiKey: !!userData?.ashby_api_key
      });
      return NextResponse.json(
        { error: 'Ashby integration not configured for user', success: false },
        { status: 500 }
      );
    }
    


    // Import AshbyClient dynamically
    logContext.step = 'ashby_client_init';

    
    const AshbyClient = (await import('@/lib/ashby/client')).AshbyClient;
    
    const ashbyClient = new AshbyClient({
      apiKey: apiKey
    });

    // Get the download URL from Ashby
    logContext.step = 'ashby_url_fetch';
    console.log('🔗 [AshbyFiles] Fetching resume URL from Ashby:', {
      fileHandle: actualFileHandle.substring(0, 20) + '...'
    });
    
    const fileResponse = await ashbyClient.getResumeUrl(actualFileHandle);

    console.log('📡 [AshbyFiles] Ashby API response:', {
      success: fileResponse.success,
      hasUrl: !!(fileResponse.results?.results?.url || fileResponse.results?.url),
      errorCode: fileResponse.error?.code,
      errorMessage: fileResponse.error?.message,
      resultStructure: fileResponse.results ? Object.keys(fileResponse.results) : 'no results'
    });

    // Fix: Check for URL in both possible locations
    const downloadUrl = fileResponse.results?.results?.url || fileResponse.results?.url;
    
    if (!fileResponse.success || !downloadUrl) {
      console.error('❌ [AshbyFiles] Failed to get resume URL from Ashby:', {
        fileHandle: actualFileHandle.substring(0, 20) + '...',
        error: fileResponse.error,
        results: fileResponse.results
      });
      return NextResponse.json(
        { 
          error: fileResponse.error?.message || 'Failed to get resume URL', 
          success: false
        },
        { status: 500 }
      );
    }
    
    console.log('✅ [AshbyFiles] Resume URL obtained from Ashby');

    // Download the file
    logContext.step = 'file_download';

    
    const downloadResponse = await fetch(downloadUrl);
    

    
    if (!downloadResponse.ok) {
      console.error('❌ [AshbyFiles] Failed to download resume from Ashby:', {
        status: downloadResponse.status,
        statusText: downloadResponse.statusText,
        url: downloadUrl.substring(0, 50) + '...'
      });
      return NextResponse.json(
        { error: 'Failed to download resume from Ashby', success: false },
        { status: 500 }
      );
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const contentType = downloadResponse.headers.get('content-type') || 'application/pdf';
    
    console.log('✅ [AshbyFiles] File downloaded successfully:', {
      size: fileBuffer.byteLength,
      contentType
    });
    
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
    logContext.step = 'storage_upload';

    
    const uploadResult = await supabase.storage
      .from('candidate-cvs')
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadResult.error) {
      console.error('❌ [AshbyFiles] Upload error:', {
        error: uploadResult.error.message,
        path: filePath,
        bucket: 'candidate-cvs'
      });
      return NextResponse.json(
        { error: 'Failed to store resume in storage', success: false },
        { status: 500 }
      );
    }
    
    console.log('✅ [AshbyFiles] File uploaded to storage:', {
      path: uploadResult.data?.path,
      fullPath: uploadResult.data?.fullPath
    });

    // Create file record in files table
    logContext.step = 'file_record_creation';

    
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
      console.error('❌ [AshbyFiles] Error creating file record:', {
        error: fileError.message,
        code: fileError.code,
        details: fileError.details,
        hint: fileError.hint
      });
      return NextResponse.json(
        { error: 'Failed to create file record', success: false },
        { status: 500 }
      );
    }
    


    if (mode === 'shared_file') {
      // Shared file mode: Update both ashby_candidate and applicant with same file reference
      logContext.step = 'shared_file_updates';
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
        console.error('❌ [AshbyFiles] Error updating ashby candidate:', {
          candidateId,
          error: ashbyUpdateError.message,
          code: ashbyUpdateError.code
        });
      } else {
        console.log('✅ [AshbyFiles] Ashby candidate updated with file reference');
      }

      // Update applicant with the same file reference
      if (targetApplicantId) {
        console.log('🔄 [AshbyFiles] Updating applicant record:', targetApplicantId);
        
        const { error: updateError } = await supabase
          .from('applicants')
          .update({
            cv_file_id: fileRecord.id,
            cv_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetApplicantId);

        if (updateError) {
          console.error('❌ [AshbyFiles] Error updating applicant:', {
            applicantId: targetApplicantId,
            error: updateError.message,
            code: updateError.code,
            details: updateError.details
          });
          return NextResponse.json(
            { error: 'Failed to update applicant', success: false },
            { status: 500 }
          );
        }
        
        console.log('✅ [AshbyFiles] Applicant updated with file reference and pending status');
      } else {
        console.warn('⚠️ [AshbyFiles] No applicant ID found for shared file mode');
      }

    } else {
      // Legacy mode: Update existing applicant only
      logContext.step = 'legacy_applicant_update';
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
        console.error('❌ [AshbyFiles] Error updating applicant in legacy mode:', {
          applicantId: targetApplicantId,
          error: updateError.message,
          code: updateError.code,
          details: updateError.details
        });
        return NextResponse.json(
          { error: 'Failed to update applicant', success: false },
          { status: 500 }
        );
      }

      console.log(`✅ [AshbyFiles] CV file stored for ATS candidate ${targetApplicantId}`);
    }


    const duration = Date.now() - startTime;
    logContext.step = 'success';
    
    console.log(`🎉 [AshbyFiles] CV processing completed successfully:`, {
      candidateId: logContext.candidateId,
      fileName,
      fileSize: fileBuffer.byteLength,
      duration: `${duration}ms`,
      fileId: fileRecord.id
    });

    return NextResponse.json({
      success: true,
      message: 'Resume successfully processed',
      fileName,
      fileSize: fileBuffer.byteLength,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('❌ [AshbyFiles] CV processing failed:', {
      context: logContext,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      duration: `${duration}ms`
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process CV', 
        success: false,
        step: logContext.step,
        candidateId: logContext.candidateId
      },
      { status: 500 }
    );
  }
}