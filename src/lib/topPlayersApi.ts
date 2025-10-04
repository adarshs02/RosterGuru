import { TopPlayerData } from '@/app/api/players/top/route';

export interface TopPlayersResponse {
  success: boolean;
  data: TopPlayerData[];
  meta: {
    season: string;
    count: number;
    limit: number;
  };
}

export interface TopPlayersOptions {
  limit?: number;
  season?: string;
}

/**
 * Fetch top players from the API
 */
export async function fetchTopPlayers(options: TopPlayersOptions = {}): Promise<TopPlayersResponse> {
  const { limit = 20, season } = options;
  
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (season) {
    params.set('season', season);
  }
  
  const response = await fetch(`/api/players/top?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch top players: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * React hook for fetching top players
 */
export function useTopPlayers(options: TopPlayersOptions = {}) {
  const [data, setData] = React.useState<TopPlayerData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<TopPlayersResponse['meta'] | null>(null);
  
  React.useEffect(() => {
    const loadTopPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchTopPlayers(options);
        setData(response.data);
        setMeta(response.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch top players');
      } finally {
        setLoading(false);
      }
    };
    
    loadTopPlayers();
  }, [options.limit, options.season]);
  
  return { data, loading, error, meta };
}

// Add React import for the hook
import React from 'react';
