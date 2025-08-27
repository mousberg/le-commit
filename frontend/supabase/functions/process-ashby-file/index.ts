// Supabase Edge Function: Process Ashby File
// Downloads resume files from Ashby and stores them in Supabase Storage
// Updates ashby_candidates and applicants tables with file references and status

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface RequestBody {
  candidateId: string
  fileHandle: string | Record<string, unknown>
  userId: string
  mode?: string
  applicantId?: string
}

interface AshbyFileHandle {
  id?: string
  fileHandle?: string
  handle?: string
}

Deno.serve(async (req) => {
  console.log('🚀 Ashby file processing function invoked')
  
  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Parse request body
    const body: RequestBody = await req.json()
    const { candidateId, fileHandle, userId, mode = 'shared_file', applicantId } = body
    
    console.log(`📋 Processing file for candidate: ${candidateId}, user: ${userId}`)
    
    if (!candidateId || !fileHandle || !userId) {
      console.error('❌ Missing required parameters')
      return new Response(
        JSON.stringify({ error: 'candidateId, fileHandle, and userId are required', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Extract actual file handle from object or string
    let actualFileHandle: string
    if (typeof fileHandle === 'string') {
      actualFileHandle = fileHandle
    } else if (typeof fileHandle === 'object' && fileHandle !== null) {
      const fileHandleObj = fileHandle as AshbyFileHandle
      actualFileHandle = fileHandleObj.handle || fileHandleObj.id || fileHandleObj.fileHandle || ''
      if (!actualFileHandle) {
        console.error('❌ Could not extract file handle from object:', fileHandle)
        return new Response(
          JSON.stringify({ error: 'Invalid file handle format', success: false }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } else {
      console.error('❌ Invalid file handle type:', typeof fileHandle)
      return new Response(
        JSON.stringify({ error: 'Invalid file handle format', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`🔑 Extracted file handle: ${actualFileHandle}`)
    
    // Update status to processing
    console.log('📊 Setting status to processing...')
    const { error: statusUpdateError } = await supabase
      .from('ashby_candidates')
      .update({ file_processing_status: 'processing' })
      .eq('ashby_id', candidateId)
      .eq('user_id', userId)
    
    if (statusUpdateError) {
      console.error('❌ Failed to update status to processing:', statusUpdateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update processing status', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Get candidate record with retries
    let candidate = null
    let retries = 3
    
    while (retries > 0 && !candidate) {
      const { data, error } = await supabase
        .from('ashby_candidates')
        .select('*, user_id, unmask_applicant_id')
        .eq('ashby_id', candidateId)
        .single()
      
      candidate = data
      
      if (!candidate && retries > 1) {
        console.log(`🔄 Candidate not found, retrying... (${retries - 1} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      retries--
    }
    
    if (!candidate) {
      console.error('❌ Candidate not found after retries')
      // Update status to failed
      await supabase
        .from('ashby_candidates')
        .update({ file_processing_status: 'failed' })
        .eq('ashby_id', candidateId)
        .eq('user_id', userId)
      
      return new Response(
        JSON.stringify({ error: 'Candidate not found', success: false }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Get Ashby API key
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', userId)
      .single()
    
    // Use environment variable in development, user's key in production
    let apiKey: string | null = null
    const appEnv = Deno.env.get('NEXT_PUBLIC_APP_ENV') || 'production'
    if (appEnv === 'development' && Deno.env.get('ASHBY_API_KEY')) {
      apiKey = Deno.env.get('ASHBY_API_KEY')!
      console.log('🔧 Using development API key')
    } else {
      apiKey = userData?.ashby_api_key || null
      console.log('🔧 Using user API key')
    }
    
    if (!apiKey) {
      console.error('❌ No Ashby API key available')
      // Update status to failed
      await supabase
        .from('ashby_candidates')
        .update({ file_processing_status: 'failed' })
        .eq('ashby_id', candidateId)
        .eq('user_id', userId)
      
      return new Response(
        JSON.stringify({ error: 'Ashby API key not configured', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Get download URL from Ashby
    console.log('🌐 Getting download URL from Ashby...')
    const ashbyResponse = await fetch('https://api.ashbyhq.com/file.info', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileHandle: actualFileHandle
      })
    })
    
    if (!ashbyResponse.ok) {
      console.error('❌ Failed to get file info from Ashby:', ashbyResponse.status)
      // Update status to failed
      await supabase
        .from('ashby_candidates')
        .update({ file_processing_status: 'failed' })
        .eq('ashby_id', candidateId)
        .eq('user_id', userId)
      
      return new Response(
        JSON.stringify({ error: 'Failed to get file info from Ashby', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const ashbyData = await ashbyResponse.json()
    const downloadUrl = ashbyData.results?.downloadUrl
    
    if (!downloadUrl) {
      console.error('❌ No download URL in Ashby response')
      // Update status to failed
      await supabase
        .from('ashby_candidates')
        .update({ file_processing_status: 'failed' })
        .eq('ashby_id', candidateId)
        .eq('user_id', userId)
      
      return new Response(
        JSON.stringify({ error: 'No download URL from Ashby', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Download the file
    console.log('📥 Downloading file from Ashby...')
    const downloadResponse = await fetch(downloadUrl)
    
    if (!downloadResponse.ok) {
      console.error('❌ Failed to download file:', downloadResponse.status)
      // Update status to failed
      await supabase
        .from('ashby_candidates')
        .update({ file_processing_status: 'failed' })
        .eq('ashby_id', candidateId)
        .eq('user_id', userId)
      
      return new Response(
        JSON.stringify({ error: 'Failed to download file from Ashby', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const fileBuffer = await downloadResponse.arrayBuffer()
    const contentType = downloadResponse.headers.get('content-type') || 'application/pdf'
    
    // Determine file extension
    let extension = '.pdf'
    if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      extension = '.docx'
    } else if (contentType.includes('application/msword')) {
      extension = '.doc'
    }
    
    // Create file path
    const fileName = `${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume_${candidateId}${extension}`
    const filePath = `${userId}/${Date.now()}_${fileName}`
    
    console.log(`💾 Uploading file to storage: ${filePath}`)
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('candidate-cvs')
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      // Update status to failed
      await supabase
        .from('ashby_candidates')
        .update({ file_processing_status: 'failed' })
        .eq('ashby_id', candidateId)
        .eq('user_id', userId)
      
      return new Response(
        JSON.stringify({ error: 'Failed to store file in storage', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create file record
    console.log('📝 Creating file record...')
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        file_type: 'cv',
        original_filename: fileName,
        storage_path: filePath,
        storage_bucket: 'candidate-cvs',
        file_size: fileBuffer.byteLength,
        mime_type: contentType
      })
      .select()
      .single()
    
    if (fileError) {
      console.error('❌ File record creation error:', fileError)
      // Update status to failed
      await supabase
        .from('ashby_candidates')
        .update({ file_processing_status: 'failed' })
        .eq('ashby_id', candidateId)
        .eq('user_id', userId)
      
      return new Response(
        JSON.stringify({ error: 'Failed to create file record', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Update ashby_candidates with file reference and completed status
    console.log('✅ Updating candidate with file reference...')
    const { error: ashbyUpdateError } = await supabase
      .from('ashby_candidates')
      .update({
        cv_file_id: fileRecord.id,
        file_processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('ashby_id', candidateId)
      .eq('user_id', userId)
    
    if (ashbyUpdateError) {
      console.error('❌ Ashby candidate update error:', ashbyUpdateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update ashby candidate', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Update applicant if in shared_file mode
    if (mode === 'shared_file') {
      const targetApplicantId = applicantId || candidate.unmask_applicant_id
      
      if (targetApplicantId) {
        console.log('✅ Updating applicant with file reference...')
        const { error: applicantUpdateError } = await supabase
          .from('applicants')
          .update({
            cv_file_id: fileRecord.id,
            cv_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetApplicantId)
          .eq('user_id', userId)
        
        if (applicantUpdateError) {
          console.error('❌ Applicant update error:', applicantUpdateError)
          return new Response(
            JSON.stringify({ error: 'Failed to update applicant', success: false }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
    }
    
    console.log(`🎉 File processing completed successfully for candidate ${candidateId}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'File processed successfully',
        fileName,
        fileSize: fileBuffer.byteLength,
        fileId: fileRecord.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('💥 Unexpected error in file processing:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during file processing', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/* To test locally:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-ashby-file' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' \
    --header 'Content-Type: application/json' \
    --data '{"candidateId":"test_candidate_id","fileHandle":"test_file_handle","userId":"test_user_id"}'

*/