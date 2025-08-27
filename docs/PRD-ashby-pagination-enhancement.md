# Product Requirements Document: Ashby Pagination Enhancement

## Document Information
- **Date**: December 2024
- **Feature**: Enhanced Ashby Candidate Pagination
- **Branch**: feature/ashby-pagination-enhancement
- **Priority**: High
- **Status**: In Development

---

## Executive Summary

This PRD outlines the enhancement of the Ashby integration to support fetching and processing up to 1000+ candidates efficiently, replacing the current limitation of smaller batch sizes. This improvement will enable users to perform comprehensive candidate data syncs from Ashby to the Unmask platform.

---

## Problem Statement

### Current Situation
- The ATS (Applicant Tracking System) integration with Ashby currently has pagination capabilities but with practical limitations
- Users need to fetch larger volumes of candidates for comprehensive analysis
- The auto-sync feature is limited to 10 candidates (line 229 in candidates/route.ts)
- While the manual refresh supports configurable limits up to 1000, there may be performance and rate limiting concerns

### User Pain Points
1. **Limited Data Sync**: Auto-sync only fetches 10 candidates, requiring manual refreshes for comprehensive data
2. **Time Consuming**: Multiple manual refreshes needed to get all candidate data
3. **Incomplete Analysis**: Without all candidates loaded, users can't get a complete picture of their talent pipeline
4. **Inefficient Workflow**: Users must repeatedly adjust limits and refresh to get desired data volume

---

## Goals & Success Metrics

### Primary Goals
1. Enable fetching of 1000+ candidates in a single operation
2. Maintain system stability and performance during large data syncs
3. Provide clear progress indication during long-running sync operations
4. Handle rate limiting gracefully without losing data

### Success Metrics
- **Data Volume**: Successfully fetch and process 1000+ candidates in a single sync
- **Performance**: Complete 1000 candidate sync within 60 seconds
- **Reliability**: 99% success rate for sync operations
- **User Satisfaction**: Reduce manual refresh actions by 90%

---

## User Stories

### As a Hiring Manager
- **I want to** sync all candidates from my Ashby ATS in one operation
- **So that** I can analyze the complete talent pipeline without multiple manual refreshes
- **Acceptance Criteria**:
  - Can select 1000+ candidates from the UI
  - See real-time progress during sync
  - Receive clear feedback when sync completes

### As a Recruiter
- **I want to** automatically sync all new candidates hourly
- **So that** my Unmask dashboard always reflects the current state of Ashby
- **Acceptance Criteria**:
  - Auto-sync fetches all new/updated candidates
  - No manual intervention required for regular updates
  - System handles large candidate volumes efficiently

### As a System Administrator
- **I want to** ensure the system remains stable during large data syncs
- **So that** other users aren't impacted by heavy sync operations
- **Acceptance Criteria**:
  - Rate limiting prevents API throttling
  - Database operations are optimized for bulk inserts
  - Error handling prevents data loss

---

## Technical Requirements

### Current Implementation Analysis

#### Existing Pagination Logic
```typescript
// Current implementation in /api/ashby/candidates/route.ts
do {
  const response = await ashbyClient.listCandidates({
    limit: Math.min(100, limit - totalFetched),
    cursor,
    includeArchived: false
  });
  // ... process batch
  cursor = moreDataAvailable && nextCursor && totalFetched < maxCandidates 
    ? nextCursor as string 
    : undefined;
} while (cursor);
```

#### Current Limitations
1. **Auto-sync hardcoded to 10**: Line 229 limits auto-sync to 10 candidates
2. **Rate limiting concerns**: No progressive backoff for large volumes
3. **UI feedback**: Limited progress indication during long syncs
4. **Database operations**: Bulk upserts may timeout with very large datasets

### Proposed Enhancements

#### 1. Progressive Pagination Strategy
```typescript
interface PaginationConfig {
  initialBatchSize: number;  // Start with 100
  maxBatchSize: number;      // Maximum 500 per batch
  totalLimit: number;        // User-defined limit (up to 10000)
  backoffMultiplier: number; // Rate limit backoff
}
```

#### 2. Chunked Database Operations
- Split large candidate arrays into chunks of 100 for database operations
- Use database transactions for consistency
- Implement retry logic for failed chunks

