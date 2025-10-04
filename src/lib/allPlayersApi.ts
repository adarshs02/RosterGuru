export interface AllPlayerData {
  id: string;
  player_id: string;
  name: string;
  team: string;
  position: string[];
  image: string;
  points: number;
  rebounds: number;
  assists: number;
  zscore_total: number;
  trending: "up" | "down" | "stable";
  discussions: number;
  projections: number;
  // New fields from current_players table
  height: string | null;
  weight: string | null;
  age: number | null;
  jersey: string | null;
}

export interface AllPlayersResponse {
  success: boolean;
  data: Record<string, AllPlayerData>;
  meta: {
    season: string;
    count: number;
    limit: number;
    search?: string;
  };
}

export async function fetchAllPlayers(limit: number = 500, search: string = ''): Promise<AllPlayersResponse> {
  const searchParams = new URLSearchParams();
  if (limit > 0) searchParams.append('limit', limit.toString());
  if (search) searchParams.append('search', search);
  
  const url = `/api/players/all${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch all players: ${response.statusText}`);
  }
  
  return response.json();
}
