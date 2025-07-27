import { supabase, Player, PerGameStats, Per36Stats, TotalStats, PlayerWithStats } from './supabase'

export type StatsType = 'per_game' | 'per_36' | 'total'

export interface PlayerData {
  player_id: number
  player_name: string
  position: string[]
  team: string
  games_played: number
  minutes: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  field_goal_percentage: number
  field_goals_attempted: number
  three_pointers_made: number
  three_point_percentage: number
  free_throw_percentage: number
  free_throws_attempted: number
  // Individual stat z-scores for custom calculation
  zscore_points: number
  zscore_rebounds: number
  zscore_assists: number
  zscore_steals: number
  zscore_blocks: number
  zscore_turnovers: number
  zscore_fg_pct: number
  zscore_ft_pct: number
  zscore_three_pm: number
  // Pre-calculated z-scores (for backward compatibility and comparison)
  zscore_per_game?: number  // Z-score from per-game stats
  zscore_per_36?: number   // Z-score from per-36 stats
  zscore_total?: number    // Current z-score (for backward compatibility)
  previous_year_zscore?: number  // Previous year z-score for comparison
}

/**
 * Fetch players with their stats for a specific season and stats type
 */
export async function fetchPlayersWithStats(
  season: string, 
  statsType: StatsType = 'per_game'
): Promise<PlayerData[]> {
  try {
    // Query the main stats table and join with players
    const statsTable = getStatsTableName(statsType)
    
    // Get the main stats data
    let query = supabase
      .from(statsTable)
      .select(`
        *,
        players (
          player_id,
          player_name,
          position
        )
      `)
      .eq('season', season)
      .not('players', 'is', null)
    
    // Order by appropriate field
    if (statsType === 'total') {
      query = query.order('total_points', { ascending: false })
    } else {
      query = query.order('zscore_total', { ascending: false })
    }
    
    const { data: mainData, error } = await query
    
    if (error) {
      console.error('Error fetching main stats:', error)
      throw error
    }

    if (!mainData) return []

    // Get both per-game and per-36 z-scores for all players
    const playerIds = mainData.map(record => record.player_id)
    
    const [perGameZScores, per36ZScores] = await Promise.all([
      // Get per-game z-scores
      supabase
        .from('per_game_stats')
        .select('player_id, zscore_total')
        .eq('season', season)
        .in('player_id', playerIds),
      // Get per-36 z-scores  
      supabase
        .from('per_36_stats')
        .select('player_id, zscore_total')
        .eq('season', season)
        .in('player_id', playerIds)
    ])

    // Create lookup maps for z-scores
    const perGameZScoreMap = new Map(
      perGameZScores.data?.map(record => [record.player_id, record.zscore_total]) || []
    )
    const per36ZScoreMap = new Map(
      per36ZScores.data?.map(record => [record.player_id, record.zscore_total]) || []
    )

    // Transform the data to match our PlayerData interface
    return mainData
      .filter(record => record.players && record.players.player_name)
      .map(record => {
        const player = record.players
        const stats = record
        
        return {
          player_id: player.player_id,
          player_name: player.player_name,
          position: player.position ? player.position.split('|') : ['F'],
          team: stats.team_abbreviation,
          games_played: stats.games_played,
          minutes: getMinutesValue(stats, statsType),
          points: getPointsValue(stats, statsType),
          rebounds: getReboundsValue(stats, statsType),
          assists: getAssistsValue(stats, statsType),
          steals: getStealsValue(stats, statsType),
          blocks: getBlocksValue(stats, statsType),
          turnovers: getTurnoversValue(stats, statsType),
          field_goal_percentage: stats.field_goal_percentage || 0,
          field_goals_attempted: stats.field_goals_attempted || 0,
          three_pointers_made: getThreePointersMadeValue(stats, statsType),
          three_point_percentage: stats.three_point_percentage || 0,
          free_throw_percentage: stats.free_throw_percentage || 0,
          free_throws_attempted: stats.free_throws_attempted || 0,
          // Individual stat z-scores for custom calculation
          zscore_points: stats.zscore_points || 0,
          zscore_rebounds: stats.zscore_rebounds || 0,
          zscore_assists: stats.zscore_assists || 0,
          zscore_steals: stats.zscore_steals || 0,
          zscore_blocks: stats.zscore_blocks || 0,
          zscore_turnovers: stats.zscore_turnovers || 0,
          zscore_fg_pct: stats.zscore_fg_pct || 0,
          zscore_ft_pct: stats.zscore_ft_pct || 0,
          zscore_three_pm: stats.zscore_three_pm || 0,
          // Pre-calculated z-scores
          zscore_per_game: perGameZScoreMap.get(player.player_id),
          zscore_per_36: per36ZScoreMap.get(player.player_id),
          zscore_total: stats.zscore_total || 0,
          previous_year_zscore: undefined  // TODO: Implement previous year lookup
        }
      })

  } catch (error) {
    console.error('Failed to fetch players with stats:', error)
    return []
  }
}

