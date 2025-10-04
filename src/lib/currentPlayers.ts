import { unstable_cache } from "next/cache";
import { createClient } from "../../supabase/server";

export interface CurrentPlayer {
  id: string;
  nba_player_id: number;
  name: string;
  position: string;
  team: string;
  photo?: string;
}

/**
 * Fetch current active players with their team information
 * This function is cached for 1 hour to reduce database load
 */
async function fetchCurrentPlayersUncached(): Promise<CurrentPlayer[]> {
  try {
    const supabase = await createClient();

    // Fetch current players from current_players table
    const { data, error } = await supabase
      .from("current_players")
      .select("*")
      .order("player_name", { ascending: true });

    if (error) {
      console.error("Failed to fetch current players:", error);
      return [];
    }

    // Transform data
    return (data || []).map((player: any) => ({
      id: player.id || player.player_id,
      nba_player_id: player.nba_player_id || player.id,
      name: player.name || player.player_name,
      position: player.position || "F",
      team: player.team || player.team_abbreviation || "N/A",
      photo: player.headshot_url || player.photo || undefined,
    }));
  } catch (err) {
    console.error("Error fetching current players:", err);
    return [];
  }
}

/**
 * Cached version of fetchCurrentPlayers
 * Cache is revalidated every hour (3600 seconds)
 */
export const fetchCurrentPlayers = unstable_cache(
  fetchCurrentPlayersUncached,
  ["current-players"],
  {
    revalidate: 3600, // 1 hour
    tags: ["current-players"],
  }
);

/**
 * Search current players by name, team, or position
 */
export async function searchCurrentPlayers(
  query: string
): Promise<CurrentPlayer[]> {
  const allPlayers = await fetchCurrentPlayers();
  const searchLower = query.toLowerCase();

  return allPlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(searchLower) ||
      player.team.toLowerCase().includes(searchLower) ||
      player.position.toLowerCase().includes(searchLower)
  );
}

/**
 * Get a single player by ID
 */
export async function getCurrentPlayerById(
  playerId: string
): Promise<CurrentPlayer | undefined> {
  const allPlayers = await fetchCurrentPlayers();
  return allPlayers.find((player) => player.id === playerId);
}
