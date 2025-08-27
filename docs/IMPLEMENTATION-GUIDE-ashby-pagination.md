# Implementation Guide: Ashby Pagination Enhancement

## Key Constraint from Ashby API
**The Ashby API has a hard limit of 100 candidates per request.** To fetch 1000+ candidates, we must make multiple paginated API calls using the cursor parameter.

---

## Quick Fixes to Implement Now

### Fix 1: Increase Auto-Sync Limit (PRIORITY 1)
**File**: `/frontend/src/app/api/ashby/candidates/route.ts`  
**Line**: 229

**Current Code**:
```typescript
const response = await ashbyClient.listCandidates({
  limit: 10, // TODO: increase later
  includeArchived: false
});
```

**Fixed Code**:
```typescript
// Auto-sync up to 100 candidates (API maximum per request)
const response = await ashbyClient.listCandidates({
  limit: 100, // Increased to API maximum
  includeArchived: false
});
```

### Fix 2: Add Full Pagination to Auto-Sync (PRIORITY 2)
**File**: `/frontend/src/app/api/ashby/candidates/route.ts`  
**Lines**: 226-259

**Replace the simple fetch with paginated logic**:
```typescript
if (shouldAutoSync && apiKey) {
  // Perform auto-sync with pagination
  const ashbyClient = new AshbyClient({ apiKey });
  const autoSyncLimit = 500; // Reasonable default for auto-sync
  const allCandidates: Array<Record<string, unknown>> = [];
  let cursor: string | undefined;
  let totalFetched = 0;

  do {
    const response = await ashbyClient.listCandidates({
      limit: Math.min(100, autoSyncLimit - totalFetched),
      cursor,
      includeArchived: false
    });

    if (!response.success) break;

    const results = response.results as unknown as Record<string, unknown>;
    const candidatesList = results.results || results.candidates || results;
    const moreDataAvailable = results.moreDataAvailable;
    const nextCursor = results.nextCursor || results.cursor;

    if (Array.isArray(candidatesList)) {
      allCandidates.push(...candidatesList);
      totalFetched += candidatesList.length;
    }

    cursor = moreDataAvailable && nextCursor && totalFetched < autoSyncLimit 
      ? nextCursor as string 
      : undefined;

  } while (cursor);

  // Upsert all candidates
  if (allCandidates.length > 0) {
    const transformedCandidates = allCandidates.map(c =>
      transformAshbyCandidate(c, user.id)
    );

    const { error: upsertError } = await supabase
      .from('ashby_candidates')
      .upsert(transformedCandidates, {
        onConflict: 'user_id,ashby_id',
        ignoreDuplicates: false
      });

    if (!upsertError) {
      autoSynced = true;
      syncResults = {
        new_candidates: allCandidates.length,
        message: `Auto-synced ${allCandidates.length} candidates`
      };
    }
  }
}
```

### Fix 3: Add Pagination to Cron Job (PRIORITY 3)
**File**: `/frontend/src/app/api/cron/ashby-sync/route.ts`  
**Lines**: 66-80

**Replace simple fetch with paginated logic**:
```typescript
// Fetch candidates from Ashby with pagination
const cronSyncLimit = 500; // Reasonable limit for cron jobs
const allCandidates: Array<any> = [];
let cursor: string | undefined;
let totalFetched = 0;

do {
  const candidatesResponse = await ashbyClient.listCandidates({
    limit: Math.min(100, cronSyncLimit - totalFetched),
    cursor,
    includeArchived: false
  });

  if (!candidatesResponse.success) break;

  const results = candidatesResponse.results as any;
  const batch = results.results || results.candidates || [];
  const moreDataAvailable = results.moreDataAvailable;
  const nextCursor = results.nextCursor || results.cursor;

  if (Array.isArray(batch)) {
    allCandidates.push(...batch);
    totalFetched += batch.length;
  }

  cursor = moreDataAvailable && nextCursor && totalFetched < cronSyncLimit 
    ? nextCursor as string 
    : undefined;

} while (cursor);

// Process all candidates
for (const candidate of allCandidates) {
  // ... existing processing logic
}
```

### Fix 4: Add Progress Logging (PRIORITY 4)
Add console logging to track progress during large syncs:

```typescript
// In the pagination loop
console.log(`[Ashby Sync] Fetched batch: ${totalFetched}/${limit} candidates`);

// After completion
console.log(`[Ashby Sync] Completed: ${totalFetched} candidates in ${Date.now() - startTime}ms`);
```

---

## Testing Strategy

1. **Test with current implementation first**:
   - Set fetch limit to 100 in UI
   - Click "Refresh All"
   - Verify it fetches 100 candidates

2. **Test with increased limits**:
   - Set fetch limit to 200
   - Verify it makes 2 API calls (100 each)
   - Check for rate limiting issues

3. **Test auto-sync**:
   - Wait for auto-sync trigger
   - Verify it fetches more than 10 candidates

4. **Monitor performance**:
   - Time how long 500 candidates takes
   - Check database insert performance
   - Monitor memory usage

---

## Implementation Order

1. **Phase 1 - Immediate** (Today):
   - Fix auto-sync limit (10 → 100)
   - Add basic progress logging
   - Test with 100-200 candidates

2. **Phase 2 - Tomorrow**:
   - Add full pagination to auto-sync
   - Add pagination to cron job
   - Test with 500 candidates

3. **Phase 3 - Later**:
   - Add progress bar UI
   - Implement syncToken for delta syncs
   - Add configurable limits per user

---

## Important Notes

1. **Rate Limiting**: The Ashby API may rate limit us. Current code has exponential backoff (2s, 4s, 8s) which should handle this.

2. **Database Performance**: Bulk upserts of 1000+ candidates may be slow. Consider chunking into batches of 100.

3. **Timeout Risk**: Fetching 1000 candidates might take 30-60 seconds. Consider:
   - Background jobs for large syncs
   - WebSocket for progress updates
   - Allow cancellation

4. **syncToken**: The Ashby API supports `syncToken` for incremental syncs. This could significantly reduce API calls by only fetching changed candidates.

---

## Next Steps

1. Implement Fix 1 (change 10 to 100) - **5 minutes**
2. Test current implementation with higher limits - **10 minutes**
3. Implement full pagination in auto-sync - **30 minutes**
4. Add pagination to cron job - **20 minutes**
5. Add progress logging throughout - **10 minutes**

Total estimated time: **~1.5 hours for basic functionality**

---

*End of Implementation Guide*