/**
 * Get the appropriate stats table name based on stats type
 */
function getStatsTableName(statsType: StatsType): string {
  switch (statsType) {
    case 'per_game':
      return 'per_game_stats'
    case 'per_36':
      return 'per_36_stats'
    case 'total':
      return 'total_stats'
    default:
      return 'per_game_stats'
  }
}

/**
 * Get the appropriate stats fields to select based on stats type
 */
function getStatsFields(statsType: StatsType): string {
  const commonFields = `
    team_abbreviation,
    games_played,
    field_goals_made,
    field_goals_attempted,
    field_goal_percentage,
    three_pointers_made,
    three_pointers_attempted,
    three_point_percentage,
    free_throws_made,
    free_throws_attempted,
    free_throw_percentage,
    offensive_rebounds,
    defensive_rebounds,
    total_rebounds,
    assists,
    steals,
    blocks,
    turnovers,
    personal_fouls,
    zscore_points,
    zscore_rebounds,
    zscore_assists,
    zscore_steals,
    zscore_blocks,
    zscore_turnovers,
    zscore_fg_pct,
    zscore_ft_pct,
    zscore_three_pm,
    zscore_total
  `

  switch (statsType) {
    case 'per_game':
      return `${commonFields}, minutes_per_game, points, plus_minus, games_started`
    case 'per_36':
      return `${commonFields}, minutes_played, points`
    case 'total':
      return `${commonFields}, total_minutes, total_points, total_plus_minus, games_started`
    default:
      return commonFields
  }
}

// Helper functions to extract the right values based on stats type
function getMinutesValue(stats: any, statsType: StatsType): number {
  switch (statsType) {
    case 'per_game':
      return stats.minutes_per_game || 0
    case 'per_36':
      return 36.0  // Per-36 stats are always normalized to 36 minutes
    case 'total':
      return stats.total_minutes || 0
    default:
      return 0
  }
}

function getPointsValue(stats: any, statsType: StatsType): number {
  switch (statsType) {
    case 'per_game':
    case 'per_36':
      return stats.points || 0
    case 'total':
      return stats.total_points || 0
    default:
      return 0
  }
}

function getReboundsValue(stats: any, statsType: StatsType): number {
  return stats.total_rebounds || 0
}

function getAssistsValue(stats: any, statsType: StatsType): number {
  switch (statsType) {
    case 'per_game':
    case 'per_36':
      return stats.assists || 0
    case 'total':
      return stats.total_assists || 0
    default:
      return 0
  }
}

function getStealsValue(stats: any, statsType: StatsType): number {
  switch (statsType) {
    case 'per_game':
    case 'per_36':
      return stats.steals || 0
    case 'total':
      return stats.total_steals || 0
    default:
      return 0
  }
}

function getBlocksValue(stats: any, statsType: StatsType): number {
  switch (statsType) {
    case 'per_game':
    case 'per_36':
      return stats.blocks || 0
    case 'total':
      return stats.total_blocks || 0
    default:
      return 0
  }
}

function getTurnoversValue(stats: any, statsType: StatsType): number {
  switch (statsType) {
    case 'per_game':
    case 'per_36':
      return stats.turnovers || 0
    case 'total':
      return stats.total_turnovers || 0
    default:
      return 0
  }
}

function getThreePointersMadeValue(stats: any, statsType: StatsType): number {
  switch (statsType) {
    case 'per_game':
    case 'per_36':
      return stats.three_pointers_made || 0
    case 'total':
      return stats.total_three_pointers_made || 0
    default:
      return 0
  }
}
