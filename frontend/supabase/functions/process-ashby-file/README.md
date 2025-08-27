# Process Ashby File Edge Function

## Overview

This Supabase Edge Function handles automatic downloading and storage of resume files from Ashby ATS. It replaces the previous Next.js API route to solve performance issues during bulk candidate syncing operations.

## Purpose

- **Download** resume files from Ashby using file handles
- **Store** files in Supabase Storage (`candidate-cvs` bucket)  
- **Track** processing status in real-time
- **Update** database records with file references
- **Handle** errors gracefully with proper logging

## Architecture Benefits

### Before (Problematic)
```
Database Trigger → HTTP POST to Next.js → Ashby API → Supabase Storage → Database Updates
```

### After (Improved)
```
Database Trigger → Edge Function → Ashby API → Supabase Storage → Database Updates
```

**Key Improvements:**
- ✅ Built-in queuing prevents server overload
- ✅ No impact on Next.js server performance
- ✅ Better error handling and retries
- ✅ Natural rate limiting through function queue
- ✅ Real-time status tracking

## Function Parameters

### Request Body
```typescript
{
  candidateId: string,    // Ashby candidate ID
  fileHandle: string | object, // Ashby file handle (string or JSONB object)
  userId: string,         // UUID of the user (must be valid UUID)
  mode?: string,          // Optional: 'shared_file' (default) or 'file_only'
  applicantId?: string    // Optional: specific applicant ID to update
}
```

### Response
```typescript
// Success
{
  success: true,
  message: "File processed successfully",
  fileName: string,
  fileSize: number,
  fileId: string
}

// Error
{
  success: false,
  error: string,
  details?: string
}
```

## Status Tracking

The function updates `ashby_candidates.file_processing_status` throughout the workflow:

| Status | Description | When Set |
|--------|-------------|----------|
| `pending` | Not yet started | Default value |
| `processing` | Currently downloading/storing | Function start |
| `completed` | Successfully processed | After storage upload |
| `failed` | Error occurred | On any failure |

## API Key Resolution

The function supports both development and production environments:

1. **Development Mode**: Uses `ASHBY_API_KEY` environment variable
2. **Production Mode**: Uses user's `ashby_api_key` from database
3. **Fallback**: Returns error if no API key available

## Error Handling

The function implements comprehensive error handling:

- **Parameter Validation**: Validates required fields
- **File Handle Parsing**: Handles string or object formats
- **Database Errors**: Updates status to 'failed' on errors
- **API Failures**: Graceful handling of Ashby API issues
- **Storage Errors**: Proper cleanup on upload failures

## Database Updates

### ashby_candidates Table
```sql
UPDATE ashby_candidates SET
  cv_file_id = [file_record_id],
  file_processing_status = 'completed',
  updated_at = NOW()
WHERE ashby_id = [candidate_id]
```

### applicants Table (shared_file mode)
```sql
UPDATE applicants SET
  cv_file_id = [file_record_id],
  cv_status = 'pending',
  updated_at = NOW()
WHERE id = [applicant_id]
```

### files Table
```sql
INSERT INTO files (
  user_id,
  file_type,
  original_filename,
  storage_path,
  storage_bucket,
  file_size,
  mime_type
) VALUES (...)
```

## Local Testing

### Start Edge Functions
```bash
cd frontend
supabase functions serve --env-file .env.local
```

### Test with Curl
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-ashby-file' \
  --header 'Authorization: Bearer [SERVICE_ROLE_KEY]' \
  --header 'Content-Type: application/json' \
  --data '{"candidateId":"test","fileHandle":"test","userId":"valid-uuid"}'
```

### Monitor Logs
```bash
supabase functions logs --follow
```

## Environment Variables

Required in `.env.local`:
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ASHBY_API_KEY=your_ashby_api_key_here  # Development only
NEXT_PUBLIC_APP_ENV=development
```

## Performance Characteristics

- **Processing Time**: ~30 seconds per file (download + upload)
- **Concurrency**: Handled automatically by Supabase Edge Runtime
- **File Size Limit**: Depends on Supabase Storage limits
- **Supported Formats**: PDF, DOC, DOCX

## Monitoring

### Status Queries
```sql
-- Overall progress
SELECT file_processing_status, COUNT(*) 
FROM ashby_candidates 
GROUP BY file_processing_status;

-- Failed files
SELECT name, ashby_id, file_processing_status
FROM ashby_candidates 
WHERE file_processing_status = 'failed';

-- Processing progress for a user
SELECT 
  COUNT(*) FILTER (WHERE file_processing_status = 'completed') as completed,
  COUNT(*) FILTER (WHERE file_processing_status = 'processing') as processing,
  COUNT(*) FILTER (WHERE file_processing_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE file_processing_status = 'failed') as failed
FROM ashby_candidates 
WHERE user_id = 'user-uuid';
```

### Log Patterns to Monitor
- `🚀 Ashby file processing function invoked` - Function starts
- `📊 Setting status to processing...` - Status tracking works
- `🌐 Getting download URL from Ashby...` - API integration
- `💾 Uploading file to storage` - Storage operations
- `✅ Updating candidate with file reference...` - Database updates
- `🎉 File processing completed successfully` - Success
- `❌` prefix - Any errors requiring attention

## Troubleshooting

### Common Issues

1. **Invalid UUID Error**
   - Ensure `userId` is a valid UUID format
   - Check database user records exist

2. **Ashby API Failures**
   - Verify API key is valid
   - Check rate limiting
   - Confirm file handle is accessible

3. **Storage Upload Failures**
   - Check Supabase Storage bucket exists
   - Verify storage permissions
   - Monitor storage quota

4. **Database Update Failures**
   - Check RLS policies
   - Verify foreign key constraints
   - Monitor connection limits

### Debug Steps
1. Check function logs for detailed error messages
2. Query `file_processing_status` to see where process failed
3. Test with smaller file or different candidate
4. Verify environment variables are set correctly

## Related Files

- **Database Schema**: `migrations/20250829000000_add_file_processing_status.sql`
- **Database Trigger**: `migrations/20250827000000_optimize_bulk_file_processing.sql`
- **Test Script**: `../../test-edge-function.sh`
- **PRD**: `../../../docs/PRD-edge-function-file-processing.md`
