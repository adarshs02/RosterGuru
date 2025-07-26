import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { WatchListApi, WatchListPlayer, WatchListPlayerInput } from '@/lib/api/watchListApi';
import { supabase } from '@/lib/api/watchListApi';

// Custom hook for managing user's watch list
export const useWatchList = () => {
  const { user, isLoaded } = useUser();
  const [watchList, setWatchList] = useState<WatchListPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load watch list when user is loaded
  useEffect(() => {
    if (isLoaded) {
      loadWatchList();
    }
  }, [isLoaded, user?.id]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = WatchListApi.subscribeToWatchList((payload) => {
      // Refresh watch list when changes occur
      loadWatchList();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadWatchList = async () => {
    if (!user?.id) {
      setWatchList([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await WatchListApi.getUserWatchList(user.id);
      setWatchList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watch list');
      console.error('Error loading watch list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addToWatchList = useCallback(async (player: WatchListPlayerInput) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      setError(null);
      await WatchListApi.addToWatchList(user.id, player);
      await loadWatchList(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player');
      throw err;
    }
  }, [user?.id]);

  const removeFromWatchList = useCallback(async (playerId: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      setError(null);
      await WatchListApi.removeFromWatchList(user.id, playerId);
      await loadWatchList(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove player');
      throw err;
    }
  }, [user?.id]);

  const toggleWatchList = useCallback(async (player: WatchListPlayerInput) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      setError(null);
      const result = await WatchListApi.toggleWatchList(user.id, player);
      await loadWatchList(); // Refresh the list
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle player');
      throw err;
    }
  }, [user?.id]);

  return {
    watchList,
    isLoading,
    error,
    count: watchList.length,
    addToWatchList,
    removeFromWatchList,
    toggleWatchList,
    refetch: loadWatchList,
  };
};

// Hook for checking individual player watch status
export const usePlayerWatchStatus = (playerId: string) => {
  const { user, isLoaded } = useUser();
  const [isInWatchList, setIsInWatchList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check watch status when user is loaded and playerId changes
  useEffect(() => {
    if (isLoaded) {
      checkWatchStatus();
    }
  }, [isLoaded, user?.id, playerId]);

  const checkWatchStatus = async () => {
    if (!user?.id) {
      setIsInWatchList(false);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const status = await WatchListApi.isPlayerInWatchList(user.id, playerId);
      setIsInWatchList(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check watch status');
      console.error('Error checking watch status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(async (player: WatchListPlayerInput) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      setError(null);
      const result = await WatchListApi.toggleWatchList(user.id, player);
      setIsInWatchList(result.isInWatchList);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle watch status');
      throw err;
    }
  }, [user?.id]);

  return {
    isInWatchList,
    isLoading,
    error,
    toggle,
    refetch: checkWatchStatus,
  };
};

// Hook for watch list count (useful for navigation badges)
export const useWatchListCount = () => {
  const { user, isLoaded } = useUser();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      loadCount();
    }
  }, [isLoaded, user?.id]);

  const loadCount = async () => {
    if (!user?.id) {
      setCount(0);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const watchListCount = await WatchListApi.getWatchListCount(user.id);
      setCount(watchListCount);
    } catch (err) {
      console.error('Error loading watch list count:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    count,
    isLoading,
    refetch: loadCount,
  };
};

// Simplified auth hook (just re-exports Clerk's useUser)
export const useAuth = () => {
  const { user, isLoaded } = useUser();
  
  return {
    user,
    isLoading: !isLoaded,
    isAuthenticated: !!user,
  };
};