#### 3. Real-time Progress Updates
- WebSocket or Server-Sent Events for progress updates
- Show: current/total candidates, estimated time remaining
- Allow cancellation of in-progress syncs

#### 4. Smart Auto-sync
- Dynamically adjust auto-sync limits based on recent activity
- Use delta syncing (only fetch updated candidates since last sync)
- Implement intelligent scheduling based on usage patterns

---

## Implementation Plan

### Phase 1: Core Pagination Enhancement (Week 1)
1. **Update Auto-sync Limit**
   - Remove hardcoded limit of 10 candidates
   - Make auto-sync limit configurable per user
   - Default to 100 candidates for auto-sync

2. **Optimize Pagination Logic**
   - Implement progressive batch sizing
   - Add comprehensive error handling
   - Improve cursor management

3. **Database Optimization**
   - Implement chunked upsert operations
   - Add database indices for performance
   - Optimize query patterns

### Phase 2: Progress & Monitoring (Week 2)
1. **Progress Indication**
   - Add progress bar to UI
   - Implement WebSocket for real-time updates
   - Show detailed sync statistics

2. **Rate Limit Management**
   - Implement exponential backoff
   - Add rate limit detection and handling
   - Queue system for multiple sync requests

3. **Error Recovery**
   - Retry failed batches automatically
   - Maintain sync state for resume capability
   - Detailed error reporting

### Phase 3: Advanced Features (Week 3)
1. **Delta Syncing**
   - Track last sync timestamp
   - Fetch only updated candidates
   - Reduce API calls and processing time

2. **Bulk Operations UI**
   - Select multiple candidates for operations
   - Bulk scoring and analysis
   - Export large datasets efficiently

3. **Performance Monitoring**
   - Track sync performance metrics
   - Alert on sync failures
   - Dashboard for sync health

---

## UI/UX Specifications

### Current UI
- Number input for fetch limit (1-1000)
- Single "Refresh All" button
- No progress indication during sync

### Enhanced UI Mockup
```
┌──────────────────────────────────────────────────────┐
│ ATS Integration                                      │
├──────────────────────────────────────────────────────┤
│ Sync Settings:                                       │
│ ┌─────────────────────────────────────┐             │
│ │ Fetch Limit: [1000    ] ▼           │             │
│ │ □ Auto-sync enabled (every hour)    │             │
│ │ Last sync: 10 minutes ago           │             │
│ └─────────────────────────────────────┘             │
│                                                      │
│ [Sync Now] [Cancel]                                  │
│                                                      │
│ Progress: ████████░░░░░░░░ 450/1000 candidates      │
│ Estimated time remaining: 45 seconds                 │
│                                                      │
│ Recent Sync History:                                 │
│ • 2:30 PM - Synced 523 candidates (45s)             │
│ • 1:30 PM - Auto-sync 100 candidates (8s)          │
│ • 12:30 PM - Auto-sync 100 candidates (7s)         │
└──────────────────────────────────────────────────────┘
```

### Key UI Improvements
1. **Preset Options**: Quick select for common limits (100, 500, 1000, All)
2. **Progress Bar**: Visual indication with candidate count
3. **Sync History**: Recent sync operations with stats
4. **Auto-sync Toggle**: Easy enable/disable with configuration
5. **Cancel Option**: Ability to stop long-running syncs

---

## API Specifications

### Endpoint Modifications

#### POST /api/ashby/candidates
```typescript
interface RefreshRequest {
  limit?: number;           // Max candidates to fetch (default: 100, max: 10000)
  includeArchived?: boolean; // Include archived candidates
  deltaSync?: boolean;       // Only fetch updated since last sync
  progressCallback?: string; // WebSocket channel for progress updates
}

interface RefreshResponse {
  success: boolean;
  candidatesSynced: number;
  totalCandidates: number;
  syncDuration: number;
  errors?: SyncError[];
}
```

#### GET /api/ashby/sync-status
```typescript
interface SyncStatusResponse {
  isRunning: boolean;
  progress: number;        // 0-100
  candidatesProcessed: number;
  totalCandidates: number;
  estimatedTimeRemaining: number; // seconds
  errors: SyncError[];
}
```

