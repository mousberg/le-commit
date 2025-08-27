/**
 * Purpose: Downloads CV files from Ashby ATS and stores them in Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAshbyApiKey } from '@/lib/ashby/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let candidateName = 'Unknown';
  let candidateId = 'unknown';
  let currentStep = 'initialization';
  
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { candidateId: reqCandidateId, fileHandle, applicantId, userId, mode } = body;
    
    candidateId = reqCandidateId;
    currentStep = 'validation';

    if (!candidateId || !fileHandle) {
      console.error(`❌ [AshbyFiles] Missing required fields: candidateId=${!!candidateId}, fileHandle=${!!fileHandle}`);
      return NextResponse.json(
        { error: 'candidateId and fileHandle are required', success: false },
        { status: 400 }
      );
    }

    // Extract file handle
    currentStep = 'file_handle_extraction';
    let actualFileHandle: string;
    
    if (typeof fileHandle === 'string') {
      actualFileHandle = fileHandle;
    } else if (typeof fileHandle === 'object' && fileHandle !== null) {
      const fileHandleObj = fileHandle as { id?: string; fileHandle?: string; handle?: string };
      actualFileHandle = fileHandleObj.handle || fileHandleObj.id || fileHandleObj.fileHandle || '';
      
      if (!actualFileHandle) {
        console.error(`❌ [AshbyFiles] Invalid file handle object for candidate ${candidateId}`);
        return NextResponse.json(
          { error: 'Invalid file handle format', success: false },
          { status: 400 }
        );
      }
    } else {
      console.error(`❌ [AshbyFiles] Invalid file handle type: ${typeof fileHandle} for candidate ${candidateId}`);
      return NextResponse.json(
        { error: 'Invalid file handle format', success: false },
        { status: 400 }
      );
    }

    // Get candidate from database
    currentStep = 'candidate_lookup';
    let candidate = null;
    let retries = 3;
    
    while (retries > 0 && !candidate) {
      const { data } = await supabase
        .from('ashby_candidates')
        .select('*, user_id, unmask_applicant_id')
        .eq('ashby_id', candidateId)
        .maybeSingle();

      candidate = data;
      
      if (!candidate && retries > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      retries--;
    }

    if (!candidate) {
      console.error(`❌ [AshbyFiles] Candidate ${candidateId} not found after retries`);
      return NextResponse.json(
        { error: 'Candidate not found', success: false },
        { status: 404 }
      );
    }

    candidateName = candidate.name || 'Unknown';
    const targetUserId = userId || candidate.user_id;
    
    // Validate applicant link for shared_file mode
    currentStep = 'applicant_validation';
    if (mode !== 'file_only') {
      const targetApplicantId = applicantId || candidate.unmask_applicant_id;
      
      if (!targetApplicantId) {
        console.error(`❌ [AshbyFiles] ${candidateName} (${candidateId}) not linked to applicant`);
        return NextResponse.json(
          { error: 'Candidate not linked to applicant', success: false },
          { status: 400 }
        );
      }
    }

    // Get API key
    currentStep = 'api_key_lookup';
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', targetUserId)
      .single();

    if (userError) {
      console.error(`❌ [AshbyFiles] User ${targetUserId} not found: ${userError.message}`);
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }

    const apiKey = getAshbyApiKey(userData?.ashby_api_key);
    if (!apiKey) {
      console.error(`❌ [AshbyFiles] No Ashby API key for user ${targetUserId}`);
      return NextResponse.json(
        { error: 'Ashby integration not configured for user', success: false },
        { status: 500 }
      );
    }

    // Get download URL from Ashby
    currentStep = 'ashby_url_fetch';
    const AshbyClient = (await import('@/lib/ashby/client')).AshbyClient;
    const ashbyClient = new AshbyClient({ apiKey });
    const fileResponse = await ashbyClient.getResumeUrl(actualFileHandle);

    const downloadUrl = fileResponse.results?.url;
    
    if (!fileResponse.success || !downloadUrl) {
      console.error(`❌ [AshbyFiles] ${candidateName}: Failed to get resume URL - ${fileResponse.error?.message || 'No URL returned'}`);
      return NextResponse.json(
        { 
          error: fileResponse.error?.message || 'Failed to get resume URL', 
          success: false
        },
        { status: 500 }
      );
    }

    // Download file
    currentStep = 'file_download';
    const downloadResponse = await fetch(downloadUrl);
    
    if (!downloadResponse.ok) {
      console.error(`❌ [AshbyFiles] ${candidateName}: Download failed - ${downloadResponse.status} ${downloadResponse.statusText}`);
      return NextResponse.json(
        { error: 'Failed to download resume from Ashby', success: false },
        { status: 500 }
      );
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const contentType = downloadResponse.headers.get('content-type') || 'application/pdf';

    // Generate file path
    const extension = contentType.includes('pdf') ? '.pdf' : '.doc';
    const fileName = `${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume_${candidateId}${extension}`;
    const filePath = `${candidate.user_id}/${Date.now()}_${fileName}`;

    // Upload to Supabase Storage
    currentStep = 'storage_upload';
    const uploadResult = await supabase.storage
      .from('candidate-cvs')
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadResult.error) {
      console.error(`❌ [AshbyFiles] ${candidateName}: Storage upload failed - ${uploadResult.error.message}`);
      return NextResponse.json(
        { error: 'Failed to store resume in storage', success: false },
        { status: 500 }
      );
    }

    // Create file record
    currentStep = 'file_record_creation';
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
      console.error(`❌ [AshbyFiles] ${candidateName}: Database file record failed - ${fileError.message}`);
      return NextResponse.json(
        { error: 'Failed to create file record', success: false },
        { status: 500 }
      );
    }

    // Update candidate and applicant records
    currentStep = 'database_updates';
    if (mode === 'shared_file') {
      const targetApplicantId = applicantId || candidate.unmask_applicant_id;
      
      // Update ashby_candidates
      const { error: ashbyUpdateError } = await supabase
        .from('ashby_candidates')
        .update({
          cv_file_id: fileRecord.id,
          updated_at: new Date().toISOString()
        })
        .eq('ashby_id', candidateId);

      if (ashbyUpdateError) {
        console.error(`❌ [AshbyFiles] ${candidateName}: Failed to update ashby candidate - ${ashbyUpdateError.message}`);
      }

      // Update applicant
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
          console.error(`❌ [AshbyFiles] ${candidateName}: Failed to update applicant - ${updateError.message}`);
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
        console.error(`❌ [AshbyFiles] ${candidateName}: Failed to update applicant - ${updateError.message}`);
        return NextResponse.json(
          { error: 'Failed to update applicant', success: false },
          { status: 500 }
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [AshbyFiles] ${candidateName}: ${Math.round(fileBuffer.byteLength/1024)}KB in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Resume successfully processed',
      fileName,
      fileSize: fileBuffer.byteLength,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [AshbyFiles] ${candidateName} failed at ${currentStep}: ${error instanceof Error ? error.message : String(error)} (${duration}ms)`);
    
    return NextResponse.json(
      { 
        error: `Failed at ${currentStep}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        success: false,
        step: currentStep,
        candidate: candidateName,
        duration
      },
      { status: 500 }
    );
  }
}