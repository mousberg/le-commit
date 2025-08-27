# AGENTS.md

## Build/Test/Lint Commands (use pnpm, not npm)
- **Dev**: `pnpm dev` (from frontend/)
- **Build**: `pnpm build` (from frontend/)
- **Lint**: `pnpm lint` (from frontend/)
- **Test**: `pnpm test` (watch mode) or `pnpm test:run` (single run) (from frontend/)
- **Single Test**: `pnpm test filename.test.ts` (from frontend/)
- **Supabase**: `pnpm supabase:start`, `pnpm supabase:types`, `pnpm supabase:sync` (from frontend/)

## Architecture
- **Next.js frontend** in frontend/ with App Router
- **Supabase PostgreSQL** with RLS, triggers, and real-time subscriptions
- **Event-driven architecture** using database triggers + webhooks to API routes
- **ATS integration** (Ashby) with candidate sync and AI scoring
- **AI processing** pipeline for CV analysis and credibility scoring

## Code Style
- **Imports**: Use `@/` alias for absolute imports, avoid relative paths
- **Naming**: camelCase variables/functions, PascalCase types/interfaces, kebab-case files
- **Types**: Full TypeScript with generated Supabase types, prefer interfaces over type aliases
- **Error handling**: Custom error classes, structured API responses with `{ success, error }`
- **Comments**: Focus on "why" not "what", avoid unnecessary explanations
