# Manual Upload Flow

**Added:** January 26, 2025  
**Purpose:** Documents the manual CV upload and processing flow after removing database triggers

## Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI as NewApplicantForm
    participant Context as ApplicantContext
    participant Storage as Supabase Storage
    participant DB as Supabase DB
    participant API1 as /api/cv-process
    participant API2 as /api/linkedin-fetch
    participant API3 as /api/github-fetch
    participant API4 as /api/analysis

    User->>UI: Upload CV + LinkedIn/GitHub URLs
    UI->>Context: createApplicant(request)
    
    Context->>Storage: Upload CV file
    Storage-->>Context: Return file_id
    
    Context->>DB: Insert applicant record
    Note over DB: cv_status: 'pending'<br/>li_status: 'pending'<br/>gh_status: 'pending'<br/>ai_status: 'pending'
    DB-->>Context: Return applicant.id
    
    Note over Context: Automatic Processing Starts<br/>(Replaces database triggers)
    
    par CV Processing
        Context->>API1: POST /api/cv-process
        API1->>Storage: Download CV file
        API1->>API1: Extract CV data
        API1->>DB: Update cv_data, cv_status: 'ready'
    and LinkedIn Processing
        Context->>API2: POST /api/linkedin-fetch
        API2->>API2: Scrape LinkedIn data
        API2->>DB: Update li_data, li_status: 'ready'
    and GitHub Processing
        Context->>API3: POST /api/github-fetch
        API3->>API3: Fetch GitHub data
        API3->>DB: Update gh_data, gh_status: 'ready'
    end
    
    Note over Context: Wait 3 seconds for processing
    
    Context->>API4: POST /api/analysis
    API4->>DB: Get all applicant data
    API4->>API4: Perform AI analysis
    API4->>DB: Update analysis_result, ai_status: 'ready'
    
    DB->>UI: Real-time updates via subscription
    UI->>User: Show processing progress & results
```

## Key Points

- **No Database Triggers**: Processing is initiated directly from the client context
- **Automatic Processing**: All data sources are processed immediately after applicant creation
- **Error Handling**: Each API call has individual error handling and logging
- **Real-time Updates**: UI updates automatically via Supabase real-time subscriptions
- **Separation**: Manual uploads are completely separate from ATS candidate processing
