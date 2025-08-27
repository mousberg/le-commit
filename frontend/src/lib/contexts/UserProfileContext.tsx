'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { User } from '@/lib/interfaces/database';

interface UserProfileContextType {
  userProfile: User | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: { full_name?: string }) => Promise<User | null>;
  displayName: string;
  displayInitial: string;
  authUser: { email?: string } | null;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const userProfileData = useUserProfile();

  return (
    <UserProfileContext.Provider value={userProfileData}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useSharedUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useSharedUserProfile must be used within a UserProfileProvider');
  }
  return context;
}