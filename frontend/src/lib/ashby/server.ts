/**
 * Server-side Ashby utilities
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Server-side function to check if user has ATS access
 * Used by middleware and API routes
 */
export async function checkUserAshbyAccess(userId: string): Promise<boolean> {
  try {
    // In development mode with ASHBY_API_KEY env var, always return true
    if (process.env.NODE_ENV === 'development' && process.env.ASHBY_API_KEY) {
      return true;
    }
    
    const supabase = await createClient();
    
    const { data: userData } = await supabase
      .from('users')
      .select('ashby_api_key')
      .eq('id', userId)
      .single();
    
    return isAshbyConfigured(userData?.ashby_api_key);
  } catch (error) {
    console.error('Error checking user Ashby access:', error);
    return false;
  }
}

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