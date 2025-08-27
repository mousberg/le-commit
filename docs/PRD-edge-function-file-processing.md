# Product Requirements Document: Edge Function File Processing Migration

## Overview

Migrate Ashby file processing from Next.js API routes to Supabase Edge Functions to solve performance and reliability issues during bulk candidate syncing operations.

## Problem Statement

### Current Issues
1. **Server Overload**: When syncing 100+ candidates, simultaneous HTTP requests to `/api/ashby/files` overwhelm the Next.js server, causing 500 errors
2. **Resource Waste**: File downloads consume Next.js server resources that should be reserved for user-facing operations
3. **Poor Scalability**: No built-in concurrency control or queuing mechanism
4. **Complex Error Handling**: Network timeouts and HTTP failures are difficult to handle gracefully
5. **Rate Limiting**: Parallel requests to Ashby API increase chances of hitting rate limits

### Current Architecture (Problematic)
```
Database Trigger → HTTP POST to Next.js → Ashby API → Supabase Storage → Database Updates
```

## Solution

### Proposed Architecture
```
Database Trigger → Supabase Edge Function → Ashby API → Supabase Storage → Database Updates
```

### Key Benefits
- **Built-in Queuing**: Supabase manages function invocation queue automatically
- **Resource Isolation**: File processing doesn't impact main application server
- **Better Error Handling**: Built-in retries and failure management
- **Natural Rate Limiting**: Queue prevents overwhelming external APIs
- **Simplified Architecture**: Removes unnecessary HTTP round-trip

## Technical Requirements

### Edge Function Responsibilities
1. **File Download**: Fetch resume files from Ashby using file handles
2. **Storage Upload**: Store files in Supabase Storage (`candidate-cvs` bucket)
3. **Database Updates**: Update `files`, `ashby_candidates`, and `applicants` tables
4. **Status Tracking**: Update processing status throughout the workflow
5. **Error Handling**: Graceful failure handling with appropriate logging

### Performance Requirements
- Handle up to 1000 file processing requests per bulk sync
- Process files within 30 seconds per file
- Maintain 99% success rate for file downloads
- Zero impact on Next.js application performance

### Security Requirements
- Authenticate using service role key for database access
- Validate input parameters (candidateId, fileHandle, userId)
- Ensure proper file type validation (PDF, DOC, DOCX)
- Maintain user data isolation through RLS policies

## Status Tracking Strategy

### Option A: Database Status Tracking (Selected)
Add `file_processing_status` column to `ashby_candidates` table to track progress:

**Status Values:**
- `pending` - File processing not yet started
- `processing` - Edge function currently processing file
- `completed` - File successfully processed and stored
- `failed` - Processing failed with error

**Implementation:**
```sql
ALTER TABLE ashby_candidates ADD COLUMN file_processing_status TEXT DEFAULT 'pending';
CREATE INDEX idx_ashby_candidates_processing_status ON ashby_candidates(file_processing_status);
```

**Progress Monitoring:**
- Frontend can query: `SELECT COUNT(*) FROM ashby_candidates WHERE file_processing_status = 'completed'`
- Real-time progress: `SELECT file_processing_status, COUNT(*) FROM ashby_candidates GROUP BY file_processing_status`
- Error tracking: `SELECT * FROM ashby_candidates WHERE file_processing_status = 'failed'`

**Edge Function Workflow:**
1. Set status to `processing` when function starts
2. Update to `completed` on successful file storage
3. Update to `failed` with error logging on any failure
4. Include status updates in all database transactions

## Implementation Plan

### Phase 1: Database Schema Update
1. Add `file_processing_status` column to `ashby_candidates` table
2. Create index for efficient status queries
3. Update existing records to `pending` status

### Phase 2: Edge Function Creation
1. Create `supabase/functions/process-ashby-file/index.ts`
2. Implement file download and storage logic with status updates
3. Add comprehensive error handling and logging
4. Test with individual file processing and status tracking

