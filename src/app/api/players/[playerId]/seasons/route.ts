import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
);

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

export async function GET(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  try {
    const { playerId } = params;

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Fetch the last 3 seasons of stats for the player
    const { data: seasonStats, error } = await supabase
      .from('per_game_stats')
      .select(`
        season,
        team_abbreviation,
        games_played,
        points,
        total_rebounds,
        assists,
        steals,
        blocks,
        field_goal_percentage,
        three_point_percentage,
        free_throw_percentage,
        zscore_total
      `)
      .eq('player_id', playerId)
      .order('season', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error fetching player season stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch player season stats' },
        { status: 500 }
      );
    }

    if (!seasonStats || seasonStats.length === 0) {
      return NextResponse.json(
        { error: 'No season stats found for this player' },
        { status: 404 }
      );
    }

    // Transform the data to match our interface
    const transformedStats: PlayerSeasonStats[] = seasonStats.map(stat => ({
      season: stat.season,
      team_abbreviation: stat.team_abbreviation || 'N/A',
      games_played: stat.games_played || 0,
      points: parseFloat(stat.points) || 0,
      total_rebounds: parseFloat(stat.total_rebounds) || 0,
      assists: parseFloat(stat.assists) || 0,
      steals: parseFloat(stat.steals) || 0,
      blocks: parseFloat(stat.blocks) || 0,
      field_goal_percentage: parseFloat(stat.field_goal_percentage) || 0,
      three_point_percentage: parseFloat(stat.three_point_percentage) || 0,
      free_throw_percentage: parseFloat(stat.free_throw_percentage) || 0,
      zscore_total: parseFloat(stat.zscore_total) || 0,
    }));

    return NextResponse.json({
      playerId,
      seasons: transformedStats,
      totalSeasons: transformedStats.length
    });

  } catch (error) {
    console.error('Error in player seasons API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
