/**
 * Purpose: Downloads CV files from Ashby ATS and stores them in Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAshbyApiKey } from '@/lib/ashby/server';

// Simple in-memory cache for API keys to avoid repeated database lookups
const apiKeyCache = new Map<string, { apiKey: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Helper function to get cached API key or fetch from database
async function getCachedApiKey(userId: string, supabase: any): Promise<string | null> {
  // Periodic cache cleanup to prevent memory leaks
  if (apiKeyCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of apiKeyCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        apiKeyCache.delete(key);
      }
    }
  }
  
  // Check cache first
  const cached = apiKeyCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.apiKey;
  }
  
  // Cache miss or expired - fetch from database
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('ashby_api_key')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error(`❌ [AshbyFiles] User ${userId} not found: ${userError.message}`);
    return null;
  }

  const apiKey = getAshbyApiKey(userData?.ashby_api_key);
  if (apiKey) {
    // Cache the result
    apiKeyCache.set(userId, { apiKey, timestamp: Date.now() });
  }
  
  return apiKey;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const stepTimings: { [key: string]: number } = {};
  let candidateName = 'Unknown';
  let candidateId = 'unknown';
  let currentStep = 'initialization';
  
  const trackStep = (step: string) => {
    stepTimings[currentStep] = Date.now() - startTime - Object.values(stepTimings).reduce((a, b) => a + b, 0);
    currentStep = step;
  };
  
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { candidateId: reqCandidateId, fileHandle, applicantId, userId, mode } = body;
    
    candidateId = reqCandidateId;
    trackStep('validation');

    if (!candidateId || !fileHandle) {
      console.error(`❌ [AshbyFiles] Missing required fields: candidateId=${!!candidateId}, fileHandle=${!!fileHandle}`);
      return NextResponse.json(
        { error: 'candidateId and fileHandle are required', success: false },
        { status: 400 }
      );
    }

    // Extract file handle
    trackStep('file_handle_extraction');
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
    trackStep('candidate_lookup');
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
    trackStep('applicant_validation');
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

    // Get API key (with caching)
    trackStep('api_key_lookup');
    const apiKey = await getCachedApiKey(targetUserId, supabase);
    
    if (!apiKey) {
      console.error(`❌ [AshbyFiles] No Ashby API key for user ${targetUserId}`);
      return NextResponse.json(
        { error: 'Ashby integration not configured for user', success: false },
        { status: 500 }
      );
    }

    // Get download URL from Ashby
    trackStep('ashby_url_fetch');
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

    // Download file with timeout, size checking, and retry logic
    trackStep('file_download');
    
    let downloadResponse: Response;
    let fileSize = 0;
    let retryCount = 0;
    const maxRetries = 2; // Try up to 3 times total
    
    while (retryCount <= maxRetries) {
      try {
        // Create AbortController for 30-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000); // 30 second timeout for file downloads
        
        downloadResponse = await fetch(downloadUrl, {
          signal: controller.signal
        });
        
        // Clear timeout if request completes
        clearTimeout(timeoutId);
        
        if (!downloadResponse.ok) {
          // Don't retry for client errors (4xx)
          if (downloadResponse.status >= 400 && downloadResponse.status < 500) {
            console.error(`❌ [AshbyFiles] ${candidateName}: Download failed - ${downloadResponse.status} ${downloadResponse.statusText}`);
            return NextResponse.json(
              { error: 'Failed to download resume from Ashby', success: false },
              { status: 500 }
            );
          }
          
          // Retry for server errors (5xx)
          throw new Error(`HTTP ${downloadResponse.status}: ${downloadResponse.statusText}`);
        }
        
        // Check file size before downloading
        const contentLength = downloadResponse.headers.get('content-length');
        if (contentLength) {
          fileSize = parseInt(contentLength);
          const maxFileSize = 10 * 1024 * 1024; // 10MB limit
          
          if (fileSize > maxFileSize) {
            console.error(`❌ [AshbyFiles] ${candidateName}: File too large - ${Math.round(fileSize/1024/1024)}MB (max 10MB)`);
            return NextResponse.json(
              { error: 'File too large (max 10MB)', success: false },
              { status: 413 }
            );
          }
        }
        
        // Success - break out of retry loop
        break;
        
      } catch (downloadError) {
        retryCount++;
        
        // Enhanced error classification
        let errorMessage = 'Download failed';
        let errorCode = 'DOWNLOAD_ERROR';
        let shouldRetry = false;
        
        if (downloadError instanceof Error) {
          if (downloadError.name === 'AbortError') {
            errorCode = 'TIMEOUT_ERROR';
            errorMessage = 'Download timed out after 30 seconds';
            shouldRetry = retryCount <= maxRetries; // Retry timeouts
          } else if (downloadError.message.includes('fetch') || downloadError.message.includes('network')) {
            errorCode = 'NETWORK_ERROR';
            errorMessage = 'Network error during download';
            shouldRetry = retryCount <= maxRetries; // Retry network errors
          } else if (downloadError.message.includes('HTTP 5')) {
            errorCode = 'SERVER_ERROR';
            errorMessage = downloadError.message;
            shouldRetry = retryCount <= maxRetries; // Retry server errors
          } else {
            errorMessage = downloadError.message;
          }
        }
        
        if (shouldRetry && retryCount <= maxRetries) {
          const delay = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s exponential backoff
          console.warn(`⚠️ [AshbyFiles] ${candidateName}: ${errorMessage} - retrying in ${delay}ms (attempt ${retryCount}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Max retries exceeded or non-retryable error
        console.error(`❌ [AshbyFiles] ${candidateName}: ${errorMessage} (${errorCode}) after ${retryCount} attempts`);
        return NextResponse.json(
          { error: errorMessage, success: false, code: errorCode, attempts: retryCount },
          { status: 500 }
        );
      }
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const actualFileSize = fileBuffer.byteLength;
    const contentType = downloadResponse.headers.get('content-type') || 'application/pdf';
    
    // Log file size for analysis
    console.log(`📦 [AshbyFiles] ${candidateName}: Downloaded ${Math.round(actualFileSize/1024)}KB file`);

    // Generate file path
    const extension = contentType.includes('pdf') ? '.pdf' : '.doc';
    const fileName = `${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume_${candidateId}${extension}`;
    const filePath = `${candidate.user_id}/${Date.now()}_${fileName}`;

    // Upload to Supabase Storage
    trackStep('storage_upload');
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
    trackStep('file_record_creation');
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        user_id: targetUserId,
        file_type: 'cv',
        original_filename: fileName,
        storage_path: filePath,
        storage_bucket: 'candidate-cvs',
        file_size: actualFileSize,
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
    trackStep('database_updates');
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
    stepTimings[currentStep] = Date.now() - startTime - Object.values(stepTimings).reduce((a, b) => a + b, 0);
    
    // Log success with timing breakdown
    const timingBreakdown = Object.entries(stepTimings)
      .filter(([_, time]) => time > 100) // Only show steps >100ms
      .map(([step, time]) => `${step}:${time}ms`)
      .join(' ');
    
    console.log(`✅ [AshbyFiles] ${candidateName}: ${Math.round(actualFileSize/1024)}KB in ${duration}ms (${timingBreakdown})`);

    return NextResponse.json({
      success: true,
      message: 'Resume successfully processed',
      fileName,
      fileSize: actualFileSize,
      duration,
      timings: stepTimings
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Enhanced error classification
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'Unknown error';
    let httpStatus = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Classify error types based on step and message
      if (error.name === 'AbortError') {
        errorCode = 'TIMEOUT_ERROR';
        errorMessage = `Request timed out during ${currentStep}`;
      } else if (error.message.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
        errorMessage = `Network error during ${currentStep}`;
      } else if (error.message.includes('timeout')) {
        errorCode = 'TIMEOUT_ERROR';
      } else if (error.message.includes('database') || error.message.includes('storage')) {
        errorCode = 'DATABASE_ERROR';
      } else if (currentStep === 'file_download' && error.message.includes('large')) {
        errorCode = 'FILE_TOO_LARGE';
        httpStatus = 413;
      }
    }
    
    console.error(`❌ [AshbyFiles] ${candidateName} failed at ${currentStep}: ${errorMessage} (${errorCode}, ${duration}ms)`);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false,
        step: currentStep,
        candidate: candidateName,
        duration,
        code: errorCode
      },
      { status: httpStatus }
    );
  }
}