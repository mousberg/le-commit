/**
 * Shared Ashby utilities (no React hooks)
 */

/**
 * Get Ashby API key, prioritizing environment variable in development mode
 * @param userApiKey - API key from user's database record
 * @returns API key to use for Ashby requests
 */
export function getAshbyApiKey(userApiKey?: string | null): string | null {
  // In development mode, prioritize environment variable
  if (process.env.NODE_ENV === 'development' && process.env.ASHBY_API_KEY) {
    return process.env.ASHBY_API_KEY;
  }
  
  // Otherwise, use user's API key from database
  return userApiKey || null;
}

/**
 * Check if Ashby integration is configured for a user
 * @param userApiKey - API key from user's database record
 * @returns true if Ashby is configured
 */
export function isAshbyConfigured(userApiKey?: string | null): boolean {
  return !!getAshbyApiKey(userApiKey);
}