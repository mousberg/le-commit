# Technical Analysis: Edge Function Migration

## Code to Move from Next.js API to Edge Function

### Source File: `/src/app/api/ashby/files/route.ts` (270 lines)

#### Core Logic to Extract (Lines to Move):

**1. File Handle Parsing Logic** (Lines 28-48)
```typescript
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
```

**2. Candidate Lookup with Retries** (Lines 51-78)
```typescript
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
```

**3. Ashby API Integration** (Lines 110-127)
```typescript
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
```

**4. File Download Logic** (Lines 129-148)
```typescript
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
```

**5. Storage Upload Logic** (Lines 150-169)
```typescript
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
```

**6. Database Record Creation** (Lines 172-184)
```typescript
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
```

**7. Candidate/Applicant Updates** (Lines 194-229)
```typescript
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
  }
}
```

## Dependencies to Include in Edge Function

### Import Requirements:
```typescript
// Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Ashby client (needs to be ported to Deno)
// Note: Will need to adapt /lib/ashby/client.ts for Deno environment
```

### Environment Variables Needed:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
```

## Code to Remove After Migration

### 1. Complete File Removal
- **File**: `/src/app/api/ashby/files/route.ts` (entire 270-line file)

### 2. Database Migration Cleanup
**File**: `/supabase/migrations/20250827000000_optimize_bulk_file_processing.sql`

**Remove these components:**
```sql
-- Remove bulk sync table
DROP TABLE IF EXISTS bulk_sync_sessions;

-- Remove bulk sync functions
DROP FUNCTION IF EXISTS is_bulk_sync_active(UUID);
DROP FUNCTION IF EXISTS start_bulk_sync_session(UUID);
DROP FUNCTION IF EXISTS end_bulk_sync_session(UUID);
DROP FUNCTION IF EXISTS process_deferred_files(UUID);
```

**Simplify trigger function to:**
```sql
CREATE OR REPLACE FUNCTION trigger_ashby_file_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_result jsonb;
BEGIN
  -- Only trigger for INSERTs and UPDATEs where resume_file_handle is added
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.resume_file_handle IS DISTINCT FROM NEW.resume_file_handle) THEN
    
    -- Check if we have a resume file handle but no cv_file_id
    IF NEW.resume_file_handle IS NOT NULL AND NEW.cv_file_id IS NULL THEN
      
      -- Invoke edge function
      SELECT supabase_functions.http_request(
        'POST',
        'https://your-project.supabase.co/functions/v1/process-ashby-file',
        jsonb_build_object(
          'candidateId', NEW.ashby_id,
          'fileHandle', NEW.resume_file_handle,
          'userId', NEW.user_id,
          'mode', 'shared_file'
        ),
        jsonb_build_object('Content-Type', 'application/json')
      ) INTO function_result;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### 3. API Route Reference Cleanup
**File**: `/src/app/api/ashby/candidates/route.ts`

**Remove these sections:**
- Lines 586-598: Bulk sync session management
- Lines 615-634: Bulk sync session cleanup
- All references to `isLargeBulkOperation` and `sessionId`

### 4. Unused Import Cleanup
After removing the API route, these imports may become unused:
- Any Ashby client imports specific to file processing
- Bulk sync related type definitions

## Code to Keep (Reusable Libraries)

### 1. Ashby Client Library
**File**: `/src/lib/ashby/client.ts`
- Keep the entire file, but may need Deno adaptation for edge function
- The `getResumeUrl()` method will be crucial for edge function

### 2. File Storage Utilities
**File**: `/src/lib/fileStorage.ts`
- Keep for any remaining manual file upload functionality

### 3. Database Types
**Files**: `/src/lib/interfaces/*.ts`
- Keep all type definitions as they're used throughout the app

### 4. Supabase Utilities
**Files**: `/src/lib/supabase/*.ts`
- Keep server client creation utilities
- Edge function will use different client creation method

## Adaptation Requirements

### 1. Ashby Client for Deno
The current Ashby client uses Node.js-style imports. For edge function:
```typescript
// Current (Node.js)
import { AshbyClient } from '@/lib/ashby/client';

// Edge Function (Deno) - will need to adapt or inline the client logic
```

### 2. Error Handling Adaptation
```typescript
// Current (Next.js)
return NextResponse.json({ error: 'message' }, { status: 500 });

// Edge Function (Deno)
return new Response(JSON.stringify({ error: 'message' }), { 
  status: 500,
  headers: { 'Content-Type': 'application/json' }
});
```

### 3. Environment Variables
```typescript
// Current (Next.js)
process.env.SUPABASE_SERVICE_ROLE_KEY

// Edge Function (Deno)  
Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
```

## Migration Complexity Assessment

**Low Complexity:**
- File download and upload logic (straightforward port)
- Database record creation (same Supabase client)
- Error handling patterns (similar concepts)

**Medium Complexity:**
- Ashby client adaptation for Deno environment
- Environment variable and import path changes
- Testing and debugging edge function locally

**High Complexity:**
- Database trigger function updates (SQL changes)
- Comprehensive error handling and logging
- Performance optimization and monitoring setup

## Estimated Impact

**Files Affected:**
- **1 file deleted**: `/src/app/api/ashby/files/route.ts`
- **1 migration updated**: Trigger function simplification
- **1 file modified**: Remove bulk sync calls from candidates API
- **1 edge function created**: New file processing function

**Net Code Reduction:**
- ~270 lines removed from Next.js API
- ~100 lines removed from database migration
- ~50 lines removed from candidates API
- **Total**: ~420 lines of complex code removed, replaced with simpler edge function
