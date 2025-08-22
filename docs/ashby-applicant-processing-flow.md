# Ashby Applicant Processing Flow

## System Architecture Overview

```mermaid
flowchart TD
    A[Ashby API Sync] --> B[Create Applicant Record]
    B --> C[Calculate Base Score]
    C --> D{Score-Based Filter}
    
    D -->|Score >= 30| E[Eligible for Processing]
    D -->|Score < 30| F[Mark as Skipped]
    
    E --> G[Data Processing Triggers]
    F --> H[Set All Statuses to 'skipped']
    
    G --> I[CV Processing Trigger]
    G --> J[LinkedIn Processing Trigger] 
    G --> K[GitHub Processing Trigger]
    
    I --> L{Has CV File?}
    J --> M{Has LinkedIn URL?}
    K --> N{Has GitHub URL?}
    
    L -->|Yes| O[Fire CV Webhook]
    L -->|No| P[cv_status = 'not_provided']
    
    M -->|Yes| Q[Fire LinkedIn Webhook]
    M -->|No| R[li_status = 'not_provided']
    
    N -->|Yes| S[Fire GitHub Webhook]
    N -->|No| T[gh_status = 'not_provided']
    
    O --> U[cv_status = 'processing']
    Q --> V[li_status = 'processing']
    S --> W[gh_status = 'processing']
    
    U --> X[External API Processing]
    V --> Y[External API Processing]
    W --> Z[External API Processing]
    
    X --> AA[cv_status = 'ready']
    Y --> BB[li_status = 'ready']  
    Z --> CC[gh_status = 'ready']
    
    AA --> DD[AI Analysis Trigger]
    BB --> DD
    CC --> DD
    P --> DD
    R --> DD
    T --> DD
    
    DD --> EE{All Data Sources Final?}
    EE -->|Yes + Has Data| FF[Fire AI Analysis Webhook]
    EE -->|No| GG[Wait for More Data]
    EE -->|Yes + No Data| HH[ai_status = 'not_provided']
    
    FF --> II[AI Analysis Complete]
    II --> JJ[Update Score & Notes]
    
    JJ --> KK[Ashby Sync Triggers]
    KK --> LL[Score Push Webhook]
    KK --> MM[Note Push Webhook]
    
    H --> NN[overall_status = 'completed']
    II --> OO[overall_status = 'completed']
    
    style D fill:#ff9999
    style F fill:#ffcccc
    style E fill:#ccffcc
```

## Trigger System Detail

### Data Processing Triggers (Score-Based Filtering)

```mermaid
flowchart TD
    A[Applicant Insert/Update] --> B[webhook_cv_trigger]
    A --> C[webhook_linkedin_trigger]
    A --> D[webhook_github_trigger] 
    A --> E[webhook_ai_trigger]
    
    B --> F{Source != 'ashby' OR Score >= 30?}
    C --> G{Source != 'ashby' OR Score >= 30?}
    D --> H{Source != 'ashby' OR Score >= 30?}
    E --> I{Source != 'ashby' OR Score >= 30?}
    
    F -->|Yes| J[Process CV]
    F -->|No + Ashby + Score < 30| K[cv_status = 'skipped']
    
    G -->|Yes| L[Process LinkedIn]
    G -->|No + Ashby + Score < 30| M[li_status = 'skipped']
    
    H -->|Yes| N[Process GitHub]  
    H -->|No + Ashby + Score < 30| O[gh_status = 'skipped']
    
    I -->|Yes| P[Process AI Analysis]
    I -->|No + Ashby + Score < 30| Q[ai_status = 'skipped']
    
    style K fill:#ffcccc
    style M fill:#ffcccc
    style O fill:#ffcccc
    style Q fill:#ffcccc
```

### Ashby Integration Triggers (Webhook Queue)

```mermaid
flowchart TD
    A[Score Updated] --> B[unified_ashby_score_trigger]
    C[Notes Updated] --> D[unified_ashby_note_trigger]
    
    B --> E{Score Change Significant?}
    D --> F{Notes Changed?}
    
    E -->|Yes| G[Queue Score Push Webhook]
    F -->|Yes| H[Queue Note Push Webhook]
    
    G --> I[webhook_queue Table]
    H --> I
    
    I --> J[pg_cron Job Every 2min]
    J --> K[/api/webhooks/process-queue]
    K --> L[Batch Process Queue]
    
    L --> M[Push Score to Ashby]
    L --> N[Push Note to Ashby]
    
    style G fill:#cceeff
    style H fill:#cceeff
```

## Current Issue Analysis

### Expected Behavior:
1. Ashby candidates with score < 30 should have statuses set to `'skipped'` by data processing triggers
2. Only candidates with score >= 30 should have `'pending'` → `'processing'` → `'ready'` flow

### Actual Behavior (Current):
- All candidates stuck at `'pending'` regardless of score
- No candidates showing `'skipped'` status
- Score-based filtering not working

### Potential Problems:

```mermaid
flowchart TD
    A[Problem Root Causes] --> B[Score Not Set When Triggers Fire]
    A --> C[Trigger Order Issues]
    A --> D[Trigger Function Logic Bug]
    A --> E[Migration Application Issues]
    
    B --> F[Score calculated after triggers fire]
    C --> G[Multiple triggers conflicting]  
    D --> H[Conditional logic not working]
    E --> I[Old trigger functions not updated]
    
    style A fill:#ff9999
```

## Debug Steps Needed:

1. **Check trigger execution order**: Are scores available when data processing triggers fire?
2. **Verify trigger function code**: Are the updated functions with score filtering actually deployed?
3. **Test trigger logic**: Do the conditional statements work correctly?
4. **Check migration status**: Were all function updates applied successfully?
