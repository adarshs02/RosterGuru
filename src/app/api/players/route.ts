import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

// Cache for 1 hour
export const revalidate = 3600;

export interface CurrentPlayer {
  id: string;
  nba_player_id: number;
  name: string;
  position: string;
  team: string;
  photo?: string;
}

// GET /api/players - fetch current active players with their teams
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";

    // Fetch current players from current_players table
    let query = supabase
      .from("current_players")
      .select("*")
      .order("player_name", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch players:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data and apply search filter if provided
    let players: CurrentPlayer[] = (data || []).map((player: any) => ({
      id: player.id || player.player_id,
      nba_player_id: player.nba_player_id || player.id,
      name: player.name || player.player_name,
      position: player.position || "F",
      team: player.team || player.team_abbreviation || "N/A",
      photo: player.headshot_url || player.photo || undefined,
    }));

    // Filter by search term if provided
    if (search) {
      players = players.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.team.toLowerCase().includes(search) ||
          p.position.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ players });
  } catch (err: any) {
    console.error("Unhandled error fetching players:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
