# Ashby Push Score API Documentation

## Overview

The `/api/ashby/push-score` endpoint allows you to send AI analysis scores from Unmask to Ashby custom fields using Ashby's `customField.setValue` API.

## Endpoint

**POST** `/api/ashby/push-score`

## Authentication

- Requires valid user authentication
- Rate limited to 20 requests per minute
- Requires `ASHBY_API_KEY` environment variable

## Request Body

```json
{
  "applicantId": "string",           // Optional: Unmask applicant ID (to get score from AI analysis)
  "scoreOverride": "number",         // Optional: Direct score for testing (0-100)
  "ashbyObjectType": "string",       // "Candidate" or "Application" (default: "Candidate")
  "ashbyObjectId": "string",         // Optional: Specific Ashby ID (auto-detected if not provided)
  "customFieldId": "string"          // Optional: Custom field name (default: "authenticity_confidence")
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `applicantId` | string | No* | - | Unmask applicant ID to retrieve AI analysis score and Ashby Candidate ID |
| `scoreOverride` | number | No* | - | Direct score value for testing (0-100). Requires `ashbyObjectId` |
| `ashbyObjectType` | string | No | "Candidate" | Ashby object type ("Candidate" for authenticity analysis) |
| `ashbyObjectId` | string | No** | - | Specific Ashby Candidate ID (auto-detected from database) |
| `customFieldId` | string | No | "authenticity_confidence" | Ashby custom field identifier |

*Either `applicantId` or `scoreOverride` must be provided.
**Required only when using `scoreOverride`. Auto-detected from database for Ashby-sourced applicants.

## Auto-Detection of Ashby Candidate ID

The endpoint automatically detects the Ashby Candidate ID from the database relationship:

### For Ashby-Sourced Applicants:
**Candidate ID**: Retrieved from `ashby_candidates.ashby_id`

### Database Query:
```sql
SELECT 
  ac.ashby_id                     -- Candidate ID for authenticity analysis
FROM ashby_candidates ac
JOIN applicants a ON a.id = ac.unmask_applicant_id
WHERE a.id = 'applicant-uuid' AND a.source = 'ashby'
```

### Why Candidate-Level?
Unmask's authenticity analysis evaluates the **person** (CV consistency, LinkedIn credibility, GitHub activity) rather than their fit for a specific application. The authenticity score applies to the candidate across all their job applications.

## Response

### Success Response (200)

```json
{
  "success": true,
  "message": "Score successfully pushed to Ashby",
  "data": {
    "applicantId": "uuid",
    "ashbyObjectType": "Candidate",
    "ashbyObjectId": "ashby-candidate-id",
    "customFieldId": "authenticity_confidence",
    "score": 85,
    "wasAutoDetected": true,
    "ashbyResponse": {}
  }
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "error": "Applicant ID is required (or scoreOverride for testing)",
  "success": false
}
```

#### 404 - Not Found
```json
{
  "error": "Applicant not found",
  "success": false
}
```

#### 500 - Server Error
```json
{
  "error": "Failed to set custom field in Ashby",
  "success": false,
  "ashbyError": {
    "message": "Field not found",
    "code": "field_not_found"
  }
}
```

## Usage Examples

### 1. Send Authenticity Score (Simplest - Recommended)

```javascript
const response = await fetch('/api/ashby/push-score', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-auth-token'
  },
  body: JSON.stringify({
    applicantId: 'unmask-applicant-uuid'
    // Everything else auto-detected!
    // - Ashby Candidate ID: automatically found
    // - Object Type: defaults to 'Candidate' for authenticity
    // - Score: from AI analysis data
  })
});

const result = await response.json();
console.log(`✅ Authenticity score ${result.data.score} sent to Ashby Candidate ${result.data.ashbyObjectId}`);
```

### 2. Custom Field Name

```javascript
const response = await fetch('/api/ashby/push-score', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-auth-token'
  },
  body: JSON.stringify({
    applicantId: 'unmask-applicant-uuid',
    customFieldId: 'credibility_score'  // Use different field name
  })
});
```

### 3. Manual Override (Testing Only)

```javascript
const response = await fetch('/api/ashby/push-score', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-auth-token'
  },
  body: JSON.stringify({
    scoreOverride: 78,                    // Test score
    ashbyObjectId: 'ashby-candidate-id', // Required for testing
    customFieldId: 'test_authenticity'
  })
});
```

### 5. Node.js Helper Function

```javascript
const pushScoreToAshby = async (applicantId, options = {}) => {
  try {
    const response = await fetch('https://your-domain.com/api/ashby/push-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        applicantId,
        ...options  // customFieldId, ashbyObjectId for testing, etc.
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      const { score, ashbyObjectId, ashbyObjectType, wasAutoDetected } = result.data;
      console.log(`✅ Score ${score} sent to Ashby ${ashbyObjectType} ${ashbyObjectId}`);
      console.log(`   Auto-detected: ${wasAutoDetected}`);
      return result.data;
    } else {
      console.error('❌ Failed to send score:', result.error);
      return null;
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
};

// Usage examples:
await pushScoreToAshby('applicant-123');  // Auto-detect everything (recommended)
await pushScoreToAshby('applicant-123', { customFieldId: 'credibility_score' });
await pushScoreToAshby('test-id', { scoreOverride: 85, ashbyObjectId: 'test-candidate' });
```

## Score Mapping

The AI analysis score is mapped as follows:

| Score Range | Interpretation |
|-------------|----------------|
| 90-100 | Highly credible, minimal concerns |
| 70-89 | Generally credible with minor concerns |
| 50-69 | Moderate concerns, requires attention |
| 30-49 | Significant red flags, requires investigation |
| 0-29 | High risk, major credibility issues |

## Ashby Custom Field Setup

Before using this endpoint, ensure your Ashby instance has the custom field configured for **Candidates**:

1. **Create Custom Field** in Ashby admin panel under **Candidate** settings
2. **Set Field Type** to "Number" 
3. **Configure Range** (suggested: 0-100)
4. **Note the Field ID** for the `customFieldId` parameter
5. **Apply to Candidates** (not Applications) since authenticity is person-level

### Suggested Custom Field Configuration

```json
{
  "name": "Authenticity Confidence",
  "id": "authenticity_confidence",
  "type": "Number",
  "range": {
    "min": 0,
    "max": 100
  },
  "description": "AI-generated authenticity score from Unmask analysis (person-level)",
  "applies_to": "Candidate"
}
```

## Testing

Use the provided test script:

```bash
# Make the test script executable
chmod +x frontend/test-push-score.js

# Run the test (ensure server is running)
node frontend/test-push-score.js
```

## Rate Limiting

- **20 requests per minute** per authenticated user
- Rate limit headers included in response
- Consider implementing exponential backoff for bulk operations

## Error Handling

The endpoint provides detailed error information:

- **400 errors**: Client-side issues (missing parameters, invalid data)
- **404 errors**: Resource not found (applicant or Ashby object)
- **500 errors**: Server-side issues (Ashby API errors, configuration problems)

Always check the `success` field in the response and handle errors appropriately.

## Environment Variables

Required environment variables:

```env
# Ashby API key with customField.setValue permissions
ASHBY_API_KEY=your_ashby_api_key

# Optional: Custom Ashby API base URL
ASHBY_BASE_URL=https://api.ashbyhq.com
```

## Security Considerations

- API key is stored server-side only
- All requests require user authentication
- Rate limiting prevents abuse
- Input validation prevents injection attacks
- Detailed logging for audit trails