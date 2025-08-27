/**
 * Client-side Ashby configuration and React hooks
 */
'use client';

import { useMemo } from 'react';
import { useSharedUserProfile } from '@/lib/contexts/UserProfileContext';

/**
 * React hook to check if current user has ATS access
 * Uses existing UserProfile context to avoid API calls and delays
 */
export function useAshbyAccess() {
  const { userProfile, loading } = useSharedUserProfile();
  
  const hasAccess = useMemo(() => {
    if (loading) return false;
    
    // Check dev mode first (mirrors server-side logic in /lib/ashby/server.ts)
    const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'production';
    if (appEnv === 'development') {
      // In dev mode, check if there's any indication of Ashby setup
      // This could be enhanced to check for ASHBY_API_KEY env var on client if needed
      return true; // For now, assume dev mode has access
    }
    
    // Production: check if user has ashby_api_key in their profile
    return !!(userProfile?.ashby_api_key);
  }, [userProfile?.ashby_api_key, loading]);
  
  return { hasAccess, loading };
}


