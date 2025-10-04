import { NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/supabase';

export interface AllPlayerData {
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
  // New fields from current_players table
  height: string | null;
  weight: string | null;
  age: number | null;
  jersey: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '500'); // Higher default for all players
    const search = searchParams.get('search') || '';

    // Use the most recent season (hardcoded for reliability, same as top players API)
    const targetSeason = '2024-25';
    console.log('Target season for all players:', targetSeason);

    // Fetch all players with stats from the most recent season (using correct column names)
    const { data: playersData, error: playersError } = await supabase
      .from('per_game_stats')
      .select(`
        player_id,
        points,
        total_rebounds,
        assists,
        steals,
        blocks,
        turnovers,
        field_goal_percentage,
        free_throw_percentage,
        three_pointers_made,
        zscore_total,
        season
      `)
      .eq('season', targetSeason)
      .order('zscore_total', { ascending: false })
      .limit(limit);

    console.log('Players query result:', { 
      playersCount: playersData?.length, 
      playersError: playersError,
      targetSeason,
      searchTerm: search,
      sampleData: playersData?.[0]
    });

    if (playersError) {
      console.error('Detailed error fetching players:', {
        message: playersError.message,
        details: playersError.details,
        hint: playersError.hint,
        code: playersError.code
      });
      return NextResponse.json({ 
        error: 'Failed to fetch players', 
        details: playersError.message 
      }, { status: 500 });
    }

    if (!playersData || playersData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {},
        meta: { season: targetSeason, count: 0, limit: limit, search: search }
      });
    }

    // Extract player IDs for additional data fetching
    const playerIds = playersData.map(player => player.player_id);

    // Fetch player details (same pattern as working top players API)
    const { data: playerDetails, error: playerDetailsError } = await supabase
      .from('players')
      .select('player_id, player_name, position')
      .in('player_id', playerIds);
    
    console.log('Players query result:', { 
      playerDetailsCount: playerDetails?.length, 
      playersError: playerDetailsError?.message 
    });
    
    if (playerDetailsError) {
      console.error('Error fetching player details:', playerDetailsError);
      return NextResponse.json(
        { error: `Failed to fetch player details: ${playerDetailsError.message}` },
        { status: 500 }
      );
    }

    // Fetch current player details (height, weight, age, jersey, headshots) - non-blocking
    let currentPlayerDetails: any[] = [];
    try {
      const { data, error: currentPlayersError } = await supabase
        .from('current_players')
        .select('player_id, team_abbreviation, headshot_url, display_height, display_weight, age, jersey_number')
        .in('player_id', playerIds);
      
      if (currentPlayersError) {
        console.warn('Warning: Error fetching current player details (non-blocking):', currentPlayersError.message);
        currentPlayerDetails = [];
      } else {
        currentPlayerDetails = data || [];
      }
      
      console.log('Current players query result:', { 
        currentPlayerDetailsCount: currentPlayerDetails?.length, 
        currentPlayersError: currentPlayersError?.message
      });
    } catch (error) {
      console.warn('Warning: Exception fetching current player details (continuing without):', error);
      currentPlayerDetails = [];
    }

    // Fetch last 3 seasons performance data for all players
    let seasonsData: any[] = [];
    try {
      const { data, error: seasonsError } = await supabase
        .from('per_game_stats')
        .select(`
          player_id,
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
        .in('player_id', playerIds)
        .order('season', { ascending: false });
      
      if (seasonsError) {
        console.warn('Warning: Error fetching seasons data (non-blocking):', seasonsError.message);
        seasonsData = [];
      } else {
        seasonsData = data || [];
      }
      
      console.log('Seasons query result:', { 
        seasonsDataCount: seasonsData?.length, 
        seasonsError: seasonsError?.message
      });
    } catch (error) {
      console.warn('Warning: Exception fetching seasons data (continuing without):', error);
      seasonsData = [];
    }

    // Create lookup maps for efficient data joining
    const playerDetailsMap = new Map(playerDetails?.map(p => [p.player_id, p]) || []);
    const currentPlayerDetailsMap = new Map(currentPlayerDetails?.map(p => [p.player_id, p]) || []);
    
    // Group seasons data by player_id and limit to last 3 seasons per player
    const seasonsMap = new Map<string, any[]>();
    seasonsData.forEach(season => {
      const playerId = season.player_id.toString();
      if (!seasonsMap.has(playerId)) {
        seasonsMap.set(playerId, []);
      }
      const playerSeasons = seasonsMap.get(playerId)!;
      if (playerSeasons.length < 3) {
        playerSeasons.push({
          season: season.season,
          team_abbreviation: season.team_abbreviation || 'N/A',
          games_played: season.games_played || 0,
          points: parseFloat(season.points) || 0,
          total_rebounds: parseFloat(season.total_rebounds) || 0,
          assists: parseFloat(season.assists) || 0,
          steals: parseFloat(season.steals) || 0,
          blocks: parseFloat(season.blocks) || 0,
          field_goal_percentage: parseFloat(season.field_goal_percentage) || 0,
          three_point_percentage: parseFloat(season.three_point_percentage) || 0,
          free_throw_percentage: parseFloat(season.free_throw_percentage) || 0,
          zscore_total: parseFloat(season.zscore_total) || 0,
        });
      }
    });

    // Transform and enrich the data
    const transformedPlayers: AllPlayerData[] = playersData.map((player, index) => {
      const playerDetail = playerDetailsMap.get(player.player_id);
      const currentPlayerDetail = currentPlayerDetailsMap.get(player.player_id);
      
      return {
        id: (index + 1).toString(), // Rank-based ID for compatibility
        player_id: player.player_id,
        name: playerDetail?.player_name || 'Unknown Player',
        team: currentPlayerDetail?.team_abbreviation || 'N/A',
        position: playerDetail?.position ? playerDetail.position.split('|') : ['N/A'],
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
        season: player.season,
        // Map current player fields to the interface
        height: currentPlayerDetail?.display_height || null,
        weight: currentPlayerDetail?.display_weight || null,
        age: currentPlayerDetail?.age || null,
        jersey: currentPlayerDetail?.jersey_number || null,
      };
    });
    
    // Transform array to dictionary structure for POPULAR_PLAYERS_DATA compatibility
    const playersDict: Record<string, {
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
      // Last 3 seasons performance data
      seasons?: {
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
      }[];
    }> = {};

    transformedPlayers.forEach((player, index) => {
      const rank = (index + 1).toString();
      const playerSeasons = seasonsMap.get(player.player_id.toString()) || [];
      
      playersDict[rank] = {
        id: rank,
        player_id: player.player_id.toString(),
        name: player.name,
        team: player.team,
        position: player.position,
        image: player.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`,
        points: player.points,
        rebounds: player.rebounds,
        assists: player.assists,
        zscore_total: player.zscore_total,
        trending: "stable" as const,
        discussions: Math.floor(Math.random() * 50) + 10,
        projections: Math.floor(Math.random() * 30) + 5,
        // Include the new fields from transformed data
        height: player.height,
        weight: player.weight,
        age: player.age,
        jersey: player.jersey,
        // Include last 3 seasons performance data
        seasons: playerSeasons,
      };
    });

    return NextResponse.json({
      success: true,
      data: playersDict,
      meta: {
        season: targetSeason,
        count: transformedPlayers.length,
        limit: limit,
        search: search
      }
    });

  } catch (error) {
    console.error('Error in all players API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