---

## Database Schema Updates

### New Tables/Columns

```sql
-- Add sync tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  ashby_auto_sync_limit INTEGER DEFAULT 100,
  ashby_last_full_sync TIMESTAMP,
  ashby_last_delta_sync TIMESTAMP,
  ashby_sync_preferences JSONB DEFAULT '{}';

-- Create sync history table
CREATE TABLE IF NOT EXISTS ashby_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'manual', 'auto', 'delta'
  candidates_synced INTEGER NOT NULL,
  sync_duration INTEGER NOT NULL, -- milliseconds
  errors JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indices for performance
CREATE INDEX idx_ashby_candidates_updated_at ON ashby_candidates(ashby_updated_at);
CREATE INDEX idx_ashby_sync_history_user_created ON ashby_sync_history(user_id, created_at DESC);
```

---

## Testing Requirements

### Unit Tests
- Pagination logic with various limits
- Error handling for API failures
- Database chunking operations
- Rate limit detection and backoff

### Integration Tests
- End-to-end sync of 1000+ candidates
- Concurrent sync operationsdev
- Network failure recovery
- Database transaction rollback

### Performance Tests
- Load test with 10,000 candidates
- Concurrent user sync operations
- Database query optimization validation
- Memory usage during large syncs

### User Acceptance Tests
- Sync 1000 candidates successfully
- Cancel and resume sync operations
- Auto-sync performs as configured
- Progress updates display correctly

---

## Security Considerations

1. **API Key Protection**: Ensure API keys remain encrypted
2. **Rate Limiting**: Implement per-user rate limits
3. **Data Validation**: Sanitize all Ashby data before storage
4. **Access Control**: Verify user permissions for bulk operations
5. **Audit Logging**: Track all sync operations for compliance

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Ashby API rate limits | High | High | Implement intelligent backoff and queuing |
| Database performance degradation | Medium | High | Use chunked operations and optimize queries |
| Long sync times frustrate users | Medium | Medium | Add progress indication and allow cancellation |
| Data consistency issues | Low | High | Use transactions and implement rollback |
| Memory exhaustion with large datasets | Low | High | Stream processing instead of loading all in memory |

---

## Success Criteria

### Launch Criteria
- [ ] Successfully sync 1000+ candidates without errors
- [ ] All unit and integration tests pass
- [ ] Performance benchmarks met (< 60s for 1000 candidates)
- [ ] No regression in existing functionality
- [ ] Documentation updated

### Post-Launch Success Metrics (30 days)
- 90% reduction in manual refresh operations
- 95% sync success rate
- Average sync time < 45 seconds for 1000 candidates
- Zero data loss incidents
- User satisfaction score > 4.5/5

---

## Timeline & Milestones

| Milestone | Target Date | Description |
|-----------|------------|-------------|
| Development Start | Week 1 | Begin implementation of Phase 1 |
| Phase 1 Complete | End of Week 1 | Core pagination working with 1000+ candidates |
| Phase 2 Complete | End of Week 2 | Progress indication and monitoring added |
| Testing Complete | Mid Week 3 | All tests passing, performance validated |
| Documentation | End of Week 3 | User and technical documentation complete |
| Production Release | Week 4 | Feature released to all users |

---

## Open Questions

1. Should we implement a hard limit on the number of candidates that can be synced at once?
2. What should happen to candidates that are removed from Ashby? Soft delete or hard delete in our system?
3. Should auto-sync limits be different from manual sync limits?
4. Do we need to implement webhook support for real-time updates from Ashby?
5. Should we cache Ashby data for faster subsequent loads?

---

## Appendix

### Current Code References
- `/frontend/src/app/api/ashby/candidates/route.ts` - Main sync logic
- `/frontend/src/app/board/ats/page.tsx` - UI component
- `/frontend/src/lib/ashby/client.ts` - Ashby API client
- `/frontend/src/app/api/cron/ashby-sync/route.ts` - Auto-sync cron job

### Related Documentation
- [Ashby API Documentation](https://developers.ashbyhq.com/)
- [Database Patterns Guide](/docs/database-patterns.md)
- [Architecture Overview](/docs/architecture.md)

---

*End of Document*
