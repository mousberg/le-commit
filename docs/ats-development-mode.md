# ATS Development Mode Configuration

This document explains how the ATS (Applicant Tracking System) integration works in development mode and how to configure it properly.

## Overview

The ATS integration with Ashby can be configured to work in development mode using environment variables, allowing developers to test the functionality without requiring each developer to have their own Ashby API key in the database.

## Environment Variables

### Required Variables

1. **`ASHBY_API_KEY`** - The Ashby API key for development testing
2. **`NEXT_PUBLIC_APP_ENV`** - Controls whether the app runs in development or production mode

### Configuration

In your `.env.local` file:

```bash
# Ashby Configuration
ASHBY_API_KEY=your_ashby_api_key_here
ASHBY_BASE_URL=https://api.ashbyhq.com

# App Environment (controls ATS access behavior)
NEXT_PUBLIC_APP_ENV=development
```

## How It Works

### Development Mode (`NEXT_PUBLIC_APP_ENV=development`)

When `NEXT_PUBLIC_APP_ENV` is set to `development`:

1. **Server-side Access Check**: The `checkUserAshbyAccess()` function returns `true` immediately if `ASHBY_API_KEY` is present
2. **API Key Resolution**: The `getAshbyApiKey()` function returns the environment variable instead of looking up the user's database record
3. **Client-side Access**: The `useAshbyAccess()` hook will grant access when calling the candidates API

### Production Mode (`NEXT_PUBLIC_APP_ENV=production` or unset)

When `NEXT_PUBLIC_APP_ENV` is set to `production` or not set at all:

1. **Database Lookup**: The system requires users to have a valid `ashby_api_key` in their database record
2. **User-specific Access**: Each user must have their own Ashby integration configured
3. **No Environment Override**: The `ASHBY_API_KEY` environment variable is ignored

## Code Implementation

### Server-side Functions (`/src/lib/ashby/server.ts`)

```typescript
export async function checkUserAshbyAccess(userId: string): Promise<boolean> {
  // In development mode with ASHBY_API_KEY env var, always return true
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'production';
  if (appEnv === 'development' && process.env.ASHBY_API_KEY) {
    return true;
  }
  
  // Otherwise, check user's database record
  // ... database lookup logic
}

export function getAshbyApiKey(userApiKey?: string | null): string | null {
  // In development mode, prioritize environment variable
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'production';  
  if (appEnv === 'development' && process.env.ASHBY_API_KEY) {
    return process.env.ASHBY_API_KEY;
  }
  
  // Otherwise, use user's API key from database
  return userApiKey || null;
}
```

### Client-side Hook (`/src/lib/ashby/config.ts`)

The `useAshbyAccess()` hook makes an API call to `/api/ashby/candidates?limit=1` to check access. The server-side middleware will handle the development mode logic.

## Important Notes

### Why `NEXT_PUBLIC_APP_ENV` instead of `NODE_ENV`?

- `NODE_ENV` is automatically set by Next.js commands (`dev` vs `start`)
- `NEXT_PUBLIC_APP_ENV` is a custom variable that's accessible on both client and server
- This gives us manual control over the development behavior regardless of how the app is started

### Command Behavior

- **`pnpm dev`** - Runs development server, but `NEXT_PUBLIC_APP_ENV` is whatever you set in `.env`
- **`pnpm start`** - Runs production build, but `NEXT_PUBLIC_APP_ENV` is still whatever you set in `.env`

The npm command does **not** automatically set `NEXT_PUBLIC_APP_ENV`.

### Fallback Behavior

If `NEXT_PUBLIC_APP_ENV` is not set or empty, the system defaults to `'production'` mode for security.

## Setup Instructions

1. **Add to `.env.local`**:
   ```bash
   ASHBY_API_KEY=your_development_api_key
   NEXT_PUBLIC_APP_ENV=development
   ```

2. **Restart your development server**:
   ```bash
   pnpm dev
   ```

3. **Access ATS pages**: Navigate to `/board/ats` - you should now have access without needing a database API key

## Security Considerations

- The `ASHBY_API_KEY` environment variable is only used when explicitly in development mode
- Production deployments should have `NEXT_PUBLIC_APP_ENV=production` or leave it unset
- Never commit real API keys to version control - use `.env.local` or secure environment variable management

## Troubleshooting

### "ATS Integration Required" message

If you see the access denied message:

1. Check that `NEXT_PUBLIC_APP_ENV=development` in your `.env.local`
2. Verify that `ASHBY_API_KEY` is set in `.env.local`
3. Restart your development server after changing environment variables
4. Check the browser's Network tab to see if the `/api/ashby/candidates` call returns 200

### API Errors

If you get API errors:

1. Verify the `ASHBY_API_KEY` is valid and has the correct permissions
2. Check that `ASHBY_BASE_URL=https://api.ashbyhq.com` is set correctly
3. Look at server logs for specific Ashby API error messages