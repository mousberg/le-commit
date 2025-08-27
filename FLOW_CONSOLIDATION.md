# Flow Consolidation Fix

## Problem Solved
Fixed the race condition where two different flows were triggering simultaneously when the ATS page loaded:

1. **Auto-sync flow (GET /api/ashby/candidates)** - triggered on page load
2. **Manual refresh flow (POST /api/ashby/candidates)** - somehow also triggering on page load

This caused:
- "Unexpected end of JSON input" errors
- Concurrent CV processing requests
- Race conditions between the two flows

## Solution
**Consolidated both flows into a single GET endpoint with query parameters:**

### Backend Changes
- **Removed** the entire POST handler from `/api/ashby/candidates/route.ts`
- **Enhanced** the GET handler to accept query parameters:
  - `?refresh=true` - Forces a manual refresh
  - `?limit=N` - Sets the candidate fetch limit for manual refresh
- **Unified logging** with dynamic `syncType` (`AshbySync` vs `AshbyManualSync`)
- **Same queue system** applies to both auto-sync and manual refresh

### Frontend Changes  
- **Updated** `handleRefresh()` in `frontend/src/app/board/ats/page.tsx`
- **Changed** from `POST /api/ashby/candidates` to `GET /api/ashby/candidates?refresh=true&limit=${fetchLimit}`
- **Simplified** data handling - no need for separate fetch after refresh

## Benefits
1. **No more race conditions** - only one endpoint can be called
2. **Consistent behavior** - same queue system for both auto and manual sync
3. **Better debugging** - unified logging with clear sync type identification
4. **Simplified architecture** - one endpoint, one flow, easier to maintain

## Technical Details
```typescript
// Before: Two separate endpoints
GET /api/ashby/candidates     // Auto-sync
POST /api/ashby/candidates    // Manual refresh

// After: One endpoint with parameters  
GET /api/ashby/candidates                 // Auto-sync (default)
GET /api/ashby/candidates?refresh=true    // Manual refresh
```

The queue system (sequential processing with 3-second delays) now applies consistently to both scenarios, ensuring no concurrent overload regardless of how the sync is triggered.
