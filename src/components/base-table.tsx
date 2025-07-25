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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Info, RotateCcw, ChevronUp, ChevronDown, Download } from "lucide-react"
import Spinner from "@/components/ui/spinner"
import ZScoreMultiplierEditor from './zscore-multiplier-editor'
import { 
  StatMultipliers, 
  DEFAULT_MULTIPLIERS, 
  calculateCustomZScoresForPlayers,
  PlayerStatsForZScore 
} from '@/lib/zscoreCalculator'

// Position color mapping
const getPositionColor = (position: string): string => {
  const colors = {
    PG: "bg-blue-500 text-white hover:bg-blue-600",
    SG: "bg-green-500 text-white hover:bg-green-600", 
    SF: "bg-yellow-500 text-white hover:bg-yellow-600",
    PF: "bg-indigo-500 text-white hover:bg-indigo-600",
    C: "bg-purple-500 text-white hover:bg-purple-600",
  };
  return colors[position as keyof typeof colors] || "bg-gray-500 text-white hover:bg-gray-600";
};

// Sortable column header component
const SortableHeader = ({ 
  column, 
  children, 
  sortColumn, 
  sortDirection, 
  onSort, 
  className = "" 
}: {
  column: string;
  children: React.ReactNode;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  className?: string;
}) => {
  const isActive = sortColumn === column;
  
  return (
    <TableHead 
      className={`cursor-pointer hover:bg-gray-50 select-none ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <div className="flex flex-col">
          <ChevronUp 
            className={`h-3 w-3 ${
              isActive && sortDirection === 'asc' 
                ? 'text-blue-600' 
                : 'text-gray-400'
            }`} 
          />
          <ChevronDown 
            className={`h-3 w-3 -mt-1 ${
              isActive && sortDirection === 'desc' 
                ? 'text-blue-600' 
                : 'text-gray-400'
            }`} 
          />
        </div>
      </div>
    </TableHead>
  );
};

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
  const [multipliers, setMultipliers] = useState<StatMultipliers>(DEFAULT_MULTIPLIERS)
  const [sortColumn, setSortColumn] = useState<string>('zscore_total')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [playersWithCustomZScores, setPlayersWithCustomZScores] = useState<PlayerData[]>([])

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc') // Default to descending for new column
    }
  }

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

  // Recalculate custom z-scores when multipliers or players change
  useEffect(() => {
    if (players.length > 0 && (statsType === 'per_game' || statsType === 'per_36')) {
      const playersAsZScoreInput: PlayerStatsForZScore[] = players.map(player => ({
        player_id: player.player_id.toString(),
        player_name: player.player_name,
        points: player.points,
        rebounds: player.rebounds,
        assists: player.assists,
        steals: player.steals,
        blocks: player.blocks,
        turnovers: player.turnovers,
        field_goal_percentage: player.field_goal_percentage,
        free_throw_percentage: player.free_throw_percentage,
        three_pointers_made: player.three_pointers_made,
        zscore_points: player.zscore_points,
        zscore_rebounds: player.zscore_rebounds,
        zscore_assists: player.zscore_assists,
        zscore_steals: player.zscore_steals,
        zscore_blocks: player.zscore_blocks,
        zscore_turnovers: player.zscore_turnovers,
        zscore_fg_pct: player.zscore_fg_pct,
        zscore_ft_pct: player.zscore_ft_pct,
        zscore_three_pm: player.zscore_three_pm
      }))
      
      const withCustomZScores = calculateCustomZScoresForPlayers(playersAsZScoreInput, multipliers)
      
      // Map back to PlayerData format with custom z-scores
      const updatedPlayers = players.map(player => {
        const customPlayer = withCustomZScores.find(p => p.player_id === player.player_id.toString())
        return {
          ...player,
          zscore_total: customPlayer?.custom_zscore_total || player.zscore_total
        }
      })
      
      setPlayersWithCustomZScores(updatedPlayers)
    } else {
      setPlayersWithCustomZScores(players)
    }
  }, [players, multipliers, statsType])

  // Helper function to check if current multipliers are custom (different from defaults)
  const isUsingCustomMultipliers = () => {
    return JSON.stringify(multipliers) !== JSON.stringify(DEFAULT_MULTIPLIERS)
  }

  // Reset multipliers to defaults
  const resetMultipliers = () => {
    setMultipliers(DEFAULT_MULTIPLIERS)
  }

  // Filter players based on search term
  const filteredPlayers = playersWithCustomZScores.filter(player => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      player.player_name.toLowerCase().includes(searchLower) ||
      player.team.toLowerCase().includes(searchLower) ||
      player.position.some(pos => pos.toLowerCase().includes(searchLower))
    )
  })

  // Create Z-Score-based rankings (always consistent regardless of current sort)
  const playersWithRanks = filteredPlayers.map((player, index) => ({
    ...player,
    zscoreRank: index + 1 // This will be updated after Z-Score sorting
  }))
  
  // Sort by Z-Score to establish consistent rankings
  const zscoreSortedPlayers = [...playersWithRanks].sort((a, b) => {
    if (statsType === 'total' || a.zscore_total === undefined || b.zscore_total === undefined) {
      return b.points - a.points
    }
    return b.zscore_total - a.zscore_total
  })
  
  // Assign Z-Score-based ranks
  zscoreSortedPlayers.forEach((player, index) => {
    player.zscoreRank = index + 1
  })

  // Sort players by selected column and direction
  const sortedPlayers = playersWithRanks.sort((a, b) => {
    let aValue: any, bValue: any;
    
    // Handle different sort columns
    switch (sortColumn) {
      case 'player_name':
        aValue = a.player_name;
        bValue = b.player_name;
        break;
      case 'team':
        aValue = a.team;
        bValue = b.team;
        break;
      case 'games_played':
        aValue = a.games_played;
        bValue = b.games_played;
        break;
      case 'minutes':
        aValue = a.minutes;
        bValue = b.minutes;
        break;
      case 'points':
        aValue = a.points;
        bValue = b.points;
        break;
      case 'rebounds':
        aValue = a.rebounds;
        bValue = b.rebounds;
        break;
      case 'assists':
        aValue = a.assists;
        bValue = b.assists;
        break;
      case 'steals':
        aValue = a.steals;
        bValue = b.steals;
        break;
      case 'blocks':
        aValue = a.blocks;
        bValue = b.blocks;
        break;
      case 'turnovers':
        aValue = a.turnovers;
        bValue = b.turnovers;
        break;
      case 'field_goal_percentage':
        aValue = a.field_goal_percentage;
        bValue = b.field_goal_percentage;
        break;
      case 'three_pointers_made':
        aValue = a.three_pointers_made;
        bValue = b.three_pointers_made;
        break;
      case 'free_throw_percentage':
        aValue = a.free_throw_percentage;
        bValue = b.free_throw_percentage;
        break;
      case 'zscore_total':
      default:
        // Default to custom z-score if available, otherwise points
        if (statsType === 'total' || a.zscore_total === undefined || b.zscore_total === undefined) {
          aValue = a.points;
          bValue = b.points;
        } else {
          aValue = a.zscore_total;
          bValue = b.zscore_total;
        }
        break;
    }
    
    // Handle sorting direction
    if (sortDirection === 'asc') {
      if (typeof aValue === 'string') {
        return aValue.localeCompare(bValue);
      }
      return aValue - bValue;
    } else {
      if (typeof aValue === 'string') {
        return bValue.localeCompare(aValue);
      }
      return bValue - aValue;
    }
  })

  // Helper function to format percentage stats
  const formatStat = (value: number, isPercentage = false): string => {
    if (isPercentage) {
      return `${(value * 100).toFixed(1)}%`
    }
    return value.toFixed(1)
  }

  // Helper function to get color coding for z-score cells with gradual intensity
  const getZScoreColor = (zscore: number): { className: string; style?: React.CSSProperties } => {
    const absZscore = Math.abs(zscore)
    
    // Cap the intensity at 3.0 to prevent overly saturated colors
    const cappedIntensity = Math.min(absZscore, 3.0)
    
    // Calculate opacity based on z-score value (0.1 to 0.8 range) with sharper intensity
    const opacity = Math.min(0.1 + (cappedIntensity * 0.8), 0.8)
    
    if (zscore > 0) {
      // Positive z-score (good) - green with gradual intensity
      return {
        className: 'text-black',
        style: { backgroundColor: `rgba(34, 197, 94, ${opacity.toFixed(2)})` }
      }
    } else if (zscore < 0) {
      // Negative z-score (bad) - red with gradual intensity  
      return {
        className: 'text-black',
        style: { backgroundColor: `rgba(239, 68, 68, ${opacity.toFixed(2)})` }
      }
    } else {
      // Exactly 0 - neutral with light gray
      return {
        className: 'text-black bg-gray-100'
      }
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
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-gray-600">
              Showing {sortedPlayers.length} players for {season} season
            </p>
          </div>
          {(statsType === 'per_game' || statsType === 'per_36') && showZScore && (
            <div className="flex items-center gap-2">
              <ZScoreMultiplierEditor
                multipliers={multipliers}
                onMultipliersChange={setMultipliers}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={resetMultipliers}
                disabled={!isUsingCustomMultipliers()}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          )}
        </div>
        {statsType === 'total' && showZScore && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Z-score calculations are not available for total stats. Please use the Per Game or Per 36 tables 
              to access customizable z-score analysis with adjustable stat weights.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <SortableHeader column="player_name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>
                  Player
                </SortableHeader>
                <SortableHeader column="team" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>
                  Team
                </SortableHeader>
                <TableHead>Position</TableHead>
                <SortableHeader column="games_played" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  GP
                </SortableHeader>
                <SortableHeader column="minutes" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  MIN
                </SortableHeader>
                <SortableHeader column="points" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  PTS
                </SortableHeader>
                <SortableHeader column="rebounds" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  REB
                </SortableHeader>
                <SortableHeader column="assists" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  AST
                </SortableHeader>
                <SortableHeader column="steals" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  STL
                </SortableHeader>
                <SortableHeader column="blocks" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  BLK
                </SortableHeader>
                <SortableHeader column="turnovers" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  TO
                </SortableHeader>
                <SortableHeader column="field_goal_percentage" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  FG%
                </SortableHeader>
                <SortableHeader column="three_pointers_made" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  3PM
                </SortableHeader>
                <SortableHeader column="free_throw_percentage" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                  FT%
                </SortableHeader>
                {showZScore && (
                  <>
                    {statsType === 'total' ? (
                      <>
                        <TableHead className="text-right">Z-Score (PG)</TableHead>
                        <TableHead className="text-right">Z-Score (P36)</TableHead>
                      </>
                    ) : (
                      <SortableHeader column="zscore_total" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          Z-Score
                          {isUsingCustomMultipliers() && (
                            <span className="text-xs text-blue-600 font-medium" title="Using custom weights">
                              *
                            </span>
                          )}
                        </div>
                      </SortableHeader>
                    )}
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow key={player.player_id}>
                  <TableCell className="font-medium">{player.zscoreRank}</TableCell>
                  <TableCell className="font-medium">{player.player_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{player.team}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {player.position.map((pos, idx) => (
                        <Badge 
                          key={idx} 
                          className={`text-xs ${getPositionColor(pos)}`}
                        >
                          {pos}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{player.games_played}</TableCell>
                  <TableCell className="text-right">{formatStat(player.minutes)}</TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_points !== undefined ? getZScoreColor(player.zscore_points).className : ''}`}
                    style={showZScore && player.zscore_points !== undefined ? getZScoreColor(player.zscore_points).style : {}}
                  >
                    {formatStat(player.points)}
                  </TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_rebounds !== undefined ? getZScoreColor(player.zscore_rebounds).className : ''}`}
                    style={showZScore && player.zscore_rebounds !== undefined ? getZScoreColor(player.zscore_rebounds).style : {}}
                  >
                    {formatStat(player.rebounds)}
                  </TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_assists !== undefined ? getZScoreColor(player.zscore_assists).className : ''}`}
                    style={showZScore && player.zscore_assists !== undefined ? getZScoreColor(player.zscore_assists).style : {}}
                  >
                    {formatStat(player.assists)}
                  </TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_steals !== undefined ? getZScoreColor(player.zscore_steals).className : ''}`}
                    style={showZScore && player.zscore_steals !== undefined ? getZScoreColor(player.zscore_steals).style : {}}
                  >
                    {formatStat(player.steals)}
                  </TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_blocks !== undefined ? getZScoreColor(player.zscore_blocks).className : ''}`}
                    style={showZScore && player.zscore_blocks !== undefined ? getZScoreColor(player.zscore_blocks).style : {}}
                  >
                    {formatStat(player.blocks)}
                  </TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_turnovers !== undefined ? getZScoreColor(player.zscore_turnovers).className : ''}`}
                    style={showZScore && player.zscore_turnovers !== undefined ? getZScoreColor(player.zscore_turnovers).style : {}}
                  >
                    {formatStat(player.turnovers)}
                  </TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_fg_pct !== undefined ? getZScoreColor(player.zscore_fg_pct).className : ''}`}
                    style={showZScore && player.zscore_fg_pct !== undefined ? getZScoreColor(player.zscore_fg_pct).style : {}}
                  >
                    {formatStat(player.field_goal_percentage, true)}
                  </TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_three_pm !== undefined ? getZScoreColor(player.zscore_three_pm).className : ''}`}
                    style={showZScore && player.zscore_three_pm !== undefined ? getZScoreColor(player.zscore_three_pm).style : {}}
                  >
                    {formatStat(player.three_pointers_made)}
                  </TableCell>
                  <TableCell 
                    className={`text-right ${showZScore && player.zscore_ft_pct !== undefined ? getZScoreColor(player.zscore_ft_pct).className : ''}`}
                    style={showZScore && player.zscore_ft_pct !== undefined ? getZScoreColor(player.zscore_ft_pct).style : {}}
                  >
                    {formatStat(player.free_throw_percentage, true)}
                  </TableCell>
                  {showZScore && (
                    <>
                      {statsType === 'total' ? (
                        <>
                          <TableCell 
                            className={`text-right ${player.zscore_per_game ? getZScoreColor(player.zscore_per_game).className : ''}`}
                            style={player.zscore_per_game ? getZScoreColor(player.zscore_per_game).style : {}}
                          >
                            {player.zscore_per_game ? player.zscore_per_game.toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell 
                            className={`text-right ${player.zscore_per_36 ? getZScoreColor(player.zscore_per_36).className : ''}`}
                            style={player.zscore_per_36 ? getZScoreColor(player.zscore_per_36).style : {}}
                          >
                            {player.zscore_per_36 ? player.zscore_per_36.toFixed(2) : 'N/A'}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell 
                          className={`text-right ${player.zscore_total !== undefined ? getZScoreColor(player.zscore_total).className : ''}`}
                          style={player.zscore_total !== undefined ? getZScoreColor(player.zscore_total).style : {}}
                        >
                          {player.zscore_total !== undefined ? player.zscore_total.toFixed(2) : 'N/A'}
                        </TableCell>
                      )}
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
