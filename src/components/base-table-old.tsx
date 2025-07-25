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

const supabaseUrl = 'https://your-supabase-instance.supabase.co';
const supabaseKey = 'your-supabase-key';
const supabaseSecret = 'your-supabase-secret';
const supabase = createClient(supabaseUrl, supabaseKey, supabaseSecret);
    rank: 1,
    player: "Nikola Jokić",
    team: "DEN",
    position: "C",
    points: 26.4,
    rebounds: 12.4,
    assists: 9.0,
    steals: 1.3,
    blocks: 0.9,
    turnovers: 3.2,
    fg_pct: 58.3,
    ft_pct: 82.2,
    three_pm: 0.9,
    zscore: 2.8,
    trend: "up",
  },
  {
    rank: 2,
    player: "Luka Dončić",
    team: "DAL",
    position: "PG",
    points: 32.4,
    rebounds: 8.2,
    assists: 8.0,
    steals: 1.4,
    blocks: 0.5,
    turnovers: 4.1,
    fg_pct: 45.7,
    ft_pct: 78.6,
    three_pm: 2.8,
    zscore: 2.6,
    trend: "neutral",
  },
  {
    rank: 3,
    player: "Giannis Antetokounmpo",
    team: "MIL",
    position: ["PF", "C"],
    points: 31.1,
    rebounds: 11.5,
    assists: 6.2,
    steals: 1.2,
    blocks: 1.1,
    turnovers: 3.8,
    fg_pct: 55.3,
    ft_pct: 64.5,
    three_pm: 0.6,
    zscore: 2.5,
    trend: "neutral",
  },
  {
    rank: 4,
    player: "Jayson Tatum",
    team: "BOS",
    position: ["SF", "PF"],
    points: 26.9,
    rebounds: 8.1,
    assists: 4.9,
    steals: 1.0,
    blocks: 0.6,
    turnovers: 2.9,
    fg_pct: 46.6,
    ft_pct: 81.3,
    three_pm: 3.1,
    zscore: 2.2,
    trend: "up",
  },
  {
    rank: 5,
    player: "Shai Gilgeous-Alexander",
    team: "OKC",
    position: "PG",
    points: 30.1,
    rebounds: 5.5,
    assists: 6.2,
    steals: 2.0,
    blocks: 0.9,
    turnovers: 2.8,
    fg_pct: 53.5,
    ft_pct: 87.4,
    three_pm: 1.3,
    zscore: 2.1,
    trend: "up",
  },
];

const getTrendIcon = (trend: "up" | "down" | "neutral") => {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case "down":
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

const getPositionColor = (position: string) => {
  const colors = {
    PG: "bg-blue-100 text-blue-800",
    SG: "bg-green-100 text-green-800",
    SF: "bg-yellow-100 text-yellow-800",
    PF: "bg-orange-100 text-orange-800",
    C: "bg-purple-100 text-purple-800",
  };
  return colors[position as keyof typeof colors] || "bg-gray-100 text-gray-800";
};

const renderPositions = (position: string | string[]) => {
  const positions = Array.isArray(position) ? position : [position];
  return (
    <div className="flex gap-2 justify-center flex-wrap items-center">
      {positions.map((pos, index) => (
        <Badge
          key={index}
          variant="outline"
          className={`text-xs px-2 py-1 ${getPositionColor(pos)}`}
        >
          {pos}
        </Badge>
      ))}
    </div>
  );
};

const getZScoreColor = (zscore: number) => {
  if (zscore >= 2.0) return "text-green-600 font-semibold";
  if (zscore >= 1.0) return "text-blue-600";
  if (zscore >= 0) return "text-gray-600";
  return "text-red-600";
};

export default function BaseTable({
  title = "Player Rankings",
  data = defaultPlayerData,
  showRankings = true,
  showZScore = true,
  className = "",
  season = "2024-25",
  statsType = "per_game",
  searchTerm = "",
}: BaseTableProps) {
  return (
    <Card className={`w-full bg-white ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {showRankings && (
                  <TableHead className="w-16 text-center">#</TableHead>
                )}
                <TableHead className="min-w-[180px]">Player</TableHead>
                <TableHead className="text-center">Team</TableHead>
                <TableHead className="text-center">Pos</TableHead>
                <TableHead className="text-center">PTS</TableHead>
                <TableHead className="text-center">REB</TableHead>
                <TableHead className="text-center">AST</TableHead>
                <TableHead className="text-center">STL</TableHead>
                <TableHead className="text-center">BLK</TableHead>
                <TableHead className="text-center">TO</TableHead>
                <TableHead className="text-center">FG%</TableHead>
                <TableHead className="text-center">FT%</TableHead>
                <TableHead className="text-center">3PM</TableHead>
                {showZScore && (
                  <TableHead className="text-center">Z-Score</TableHead>
                )}
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((player, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {showRankings && (
                    <TableCell className="text-center font-medium">
                      {player.rank}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-gray-900">{player.player}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {player.team}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {renderPositions(player.position)}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {player.points}
                  </TableCell>
                  <TableCell className="text-center">
                    {player.rebounds}
                  </TableCell>
                  <TableCell className="text-center">
                    {player.assists}
                  </TableCell>
                  <TableCell className="text-center">{player.steals}</TableCell>
                  <TableCell className="text-center">{player.blocks}</TableCell>
                  <TableCell className="text-center">{player.turnovers}</TableCell>
                  <TableCell className="text-center">
                    {player.fg_pct}%
                  </TableCell>
                  <TableCell className="text-center">
                    {player.ft_pct}%
                  </TableCell>
                  <TableCell className="text-center">
                    {player.three_pm}
                  </TableCell>
                  {showZScore && (
                    <TableCell
                      className={`text-center ${getZScoreColor(player.zscore)}`}
                    >
                      {player.zscore > 0 ? "+" : ""}
                      {player.zscore}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    {getTrendIcon(player.trend)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
