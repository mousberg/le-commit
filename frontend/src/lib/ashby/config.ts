/**
 * Ashby configuration and access utilities
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

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

/**
 * React hook to check if current user has ATS access
 * Replaces useAshbyAccess hook - simpler, single source of truth
 */
export function useAshbyAccess() {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!user?.id) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        // Dynamic import to avoid client-side bundling issues
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        const { data: userData } = await supabase
          .from('users')
          .select('ashby_api_key')
          .eq('id', user.id)
          .single();

        setHasAccess(isAshbyConfigured(userData?.ashby_api_key));
      } catch (error) {
        console.error('Error checking Ashby access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [user?.id]);

  return { hasAccess, loading };
}

/**
 * Server-side function to check if user has ATS access
 * Used by middleware and API routes
 */
export async function checkUserAshbyAccess(userId: string): Promise<boolean> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
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