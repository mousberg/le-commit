# CLAUDE.md

Always use `pnpm` commands instead of `npm`. Everything except documentation lives in the `frontend` folder.

- We use a local supabase instance for development. The migrations are in `frontend/supabase/migrations`. Make sure to follow best practices. Some information on this can be found in `docs/context/supabase_prompts/`.

- This is a Next.js, TypeScript, Tailwind CSS, and shadcn/ui project.

- When working with supabase, use the supabase CLI when appropriate, for example for creating migrations.

- Always offer to delete your test files at the end of a session

- If creating documentation, add it to `docs/`.

- General typescript code lives in `frontend/src/lib/`
- API routes live in `frontend/src/app/api/`
- React components live in `frontend/src/components/`
- Pages live in `frontend/src/app/`

## Event-Driven Architecture & Database Patterns

This application uses an event-driven architecture with database triggers and webhooks for asynchronous processing. Key patterns:
