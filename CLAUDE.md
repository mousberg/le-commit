# CLAUDE.md

Always use `pnpm` commands instead of `npm`. Everything except documentation lives in the `frontend` folder.

- We use a local supabase instance for development. The migrations are in `frontend/supabase/migrations`. Make sure to follow best practices. Some information on this can be found in `docs/context/supabase_prompts/`.

- Avoid unessecary endpoints if it can be solved with direct supabase client calls from the frontend. It should be safe with row level security.

- This is a Next.js, TypeScript, Tailwind CSS, and shadcn/ui project.

- When working with supabase, use the supabase CLI when appropriate, for example for creating migrations.

- Always offer to delete your test files at the end of a session

- If creating documentation, add it to `docs/`.

- General typescript code lives in `frontend/src/lib/`
- API routes live in `frontend/src/app/api/`
- React components live in `frontend/src/components/`
- Pages live in `frontend/src/app/`

- Make sure linting and building works before committing.

- Prefer `@` filepaths over relative paths.

## Environment Variables
- Next.js automatically loads environment variables from `.env.local`, `.env.production`, `.env.development`, and `.env` files
- Use `process.env.VARIABLE_NAME` directly in API routes and server-side code
- **Do NOT install dotenv** - Next.js handles this natively
- For client-side variables, prefix with `NEXT_PUBLIC_`

### Required Environment Variables
- `WEBHOOK_SECRET` - Secret for authenticating internal database trigger webhooks (default: `webhook-secret-dev` in development)
- `ASHBY_SCORE_FIELD_ID` - Ashby custom field ID for AI scores (has fallback default)

## Event-Driven Architecture & Database Patterns

This application uses an event-driven architecture with database triggers and webhooks for asynchronous processing. Key patterns:

## ATS Integration Patterns

- **Frontend ID Strategy**: All frontend components use `applicant_id` as the primary identifier for consistency
- **Backend ID Mapping**: APIs accept `applicant_id` and internally join to `ashby_candidates` table to get `ashby_id` when needed for external API calls
- **Separation of Concerns**: Frontend handles business logic with applicant entities, backend handles integration-specific identifiers
- **Reusable Utility**: Use `getAshbyIdFromApplicantId()` from `@/lib/ashby/utils` for consistent ashby_id lookups in APIs

## Response Style
- Don't be a sycophant in your responses. Avoid initial responses like "You're  absolutely right!" or "That's a great idea!".

## Code Style
- Comments should focus on the "why" of the code and not the what.
- Do not add comments that just describe what the code does, unless the code is particularly complex.
