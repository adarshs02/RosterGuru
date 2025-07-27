export interface PlayerSeasonStats {
  season: string;
  team_abbreviation: string;
  games_played: number;
  points: number;
  total_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  field_goal_percentage: number;
  three_point_percentage: number;
  free_throw_percentage: number;
  zscore_total: number;
}

export interface PlayerSeasonsResponse {
  playerId: string;
  seasons: PlayerSeasonStats[];
  totalSeasons: number;
}

export const fetchPlayerSeasons = async (playerId: string): Promise<PlayerSeasonsResponse> => {
  try {
    const response = await fetch(`/api/players/${playerId}/seasons`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch player seasons: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching player seasons:', error);
    throw error;
  }
};
