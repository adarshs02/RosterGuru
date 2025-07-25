import { supabase } from './supabase'

export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test 1: Check if we can connect to players table
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('player_id, player_name, position')
      .limit(5)
    
    console.log('Players test:', { players, playersError })
    
    // Test 2: Check if we can connect to per_game_stats table
    const { data: stats, error: statsError } = await supabase
      .from('per_game_stats')
      .select('player_id, season, team_abbreviation, points')
      .eq('season', '2024-25')
      .limit(5)
    
    console.log('Stats test:', { stats, statsError })
    
    // Test 3: Check if we can do a join
    const { data: joined, error: joinError } = await supabase
      .from('per_game_stats')
      .select(`
        player_id,
        season,
        team_abbreviation,
        points,
        players (
          player_name,
          position
        )
      `)
      .eq('season', '2024-25')
      .limit(5)
    
    console.log('Join test:', { joined, joinError })
    
    return { players, stats, joined }
  } catch (error) {
    console.error('Test failed:', error)
    return null
  }
}
