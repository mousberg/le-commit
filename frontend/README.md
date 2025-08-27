<p align="center">
  <img src="public/unmask-logo.svg" alt="le-commit" width="200" />
</p>

<h1 align="center">le-commit</h1>

<p align="center">
  Hackathon project frontend built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.
</p>

## Getting Started

```bash
npm install
npm run dev
```
or bun if you're in a rush

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

Copy `.env.example` to `.env.local` and configure the following variables:

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### ATS Integration
- `ASHBY_API_KEY` - Ashby ATS API key for candidate sync
- `MAX_AUTO_SYNC_CANDIDATES` - Maximum candidates to sync automatically (default: 500)

### Optional Variables
- `NEXT_PUBLIC_APP_ENV` - Application environment (development/production)
- `WEBHOOK_SECRET` - Secret for database trigger webhooks

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Radix UI primitives

## Team

le-commit