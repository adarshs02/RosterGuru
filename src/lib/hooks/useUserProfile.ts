import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserProfilesApi, UserProfile } from '@/lib/api/userProfilesApi';

// Hook for managing user profile sync between Clerk and Supabase
export const useUserProfile = () => {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user profile when Clerk user is loaded
  useEffect(() => {
    if (isLoaded && user) {
      syncUserProfile();
    } else if (isLoaded && !user) {
      setProfile(null);
      setIsLoading(false);
    }
  }, [isLoaded, user?.id]);

  // Sync user profile from Clerk to Supabase
  const syncUserProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Upsert user profile (create or update)
      const syncedProfile = await UserProfilesApi.upsertUserProfile(user);
      setProfile(syncedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync user profile');
      console.error('Error syncing user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update last active timestamp
  const updateLastActive = useCallback(async () => {
    if (user?.id) {
      try {
        await UserProfilesApi.updateLastActive(user.id);
      } catch (err) {
        console.error('Error updating last active:', err);
      }
    }
  }, [user?.id]);

  // Update user preferences
  const updatePreferences = useCallback(async (preferences: Record<string, any>) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await UserProfilesApi.updateUserPreferences(user.id, preferences);
      if (profile) {
        setProfile({ ...profile, preferences });
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
      throw err;
    }
  }, [user?.id, profile]);

  return {
    profile,
    isLoading,
    error,
    isAuthenticated: !!user,
    syncUserProfile,
    updateLastActive,
    updatePreferences,
  };
};

// Hook for getting other user profiles (for displaying in discussions, etc.)
export const useUserProfiles = (clerkUserIds: string[]) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clerkUserIds.length > 0) {
      fetchProfiles();
    } else {
      setProfiles([]);
      setIsLoading(false);
    }
  }, [clerkUserIds.join(',')]);

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedProfiles = await UserProfilesApi.getUserProfiles(clerkUserIds);
      setProfiles(fetchedProfiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user profiles');
      console.error('Error fetching user profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    profiles,
    isLoading,
    error,
    refetch: fetchProfiles,
  };
};

// Hook for searching users (for mentions, etc.)
export const useUserSearch = () => {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async (query: string, limit: number = 10) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const searchResults = await UserProfilesApi.searchUsers(query, limit);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
      console.error('Error searching users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    searchUsers,
    clearResults,
  };
};

// Hook for top users/leaderboard
export const useTopUsers = (limit: number = 10) => {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopUsers();
  }, [limit]);

  const fetchTopUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const users = await UserProfilesApi.getTopUsers(limit);
      setTopUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch top users');
      console.error('Error fetching top users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    topUsers,
    isLoading,
    error,
    refetch: fetchTopUsers,
  };
};
