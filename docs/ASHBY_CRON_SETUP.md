# Ashby Daily Sync Cron Job Setup

## Overview

The Ashby integration now includes a consolidated API structure and daily sync capability to automatically fetch new candidates from Ashby without manual intervention.

## Consolidated API Endpoints

### Before Consolidation (Removed)
- `/api/ashby/candidates` ❌
- `/api/ashby/pull` ❌  
- `/api/ashby/test` ❌
- `/api/ashby/resume` ❌
- `/api/ashby/store-cv` ❌

### After Consolidation (Current)
- `/api/ashby/sync` - Unified sync endpoint
  - `GET` - Fetch and cache candidates
  - `POST` - Push verification results to Ashby
  - `PUT` - Batch sync completed verifications
- `/api/ashby/import` - Import cached candidates to applicants
- `/api/ashby/files` - File operations
  - `GET` - Get resume URL
  - `POST` - Download and store CV

## Cron Job Endpoint

**Endpoint:** `GET /api/cron/ashby-sync`

**Purpose:** Daily sync of Ashby candidates for all users

**Authentication:** Requires `CRON_SECRET` environment variable

## Setup Options

### 1. Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/ashby-sync",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 2. GitHub Actions

Create `.github/workflows/ashby-sync.yml`:

```yaml
name: Daily Ashby Sync
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Ashby Sync
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/ashby-sync" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

### 3. External Cron Service (cron-job.org, etc.)

- **URL:** `https://your-domain.com/api/cron/ashby-sync`
- **Method:** GET
- **Headers:** 
  - `Authorization: Bearer YOUR_CRON_SECRET`
  - `Content-Type: application/json`
- **Schedule:** Daily at 9 AM UTC (`0 9 * * *`)

## Environment Variables Required

```env
# Required for cron authentication
CRON_SECRET=your-secure-random-string

# Required for Ashby API
ASHBY_API_KEY=your-ashby-api-key
ASHBY_BASE_URL=https://api.ashbyhq.com

# Required for app URL (for internal API calls)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Manual Sync

For immediate syncing (bypass cron):

```bash
# Sync specific user's candidates
curl -X GET "https://your-domain.com/api/ashby/sync?force=true" \
  -H "Authorization: Bearer USER_TOKEN"

# Force refresh all candidates  
curl -X GET "https://your-domain.com/api/ashby/sync?force=true&limit=100" \
  -H "Authorization: Bearer USER_TOKEN"
```

## Monitoring

The cron endpoint returns detailed results:

```json
{
  "success": true,
  "message": "Daily sync completed for 5 users",
  "users_processed": 5,
  "successful_syncs": 4,
  "failed_syncs": 1,
  "total_candidates_synced": 23,
  "sync_results": [...],
  "timestamp": "2024-01-15T09:00:00.000Z"
}
```

## Data Flow

1. **Cron triggers** → `/api/cron/ashby-sync`
2. **For each user** → `/api/ashby/sync?force=true`
3. **Ashby API** → Fetch latest candidates
4. **Database** → Cache in `ashby_candidates` table
5. **ATS Page** → Display cached data from `applicants` table (after import)

## Troubleshooting

### Empty Candidates on ATS Page

The ATS page shows candidates from the `applicants` table, not `ashby_candidates`. 

**Solution:** Import cached candidates:
```bash
curl -X POST "https://your-domain.com/api/ashby/import" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"ashbyIds": ["candidate-id-1", "candidate-id-2"]}'
```

### Sync Failures

Check logs for:
- Invalid `ASHBY_API_KEY`
- Missing `CRON_SECRET`
- Network connectivity issues
- Rate limiting from Ashby API

### Testing

```bash
# Test cron endpoint
curl -X GET "http://localhost:3000/api/cron/ashby-sync" \
  -H "Authorization: Bearer your-cron-secret"

# Test consolidated sync
curl -X GET "http://localhost:3000/api/ashby/sync?limit=5&force=true" \
  -H "Authorization: Bearer user-token"
```