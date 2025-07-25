import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use service role key for frontend operations (same as backend)
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseKey
  })
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our database tables
export interface Player {
  player_id: number
  nba_player_id: number
  player_name: string
  position: string
  years_experience: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PerGameStats {
  player_id: number
  season: string
  team_abbreviation: string
  games_played: number
  games_started: number
  minutes_per_game: number
  field_goals_made: number
  field_goals_attempted: number
  field_goal_percentage: number
  three_pointers_made: number
  three_pointers_attempted: number
  three_point_percentage: number
  free_throws_made: number
  free_throws_attempted: number
  free_throw_percentage: number
  offensive_rebounds: number
  defensive_rebounds: number
  total_rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  personal_fouls: number
  points: number
  plus_minus: number
  // Z-score fields
  zscore_points: number
  zscore_rebounds: number
  zscore_assists: number
  zscore_steals: number
  zscore_blocks: number
  zscore_turnovers: number
  zscore_fg_pct: number
  zscore_ft_pct: number
  zscore_three_pm: number
  zscore_total: number
}

export interface Per36Stats {
  player_id: number
  season: string
  team_abbreviation: string
  games_played: number
  minutes_played: number
  field_goals_made: number
  field_goals_attempted: number
  field_goal_percentage: number
  three_pointers_made: number
  three_pointers_attempted: number
  three_point_percentage: number
  free_throws_made: number
  free_throws_attempted: number
  free_throw_percentage: number
  offensive_rebounds: number
  defensive_rebounds: number
  total_rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  personal_fouls: number
  points: number
  // Z-score fields
  zscore_points: number
  zscore_rebounds: number
  zscore_assists: number
  zscore_steals: number
  zscore_blocks: number
  zscore_turnovers: number
  zscore_fg_pct: number
  zscore_ft_pct: number
  zscore_three_pm: number
  zscore_total: number
}

export interface TotalStats {
  player_id: number
  season: string
  team_abbreviation: string
  games_played: number
  games_started: number
  total_minutes: number
  total_field_goals_made: number
  total_field_goals_attempted: number
  field_goal_percentage: number
  total_three_pointers_made: number
  total_three_pointers_attempted: number
  three_point_percentage: number
  total_free_throws_made: number
  total_free_throws_attempted: number
  free_throw_percentage: number
  total_offensive_rebounds: number
  total_defensive_rebounds: number
  total_rebounds: number
  total_assists: number
  total_steals: number
  total_blocks: number
  total_turnovers: number
  total_personal_fouls: number
  total_points: number
  total_plus_minus: number
}

// Combined player data with stats
export interface PlayerWithStats extends Player {
  stats: PerGameStats | Per36Stats | TotalStats
}
