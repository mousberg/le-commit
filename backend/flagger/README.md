# Signal Evaluation System

A comprehensive background check system that evaluates CV and LinkedIn profiles for authenticity using AI-powered analysis via Groq.

## Overview

The system evaluates multiple signals across three categories:
- **LinkedIn Signals**: Profile authenticity, connection quality, engagement patterns
- **CV Signals**: Timeline consistency, verifiable claims, technical accuracy
- **Combined Signals**: Cross-platform consistency and verification

## Features

- ✅ **Parallel Processing**: Evaluates all signals simultaneously for maximum efficiency
- ✅ **AI-Powered Analysis**: Uses Groq's LLM for intelligent signal evaluation
- ✅ **Weighted Scoring**: Importance-based scoring system for accurate risk assessment
- ✅ **Risk Detection**: Automatically identifies high-risk signals
- ✅ **Type Safety**: Full TypeScript support with comprehensive interfaces

## Quick Start

### Prerequisites

1. Set up your Groq API key:
```bash
export GROQ_API_KEY="your-groq-api-key"
```

2. Install dependencies (already included in package.json):
```bash
npm install
```

### Basic Usage

```typescript
import { evaluateAllSignals, calculateOverallScore } from './evaluateSignals';
import { CvData, LinkedInData } from '../interfaces';

// Prepare your data
const context = {
  cvData: yourCvData,
  linkedinData: yourLinkedInData,
  additionalContext: {
    evaluationDate: new Date().toISOString(),
    evaluatorId: 'your-system-id'
  }
};

// Run evaluation
const results = await evaluateAllSignals(context);
const overallScore = calculateOverallScore(results);

console.log('Overall Score:', overallScore.weightedScore);
```

### Run the Example

```bash
# Run the test evaluation
npx ts-node backend/flagger/test-evaluation.ts
```

## Signal Categories

### LinkedIn Signals (9 signals)

| Signal | Description | Importance |
|--------|-------------|------------|
| `linkedin_identity_match` | Name consistency across platforms | 0.9 |
| `linkedin_job_history_match` | Job titles and dates match CV | 0.95 |
| `linkedin_education_match` | Education matches CV | 0.85 |
| `linkedin_company_verification` | Companies have real LinkedIn pages | 0.8 |
| `linkedin_account_age` | Account age is reasonable | 0.7 |
| `linkedin_connection_relevance` | Connections from claimed companies | 0.7 |
| `linkedin_connection_count` | Sufficient connections (30-50+) | 0.6 |
| `linkedin_recommendations_authenticity` | Genuine recommendations | 0.6 |
| `linkedin_engagement_activity` | Active profile (not ghost account) | 0.5 |

### CV Signals (9 signals)

| Signal | Description | Importance |
|--------|-------------|------------|
| `cv_timeline_consistency` | No overlapping jobs, chronological order | 0.9 |
| `cv_verifiable_claims` | OSS/patents/publications can be verified | 0.85 |
| `cv_technology_stack_plausibility` | Realistic tech combinations | 0.8 |
| `cv_contact_info_consistency` | Email matches other platforms | 0.8 |
| `cv_experience_depth` | Deep understanding of roles | 0.75 |
| `cv_project_specificity` | Specific technical details | 0.7 |
| `cv_skills_relevance` | Skills match experiences | 0.6 |
| `cv_grammar_consistency` | Consistent writing style | 0.5 |
| `cv_template_originality` | Original formatting | 0.4 |

### Combined Signals (3 signals)

| Signal | Description | Importance |
|--------|-------------|------------|
| `cross_platform_consistency` | Overall CV/LinkedIn consistency | 0.95 |
| `timeline_cross_verification` | Employment dates match | 0.9 |
| `contact_info_alignment` | Contact info consistent | 0.8 |

## API Reference

### Main Functions

#### `evaluateAllSignals(context, signals?)`
Evaluates all signals in parallel.

**Parameters:**
- `context: EvaluationContext` - Contains CV data, LinkedIn data, and additional context
- `signals?: Signal[]` - Optional array of specific signals to evaluate (defaults to ALL_SIGNALS)

**Returns:** `Promise<SignalEvaluationResult[]>`

#### `calculateOverallScore(results)`
Calculates overall authenticity scores.

**Parameters:**
- `results: SignalEvaluationResult[]` - Results from signal evaluation

**Returns:** Object with `overallScore`, `weightedScore`, and `summary`

#### `getHighRiskSignals(results, threshold?)`
Identifies signals that failed evaluation.

**Parameters:**
- `results: SignalEvaluationResult[]` - Results from signal evaluation
- `threshold?: number` - Score threshold for high risk (default: 0.3)

**Returns:** `SignalEvaluationResult[]` - Sorted by importance

### Interfaces

#### `EvaluationContext`
```typescript
interface EvaluationContext {
  cvData?: CvData;
  linkedinData?: LinkedInData;
  additionalContext?: Record<string, any>;
}
```

#### `SignalEvaluationResult`
```typescript
interface SignalEvaluationResult {
  signal: Signal;
  evaluation: SignalEvaluation;
  timestamp: Date;
}
```

## Scoring System

### Evaluation Scores
- **1.0**: Perfect - Signal completely passes
- **0.7-0.9**: Good - Minor concerns but generally authentic
- **0.4-0.6**: Moderate - Some red flags, requires attention
- **0.1-0.3**: Poor - Major concerns, likely inauthentic
- **0.0**: Failed - Signal completely fails or data unavailable

### Overall Scoring
- **Weighted Score**: Uses signal importance for accurate risk assessment
- **Average Score**: Simple average of all signal scores
- **Pass/Fail Counts**: Signals above 0.7 (pass) vs below 0.3 (fail)

## Error Handling

The system includes comprehensive error handling:
- Individual signal failures don't stop the entire evaluation
- Missing data is handled gracefully
- API errors are logged and return appropriate fallback scores
- JSON parsing errors are caught and handled

## Environment Variables

```bash
# Required
GROQ_API_KEY=your-groq-api-key

# Optional
GROQ_MODEL=llama-3.3-70b-versatile  # Default model
EVALUATION_TEMPERATURE=0.1           # Low for consistency
MAX_TOKENS=500                       # Response length limit
```

## Contributing

To add new signals:

1. Add the signal definition to `signals.ts`
2. Update the evaluation logic if needed
3. Test with the example evaluation
4. Update this documentation

## License

MIT License - see LICENSE file for details
