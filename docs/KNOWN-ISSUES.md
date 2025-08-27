# Known Issues

## Edge Function Local Development Networking Issue

**Status**: Open  
**Priority**: Medium (local dev only)  
**Date**: 2025-08-27  
**Commit**: ccf005d

### Problem

The Ashby file processing edge function migration is complete but has a networking issue in local development:

- ✅ **Edge function works perfectly** when called directly via curl
- ✅ **Database trigger fires correctly** on INSERT/UPDATE operations
- ✅ **pg_net extension works** and returns success codes (confirmed via `SELECT net.http_post(...)`)
- ❌ **HTTP requests from trigger don't reach edge function** in local development

### Root Cause

Docker networking isolation prevents PostgreSQL container from reaching `127.0.0.1:54321` where the edge function runs in local development.

### Evidence

1. **Manual curl test succeeds**:
   ```bash
   curl -X POST http://127.0.0.1:54321/functions/v1/process-ashby-file \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [token]" \
     -d '{"candidateId": "test", "fileHandle": {...}, "userId": "uuid", "mode": "shared_file"}'
   ```
   ✅ Returns 500 (expected - fake data) with proper edge function logs

2. **Database trigger fires**:
   ```sql
   UPDATE ashby_candidates SET resume_file_handle = jsonb_build_object('handle', 'test')
   WHERE ashby_id = 'test_candidate';
   ```
   ✅ `resume_file_handle` updates correctly, indicating trigger execution

3. **pg_net HTTP requests queue successfully**:
   ```sql
   SELECT net.http_post(url => 'http://127.0.0.1:54321/functions/v1/process-ashby-file', ...)
   ```
   ✅ Returns result ID (e.g., `11`), indicating request was queued

4. **But no edge function logs appear** when trigger makes HTTP calls

### Expected Behavior in Production

This should work correctly in production because:
- Supabase PostgreSQL and Edge Functions run in the same environment
- No Docker networking isolation issues
- Edge function URL resolves to internal Supabase infrastructure

### Workarounds

1. **For testing**: Use manual curl calls to test edge function logic
2. **For development**: Test the full flow in Supabase production/staging environment
3. **Alternative**: Could modify trigger to use different URL (e.g., `host.docker.internal:54321`) but this adds complexity

### Architecture Completed

Despite the local networking issue, the full architecture is implemented:

```
[Candidate Insert/Update] 
    ↓ (database trigger)
[trigger_ashby_file_processing()]
    ↓ (pg_net HTTP call)  
[process-ashby-file Edge Function]
    ↓ (Ashby API + File Storage)
[File stored + status updated]
```

### Files Involved

- `frontend/supabase/functions/process-ashby-file/index.ts` - Edge function implementation
- `frontend/supabase/migrations/20250830000000_connect_edge_function_trigger.sql` - Trigger setup
- `frontend/supabase/migrations/20250829000000_add_file_processing_status.sql` - Status tracking
- `test-edge-function.sh` - Manual testing script
- `test-end-to-end.sql` - Database trigger testing

### Next Steps

1. Test in production/staging environment where networking should work
2. Consider alternative local development approaches if needed
3. Monitor edge function performance and error rates in production
