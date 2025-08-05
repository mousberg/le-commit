/**
 * Client-side Ashby configuration and React hooks
 */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

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
        // Use candidates API with limit=1 to check access
        const response = await fetch('/api/ashby/candidates?limit=1', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // If we get a successful response, user has access
        setHasAccess(response.ok);
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


