// Client-side z-score calculation utilities

export interface StatMultipliers {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number  // negative multiplier (turnovers are bad)
  field_goal_percentage: number
  free_throw_percentage: number
  three_pointers_made: number
}

export interface PlayerStatsForZScore {
  player_id: string
  player_name: string
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  field_goal_percentage: number
  free_throw_percentage: number
  three_pointers_made: number
  // Required for impact-weighted calculations
  field_goals_attempted: number
  free_throws_attempted: number
  // Individual z-scores for each stat (from database)
  zscore_points: number
  zscore_rebounds: number
  zscore_assists: number
  zscore_steals: number
  zscore_blocks: number
  zscore_turnovers: number
  zscore_fg_pct: number
  zscore_ft_pct: number
  zscore_three_pm: number
}

export const DEFAULT_MULTIPLIERS: StatMultipliers = {
  points: 0.856,
  rebounds: 1.0,
  assists: 0.94,
  steals: 1.17,
  blocks: 1.30,
  turnovers: 0.7,  // negative because turnovers are bad
  field_goal_percentage: 1.23,
  free_throw_percentage: 0.96,
  three_pointers_made: 1.08
}

/**
 * Calculate impact-weighted z-score for shooting percentages
 * Formula: impact = (player% - mean%) × attempts_per_game
 * Then z-score = impact / σ_impact
 */
export function calculateImpactWeightedZScore(
  playerPercentage: number,
  playerAttempts: number,
  allPlayers: PlayerStatsForZScore[],
  statType: 'field_goal' | 'free_throw'
): number {
  // Calculate league averages
  const validPlayers = allPlayers.filter(p => {
    const attempts = statType === 'field_goal' ? p.field_goals_attempted : p.free_throws_attempted;
    const percentage = statType === 'field_goal' ? p.field_goal_percentage : p.free_throw_percentage;
    return attempts > 0 && percentage > 0;
  });

  if (validPlayers.length === 0) return 0;

  // Calculate mean percentage across all players
  const meanPercentage = validPlayers.reduce((sum, p) => {
    return sum + (statType === 'field_goal' ? p.field_goal_percentage : p.free_throw_percentage);
  }, 0) / validPlayers.length;

  // Calculate impact for all players
  const impacts = validPlayers.map(p => {
    const percentage = statType === 'field_goal' ? p.field_goal_percentage : p.free_throw_percentage;
    const attempts = statType === 'field_goal' ? p.field_goals_attempted : p.free_throws_attempted;
    return (percentage - meanPercentage) * attempts;
  });

  // Calculate standard deviation of impacts
  const meanImpact = impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length;
  const variance = impacts.reduce((sum, impact) => sum + Math.pow(impact - meanImpact, 2), 0) / impacts.length;
  const stdDevImpact = Math.sqrt(variance);

  if (stdDevImpact === 0) return 0;

  // Calculate impact for the current player
  const playerImpact = (playerPercentage - meanPercentage) * playerAttempts;

  // Return z-score of the impact
  return (playerImpact - meanImpact) / stdDevImpact;
}

/**
 * Calculate a custom total z-score for a player using user-defined multipliers
 * Uses impact-weighted calculations for FG% and FT%, standard z-scores for other stats
 */
export function calculateCustomZScore(
  player: PlayerStatsForZScore, 
  multipliers: StatMultipliers,
  allPlayers?: PlayerStatsForZScore[]  // Required for impact-weighted calculations
): number {
  // For shooting percentages, use impact-weighted z-scores if allPlayers data is available
  let fgZScore = player.zscore_fg_pct;
  let ftZScore = player.zscore_ft_pct;
  
  if (allPlayers && allPlayers.length > 0) {
    fgZScore = calculateImpactWeightedZScore(
      player.field_goal_percentage,
      player.field_goals_attempted,
      allPlayers,
      'field_goal'
    );
    
    ftZScore = calculateImpactWeightedZScore(
      player.free_throw_percentage,
      player.free_throws_attempted,
      allPlayers,
      'free_throw'
    );
  }

  const weightedZScores = [
    player.zscore_points * multipliers.points,
    player.zscore_rebounds * multipliers.rebounds,
    player.zscore_assists * multipliers.assists,
    player.zscore_steals * multipliers.steals,
    player.zscore_blocks * multipliers.blocks,
    player.zscore_turnovers * multipliers.turnovers,  // turnovers z-score already inverted in backend (uses top 40% then *-1)
    fgZScore * multipliers.field_goal_percentage,  // Use impact-weighted z-score
    ftZScore * multipliers.free_throw_percentage,   // Use impact-weighted z-score
    player.zscore_three_pm * multipliers.three_pointers_made
  ]

  // Return the average of all weighted z-scores
  return weightedZScores.reduce((sum, score) => sum + score, 0) / weightedZScores.length
}

/**
 * Calculate custom z-scores for all players in a dataset
 */
export function calculateCustomZScoresForPlayers(
  players: PlayerStatsForZScore[],
  multipliers: StatMultipliers
): (PlayerStatsForZScore & { custom_zscore_total: number })[] {
  return players.map(player => ({
    ...player,
    custom_zscore_total: calculateCustomZScore(player, multipliers, players)  // Pass all players for impact weighting
  }))
}

/**
 * Get a readable description of the current multiplier settings
 */
export function getMultiplierDescription(multipliers: StatMultipliers): string {
  const descriptions = []
  
  if (multipliers.points !== 1.0) descriptions.push(`Points: ${multipliers.points}x`)
  if (multipliers.rebounds !== 1.0) descriptions.push(`Rebounds: ${multipliers.rebounds}x`)
  if (multipliers.assists !== 1.0) descriptions.push(`Assists: ${multipliers.assists}x`)
  if (multipliers.steals !== 1.0) descriptions.push(`Steals: ${multipliers.steals}x`)
  if (multipliers.blocks !== 1.0) descriptions.push(`Blocks: ${multipliers.blocks}x`)
  if (multipliers.turnovers !== -1.0) descriptions.push(`Turnovers: ${multipliers.turnovers}x`)
  if (multipliers.field_goal_percentage !== 0.5) descriptions.push(`FG%: ${multipliers.field_goal_percentage}x`)
  if (multipliers.free_throw_percentage !== 0.3) descriptions.push(`FT%: ${multipliers.free_throw_percentage}x`)
  if (multipliers.three_pointers_made !== 0.8) descriptions.push(`3PM: ${multipliers.three_pointers_made}x`)
  
  return descriptions.length > 0 ? descriptions.join(', ') : 'Default weights'
}
