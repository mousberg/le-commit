# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Unmask" (le-commit) is an AI-powered hiring verification platform that analyzes CVs, LinkedIn profiles, GitHub accounts, and conducts automated reference calls to verify candidate authenticity. Built for RAISE YOUR HACK 2025 hackathon (Vultr track).

## Development Commands

**Navigate to frontend directory first**: `cd frontend`

- Start development server: `npm run dev` (uses Turbopack)
- Build for production: `npm run build` 
- Start production server: `npm start`
- Run linting: `npm run lint`
- Run CV parsing tests: `npm run test:cv`
- Run evaluation tests: `npm run test:evaluation`

**Local Supabase (from frontend directory)**:
- Start local Supabase: `npx supabase start`
- Stop local Supabase: `npx supabase stop`
- Reset database: `npx supabase db reset`
- Generate TypeScript types: `npx supabase gen types typescript --local > src/lib/database.types.ts`

**Deployment**:
- Deploy to production: `./deploy.sh` (from root)
- Check deployment status: `./check-status.sh` 
- Emergency rollback: `./rollback.sh`

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Supabase (PostgreSQL), local file storage
- **AI/ML**: OpenAI GPT-4, Groq API, ElevenLabs for voice calls
- **Infrastructure**: Docker, Vultr VPS deployment
- **Analytics**: Google Tag Manager integration

### Key Application Flow
1. **Applicant Creation** (`/api/applicants`): Upload CV (required), LinkedIn PDF (optional), GitHub URL (optional)
2. **Parallel Processing**: CV parsing, LinkedIn analysis, GitHub repository analysis 
3. **AI Analysis** (`/lib/analysis.ts`): Comprehensive credibility scoring with flags and recommendations
4. **Reference Calling**: Automated calls via ElevenLabs + Twilio integration
5. **Dashboard Interface**: Real-time status tracking and results display

### Core Architecture Patterns

**State Management**: 
- `ApplicantContext` (`/src/lib/contexts/ApplicantContext.tsx`) provides centralized state for applicant data
- File-based data persistence during development (`/data/applicants/`)
- Supabase integration for production data storage

**API Design**:
- RESTful endpoints following Next.js App Router conventions
- Async processing with immediate response and background completion
- File upload handling with proper validation and storage

**Data Processing Pipeline**:
1. File upload → API endpoint validation
2. Background processing (CV parsing, GitHub analysis, LinkedIn processing)
3. AI-powered credibility analysis with multiple data sources
4. Real-time status updates via polling

### File Structure Conventions

```
/frontend/
├── src/app/          # Next.js App Router pages
│   ├── api/          # API routes
│   ├── board/        # Main dashboard interface  
│   └── call/         # Reference calling interface
├── src/components/   # Reusable UI components
├── src/lib/          # Business logic and utilities
│   ├── interfaces/   # TypeScript type definitions
│   ├── contexts/     # React context providers
│   └── simple_tests/ # Development test scripts
└── supabase/         # Local Supabase configuration
```

### Environment Variables Required

**AI Services**:
- `GROQ_API_KEY`: For fast CV/document analysis
- `OPENAI_API_KEY`: For advanced reasoning and summarization

**Reference Calling**:
- `ELEVENLABS_API_KEY`: Voice AI service
- `ELEVENLABS_AGENT_ID`: Configured conversation agent
- `ELEVENLABS_AGENT_PHONE_ID`: Phone number for outbound calls
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: Phone service integration

### Supabase Configuration

**Local Development**:
- API: `http://127.0.0.1:54321`
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio: `http://127.0.0.1:54323`
- Storage limit: 50MiB per file
- Auth configured for `localhost:3000`

**Database Guidelines** (from .cursor/rules):
- Functions use `SECURITY INVOKER` by default
- Always set `search_path = ''` and use fully qualified names
- Prefer `IMMUTABLE` or `STABLE` functions when possible
- Follow PostgreSQL 17 standards

### Key Components

**Applicant Management**:
- `ApplicantContext`: Centralized state management
- `/api/applicants/route.ts`: CRUD operations with async processing
- `NewApplicantForm`: File upload and applicant creation UI

**Analysis Engine**:
- `/lib/cv.ts`: PDF processing and data extraction
- `/lib/github.ts`: Repository analysis and activity tracking  
- `/lib/analysis.ts`: AI-powered credibility scoring
- Parallel processing for performance optimization

**Reference Calling**:
- ElevenLabs integration for natural conversation AI
- Real-time transcript processing and analysis
- `/api/reference-call` endpoint for call initiation

### Development Notes

- The codebase uses strict TypeScript with path aliases (`@/*` -> `./src/*`)
- File-based storage in development, Supabase in production
- Async processing prevents UI blocking during analysis
- Rate limiting and input validation on all API endpoints
- Docker multi-platform builds for ARM64 development and AMD64 production

### Deployment Architecture

**Production Stack**:
- Vultr VPS running Docker containers
- Vultr Container Registry for image storage
- Environment variables managed via `.env.local` on server
- Zero-downtime deployment with container replacement

**Monitoring**:
- Docker container health checks
- Application status verification via HTTP checks
- Log aggregation via `docker logs`

### Testing Strategy

- Simple test scripts in `/lib/simple_tests/` for CV and evaluation logic
- Manual testing workflows for AI analysis verification
- No formal test framework currently implemented

### Security Considerations

- API key validation and environment variable protection
- File type restrictions and size limits for uploads
- Input sanitization for all user-provided data
- Rate limiting on API endpoints to prevent abuse