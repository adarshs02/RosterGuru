import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface TopPlayerData {
  id: string;
  player_id: number;
  name: string;
  team: string;
  position: string[];
  image: string | null;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  field_goal_percentage: number;
  free_throw_percentage: number;
  three_pointers_made: number;
  zscore_total: number;
  season: string;
}

/**
 * GET /api/players/top
 * Returns the top 20 players from the most recent season, sorted by z-score
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const season = searchParams.get('season'); // Optional: specify season
    
    let targetSeason = season;
    
    // If no season specified, get the most recent season
    if (!targetSeason) {
      const { data: seasons, error: seasonsError } = await supabase
        .from('per_game_stats')
        .select('season')
        .order('season', { ascending: false })
        .limit(1);
      
      if (seasonsError) {
        console.error('Error fetching seasons:', seasonsError);
        return NextResponse.json(
          { error: 'Failed to fetch seasons' },
          { status: 500 }
        );
      }
      
      if (!seasons || seasons.length === 0) {
        return NextResponse.json(
          { error: 'No seasons found' },
          { status: 404 }
        );
      }
      
      targetSeason = seasons[0].season;
    }
    
    // Query for top players by z-score from the specified season
    const { data: topPlayers, error } = await supabase
      .from('per_game_stats')
      .select(`
        player_id,
        season,
        points,
        total_rebounds,
        assists,
        steals,
        blocks,
        turnovers,
        field_goal_percentage,
        free_throw_percentage,
        three_pointers_made,
        zscore_total
      `)
      .eq('season', targetSeason)
      .not('zscore_total', 'is', null)
      .order('zscore_total', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching top players stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch top players stats' },
        { status: 500 }
      );
    }
    
    if (!topPlayers || topPlayers.length === 0) {
      return NextResponse.json(
        { error: 'No players found for the specified season' },
        { status: 404 }
      );
    }
    
    // Get player IDs to fetch additional data
    const playerIds = topPlayers.map(p => p.player_id);
    console.log('Player IDs to lookup:', playerIds.slice(0, 3)); // Log first 3 IDs
    
    // Fetch player details
    const { data: playerDetails, error: playersError } = await supabase
      .from('players')
      .select('player_id, player_name, position')
      .in('player_id', playerIds);
    
    console.log('Players query result:', { 
      playerDetailsCount: playerDetails?.length, 
      playersError: playersError?.message 
    });
    
    if (playersError) {
      console.error('Error fetching player details:', playersError);
      return NextResponse.json(
        { error: `Failed to fetch player details: ${playersError.message}` },
        { status: 500 }
      );
    }
    
    // Fetch current player team info and headshots
    const { data: currentPlayerDetails, error: currentPlayersError } = await supabase
      .from('current_players')
      .select('player_id, team_abbreviation, headshot_url')
      .in('player_id', playerIds);
    
    console.log('Current players query result:', { 
      currentPlayerDetailsCount: currentPlayerDetails?.length, 
      currentPlayersError: currentPlayersError?.message 
    });
    
    if (currentPlayersError) {
      console.error('Error fetching current player details:', currentPlayersError);
      // Don't fail completely, just log the error
    }
    
    // Create lookup maps
    const playerDetailsMap = new Map(playerDetails?.map(p => [p.player_id, p]) || []);
    const currentPlayerDetailsMap = new Map(currentPlayerDetails?.map(p => [p.player_id, p]) || []);
    
    // Transform the data to match our interface
    const transformedPlayers: TopPlayerData[] = topPlayers.map((player, index) => {
      const playerDetail = playerDetailsMap.get(player.player_id);
      const currentPlayerDetail = currentPlayerDetailsMap.get(player.player_id);
      
      return {
        id: (index + 1).toString(), // Rank-based ID for compatibility
        player_id: player.player_id,
        name: playerDetail?.player_name || 'Unknown Player',
        team: currentPlayerDetail?.team_abbreviation || 'UNK',
        position: playerDetail?.position ? playerDetail.position.split('|') : ['F'],
        image: currentPlayerDetail?.headshot_url || null,
        points: player.points || 0,
        rebounds: player.total_rebounds || 0,
        assists: player.assists || 0,
        steals: player.steals || 0,
        blocks: player.blocks || 0,
        turnovers: player.turnovers || 0,
        field_goal_percentage: player.field_goal_percentage || 0,
        free_throw_percentage: player.free_throw_percentage || 0,
        three_pointers_made: player.three_pointers_made || 0,
        zscore_total: player.zscore_total || 0,
        season: player.season
      };
    });
    
    // Transform array to dictionary structure for POPULAR_PLAYERS_DATA compatibility
    const playersDict: Record<string, {
      id: string;
      player_id: string; // Add player_id to the type definition
      name: string;
      team: string;
      position: string[];
      image: string;
      points: number;
      rebounds: number;
      assists: number;
      zscore: number;
      trending: "up" | "down" | "stable";
      discussions: number;
      projections: number;
    }> = {};

    transformedPlayers.forEach((player, index) => {
      const rank = (index + 1).toString();
      playersDict[rank] = {
        id: rank,
        player_id: player.player_id.toString(), // Include the actual UUID
        name: player.name,
        team: player.team,
        position: player.position,
        image: player.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`,
        points: player.points,
        rebounds: player.rebounds,
        assists: player.assists,
        zscore: player.zscore_total, // Map zscore_total to zscore
        trending: "stable" as const, // Default to stable for now
        discussions: Math.floor(Math.random() * 50) + 10, // Mock data for compatibility
        projections: Math.floor(Math.random() * 30) + 5, // Mock data for compatibility
      };
    });

    return NextResponse.json({
      success: true,
      data: playersDict, // Return as dictionary instead of array
      meta: {
        season: targetSeason,
        count: transformedPlayers.length,
        limit: limit
      }
    });
    
  } catch (error) {
    console.error('Unexpected error in top players API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