### Phase 3: Database Migration
1. Update trigger function to call edge function instead of HTTP endpoint
2. Remove bulk sync session complexity (no longer needed)
3. Test trigger with small batches and verify status updates

### Phase 4: Cleanup
1. Remove `/api/ashby/files` Next.js API route
2. Clean up unused bulk sync database functions
3. Update documentation and remove obsolete code

### Phase 5: Testing & Deployment
1. Test with progressively larger candidate batches
2. Monitor edge function performance and error rates
3. Verify status tracking accuracy during bulk operations
4. Deploy to production with comprehensive monitoring

## Code Migration Analysis

### Code to Move to Edge Function
From `/api/ashby/files/route.ts`:
- File handle parsing logic (lines 28-48)
- Ashby API client integration (lines 110-127)
- File download logic (lines 129-148)
- Storage upload logic (lines 154-169)
- Database record creation (lines 172-184)
- Candidate/applicant updates (lines 194-229)

### Code to Remove After Migration
1. **Next.js API Route**: Entire `/api/ashby/files/route.ts` file
2. **Bulk Sync Functions**: Database functions in migration `20250827000000_optimize_bulk_file_processing.sql`:
   - `bulk_sync_sessions` table
   - `is_bulk_sync_active()` function
   - `start_bulk_sync_session()` function
   - `end_bulk_sync_session()` function
   - `process_deferred_files()` function
3. **Complex Trigger Logic**: Simplified trigger function (no bulk detection needed)
4. **API Route References**: Remove bulk session calls from `/api/ashby/candidates/route.ts`

### Code to Keep (Reusable)
- Ashby client library (`/lib/ashby/client.ts`)
- File storage utilities (`/lib/fileStorage.ts`)
- Database types and interfaces
- Error handling patterns

## Success Metrics

### Performance Metrics
- **Bulk Sync Success Rate**: >99% for 1000+ candidate operations
- **File Processing Latency**: <30 seconds per file
- **Server Resource Usage**: 0% impact on Next.js server during bulk operations
- **API Rate Limit Hits**: <1% of requests to Ashby API

### Reliability Metrics
- **Error Rate**: <1% for file processing operations
- **Data Consistency**: 100% accuracy in file-to-candidate linking
- **Storage Success Rate**: >99.9% for file uploads to Supabase Storage

### Status Tracking Metrics
- **Status Accuracy**: 100% of files have correct processing status
- **Progress Visibility**: Real-time status updates during bulk operations
- **Error Transparency**: Failed processing clearly identified with error details
- **Completion Detection**: Accurate count of total vs processed files

## Risk Assessment

### Technical Risks
- **Edge Function Cold Starts**: May cause initial delays (Mitigation: Keep functions warm)
- **Supabase Service Limits**: Function timeout limits (Mitigation: Optimize processing time)
- **Database Connection Limits**: Too many concurrent connections (Mitigation: Connection pooling)

### Mitigation Strategies
- Implement comprehensive logging for debugging
- Add retry logic for transient failures
- Monitor function performance metrics
- Maintain fallback to manual file processing

## Timeline

- **Week 1**: Edge function development and testing
- **Week 2**: Database migration and trigger updates
- **Week 3**: Cleanup and integration testing
- **Week 4**: Production deployment and monitoring

## Dependencies

- Supabase Edge Functions enabled on project
- Ashby API access and file handle permissions
- Supabase Storage bucket configuration
- Database migration capabilities

## Acceptance Criteria

1. ✅ Edge function successfully processes individual files
2. ✅ Bulk sync of 1000+ candidates completes without 500 errors
3. ✅ All files are correctly stored and linked to candidates
4. ✅ Next.js server performance unaffected during bulk operations
5. ✅ No data loss or corruption during migration
6. ✅ Comprehensive error logging and monitoring in place
7. ✅ File processing status accurately tracked throughout workflow
8. ✅ Progress visibility available for bulk operations (completed/total counts)
9. ✅ Failed file processing clearly identified with error details
10. ✅ Status queries perform efficiently with proper database indexing
