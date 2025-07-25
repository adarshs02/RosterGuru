"use client"

import React, { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchPlayersWithStats, PlayerData, StatsType } from '@/lib/playerData'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BaseTableProps {
  title?: string
  showZScore?: boolean
  className?: string
  season?: string
  statsType?: StatsType
  searchTerm?: string
}

export default function BaseTable({
  title = "Player Statistics",
  showZScore = true,
  className = "",
  season = "2024-25",
  statsType = "per_game",
  searchTerm = ""
}: BaseTableProps) {
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data when season or statsType changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchPlayersWithStats(season, statsType)
        setPlayers(data)
      } catch (err) {
        console.error('Error fetching player data:', err)
        setError('Failed to load player data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [season, statsType])

  // Filter players based on search term
  const filteredPlayers = players.filter(player => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      player.player_name.toLowerCase().includes(searchLower) ||
      player.team.toLowerCase().includes(searchLower) ||
      player.position.some(pos => pos.toLowerCase().includes(searchLower))
    )
  })

  // Sort players by z-score (descending) or points for total stats
  const sortedPlayers = filteredPlayers.sort((a, b) => {
    // For total stats, sort by points since no z-score
    if (a.zscore_total === undefined || b.zscore_total === undefined) {
      return b.points - a.points
    }
    return b.zscore_total - a.zscore_total
  })

  // Helper function to format percentage stats
  const formatStat = (value: number, isPercentage = false): string => {
    if (isPercentage) {
      return `${(value * 100).toFixed(1)}%`
    }
    return value.toFixed(1)
  }

  // Helper function to get color coding for z-score cells
  const getZScoreColor = (zscore: number): string => {
    const absZscore = Math.abs(zscore)
    
    if (zscore > 0) {
      // Positive z-score (good) - green with intensity based on value
      if (absZscore >= 2) return 'bg-green-600 text-white'  // Very good
      if (absZscore >= 1.5) return 'bg-green-500 text-white'  // Good
      if (absZscore >= 1) return 'bg-green-400 text-white'   // Above average
      if (absZscore >= 0.5) return 'bg-green-300 text-gray-900'  // Slightly above
      return 'bg-green-100 text-gray-900'  // Barely above
    } else if (zscore < 0) {
      // Negative z-score (bad) - red with intensity based on value
      if (absZscore >= 2) return 'bg-red-600 text-white'     // Very bad
      if (absZscore >= 1.5) return 'bg-red-500 text-white'   // Bad
      if (absZscore >= 1) return 'bg-red-400 text-white'     // Below average
      if (absZscore >= 0.5) return 'bg-red-300 text-gray-900'   // Slightly below
      return 'bg-red-100 text-gray-900'   // Barely below
    } else {
      // Exactly 0 - neutral
      return 'bg-gray-100 text-gray-900'
    }
  }

  // Helper function to get year-over-year z-score trend indicator
  const getZScoreTrend = (current: number, previous?: number): { icon: string; color: string; title: string } => {
    if (!previous || previous === 0) {
      return { icon: '—', color: 'text-gray-400', title: 'No previous data' }
    }
    
    const percentChange = ((current - previous) / Math.abs(previous)) * 100
    
    if (percentChange > 25) {
      return { icon: '↗', color: 'text-green-600', title: `Up ${percentChange.toFixed(1)}%` }
    } else if (percentChange < -25) {
      return { icon: '↘', color: 'text-red-600', title: `Down ${Math.abs(percentChange).toFixed(1)}%` }
    } else {
      return { icon: '→', color: 'text-gray-600', title: `Stable ${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%` }
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500">Loading player data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="text-red-500">{error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-gray-600">
          Showing {sortedPlayers.length} players for {season} season
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">GP</TableHead>
                <TableHead className="text-right">MIN</TableHead>
                <TableHead className="text-right">PTS</TableHead>
                <TableHead className="text-right">REB</TableHead>
                <TableHead className="text-right">AST</TableHead>
                <TableHead className="text-right">STL</TableHead>
                <TableHead className="text-right">BLK</TableHead>
                <TableHead className="text-right">TO</TableHead>
                <TableHead className="text-right">FG%</TableHead>
                <TableHead className="text-right">3PM</TableHead>
                <TableHead className="text-right">FT%</TableHead>
                {showZScore && (
                  <>
                    <TableHead className="text-right">Z-Score (PG)</TableHead>
                    <TableHead className="text-right">Z-Score (P36)</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow key={player.player_id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{player.player_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{player.team}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {player.position.map((pos, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {pos}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{player.games_played}</TableCell>
                  <TableCell className="text-right">{formatStat(player.minutes)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.points)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.rebounds)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.assists)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.steals)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.blocks)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.turnovers)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.field_goal_percentage, true)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.three_pointers_made)}</TableCell>
                  <TableCell className="text-right">{formatStat(player.free_throw_percentage, true)}</TableCell>
                  {showZScore && (
                    <>
                      <TableCell className={`text-right ${player.zscore_per_game ? getZScoreColor(player.zscore_per_game) : ''}`}>
                        {player.zscore_per_game ? player.zscore_per_game.toFixed(2) : 'N/A'}
                      </TableCell>
                      <TableCell className={`text-right ${player.zscore_per_36 ? getZScoreColor(player.zscore_per_36) : ''}`}>
                        {player.zscore_per_36 ? player.zscore_per_36.toFixed(2) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const currentZScore = player.zscore_total || 0
                          const trend = getZScoreTrend(currentZScore, player.previous_year_zscore)
                          return (
                            <span 
                              className={`${trend.color} text-lg font-semibold cursor-help`}
                              title={trend.title}
                            >
                              {trend.icon}
                            </span>
                          )
                        })()} 
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {sortedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No players found matching your criteria.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
