# ATS Upload Flow

**Added:** August 23, 2025 - Henry Allen  
**Purpose:** Documents the ATS candidate CV download and manual processing flow

## Flow Diagram

```mermaid
sequenceDiagram
    participant Cron as Ashby Sync Cron
    participant AshbyAPI as Ashby API
    participant DB as Supabase DB
    participant User
    participant UI as ATSCandidatesTable
    participant FileAPI as /api/ashby/files
    participant Storage as Supabase Storage
    participant ProcessAPI as Processing APIs

    Note over Cron: Scheduled sync every 15 minutes
    
    Cron->>AshbyAPI: Fetch candidates
    AshbyAPI-->>Cron: Return candidate list
    
    Cron->>DB: Upsert ashby_candidates
    Note over DB: Includes resume_file_handle<br/>if candidate has CV
    
    User->>UI: Navigate to ATS tab
    UI->>DB: Fetch ashby_candidates
    DB-->>UI: Return candidates with processing status
    
    Note over UI: User sees candidates with filter tabs:<br/>All | Processable | Ready
    
    User->>UI: Select candidates + Click "Process Selected"
    
    loop For each selected candidate with CV
        UI->>FileAPI: POST /api/ashby/files
        Note over FileAPI: Download CV from Ashby
        FileAPI->>AshbyAPI: Get resume download URL
        AshbyAPI-->>FileAPI: Return download URL
        FileAPI->>FileAPI: Download CV file
        FileAPI->>Storage: Store CV in Supabase Storage
        FileAPI->>DB: Create file record + Update applicant
        Note over DB: cv_file_id: file.id<br/>cv_status: 'pending'
    end
    
    loop For each candidate needing processing
        par CV Processing
            UI->>ProcessAPI: POST /api/cv-process
            ProcessAPI->>Storage: Download CV
            ProcessAPI->>ProcessAPI: Extract CV data
            ProcessAPI->>DB: Update cv_data, cv_status: 'ready'
        and LinkedIn Processing
            UI->>ProcessAPI: POST /api/linkedin-fetch
            ProcessAPI->>ProcessAPI: Scrape LinkedIn
            ProcessAPI->>DB: Update li_data, li_status: 'ready'
        and GitHub Processing
            UI->>ProcessAPI: POST /api/github-fetch
            ProcessAPI->>ProcessAPI: Fetch GitHub data
            ProcessAPI->>DB: Update gh_data, gh_status: 'ready'
        end
    end
    
    loop For each fully processed candidate
        UI->>ProcessAPI: POST /api/analysis
        ProcessAPI->>DB: Get all candidate data
        ProcessAPI->>ProcessAPI: Perform AI analysis
        ProcessAPI->>DB: Update analysis_result, ai_status: 'ready'
    end
    
    Note over UI: Candidates move to "Ready" filter<br/>Available for Ashby push
    
    User->>UI: Select ready candidates + Click "Push to Ashby"
    UI->>ProcessAPI: POST /api/ashby/push-score
    ProcessAPI->>AshbyAPI: Push scores to Ashby
    AshbyAPI-->>ProcessAPI: Confirm success
    ProcessAPI->>DB: Update ashby_sync_status: 'synced'
```

## Key Points

- **Manual Control**: All processing is user-initiated via "Process Selected" button
- **Batch Processing**: Multiple candidates can be processed simultaneously
- **Filter Tabs**: UI shows candidates by processing state (All/Processable/Ready)
- **CV Download**: ATS candidates' CVs are downloaded from Ashby on-demand
- **No Auto-Push**: Scores are only pushed to Ashby when user explicitly chooses
- **Status Tracking**: Each processing step updates specific status fields
