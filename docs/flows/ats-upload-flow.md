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
    UI->>UI: Set fetch limit (default: 50, max: 1000)
    UI->>DB: Fetch ashby_candidates with limit
    DB-->>UI: Return candidates with processing status
    
    Note over UI: User sees candidates with filter tabs:<br/>All | Processable | Ready
    
    User->>UI: Select candidates + Click "Process Selected"
    
    Note over UI: Phase 1: Data Collection
    
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
    
    par Data Processing (Parallel)
        loop CV Processing
            UI->>ProcessAPI: POST /api/cv-process
            ProcessAPI->>Storage: Download CV
            ProcessAPI->>ProcessAPI: Extract CV data
            ProcessAPI->>DB: Update cv_data, cv_status: 'ready'
        end
        and LinkedIn Processing
            loop LinkedIn Processing
                UI->>ProcessAPI: POST /api/linkedin-fetch
                ProcessAPI->>ProcessAPI: Scrape LinkedIn
                ProcessAPI->>DB: Update li_data, li_status: 'ready'
            end
        and GitHub Processing
            loop GitHub Processing
                UI->>ProcessAPI: POST /api/github-fetch
                ProcessAPI->>ProcessAPI: Fetch GitHub data
                ProcessAPI->>DB: Update gh_data, gh_status: 'ready'
            end
    end
    
    Note over UI: Wait for data processing completion<br/>before starting AI analysis
    
    Note over UI: Phase 2: AI Analysis (Sequential)
    
    loop For each candidate (Sequential processing)
        UI->>UI: Update status to 'Processing'
        UI->>ProcessAPI: POST /api/analysis
        ProcessAPI->>DB: Get all candidate data
        ProcessAPI->>ProcessAPI: Perform AI analysis
        ProcessAPI->>DB: Update ai_data, ai_status: 'ready'<br/>Update score field with analysis score
        UI->>UI: Update candidate to 'Analyzed' with real score
        Note over UI: Real-time status update<br/>without page refresh
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
- **Sequential Processing**: Data collection (parallel) → AI analysis (sequential)
- **Batch Processing**: Multiple candidates can be processed simultaneously for data collection
- **Real-time UI Updates**: Individual candidate status updates without page refresh
- **Filter Tabs**: UI shows candidates by processing state (All/Processable/Ready)
- **Configurable Fetch Limit**: User can specify how many candidates to fetch from Ashby
- **CV Download**: ATS candidates' CVs are downloaded from Ashby on-demand
- **Score Persistence**: Analysis scores persist in database and across page refreshes
- **No Auto-Push**: Scores are only pushed to Ashby when user explicitly chooses
- **Status Tracking**: Each processing step updates specific status fields

## Recent Improvements (January 2025)

- **Fixed Double-Click Issue**: Resolved issue where AI analysis required two clicks to start
- **Sequential AI Processing**: AI analysis now runs sequentially after data collection completes
- **Eliminated Dashboard Flickering**: Individual candidate updates instead of full page refresh
- **Local State Tracking**: Prevents stale prop issues during batch processing
- **Functional State Updates**: Prevents React batching race conditions
- **Improved Status Progression**: Smooth transitions from "Not Processed" → "Processing" → "Analyzed"
- **Score Database Persistence**: AI analysis scores persist across page refreshes
