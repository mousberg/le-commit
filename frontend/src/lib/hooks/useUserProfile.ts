'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { simpleDatabaseService } from '@/lib/services/database';
import { User } from '@/lib/interfaces/database';

export function useUserProfile() {
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user profile from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      if (!authUser) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const profile = await simpleDatabaseService.ensureUserExists();
        setUserProfile(profile);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
        setError(errorMessage);
        console.error('Failed to load user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [authUser]);

  // Update user profile
  const updateProfile = async (updates: { full_name?: string }) => {
    if (!userProfile) return null;

    try {
      const updatedProfile = await simpleDatabaseService.updateUserProfile(updates);
      setUserProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      console.error('Failed to update user profile:', err);
      throw err;
    }
  };

  // Get display name with fallback (memoized to prevent re-renders)
  const displayName = useMemo(() => {
    if (userProfile?.full_name) {
      return userProfile.full_name;
    }
    if (authUser?.email) {
      return authUser.email.split('@')[0];
    }
    return 'User';
  }, [userProfile?.full_name, authUser?.email]);

  // Get display initial for avatar (memoized)
  const displayInitial = useMemo(() => {
    return displayName.charAt(0).toUpperCase();
  }, [displayName]);

  return {
    userProfile,
    loading,
    error,
    updateProfile,
    displayName,
    displayInitial,
    authUser
  };
}