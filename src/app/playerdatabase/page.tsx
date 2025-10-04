"use client";

import React, { useState, useEffect } from "react";
import BaseTable from "@/components/base-table";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPlayersWithStats, PlayerData } from '@/lib/playerData';
import CircleSpinner from "@/components/ui/circle-spinner";
import { calculateCustomZScoresForPlayers, DEFAULT_MULTIPLIERS, PlayerStatsForZScore } from '@/lib/zscoreCalculator';

// Available seasons for the year selector
const AVAILABLE_SEASONS = [
  "2024-25", "2023-24", "2022-23", "2021-22", "2020-21",
  "2019-20", "2018-19", "2017-18", "2016-17", "2015-16"
];

// Stats type options
type StatsType = "per_game" | "per_36" | "total";

// Type for player with custom z-score
type PlayerWithCustomZScore = PlayerData & { customZScore: number };

export default function PlayersPage() {
  const [selectedSeason, setSelectedSeason] = useState<string>("2024-25");
  const [statsType, setStatsType] = useState<StatsType>("per_game");
  const [topPlayer, setTopPlayer] = useState<PlayerWithCustomZScore | null>(null);
  const [topPlayerLoading, setTopPlayerLoading] = useState(true);

  // Fetch top z-score player
  useEffect(() => {
    const fetchTopPlayer = async () => {
      try {
        setTopPlayerLoading(true);
        const players = await fetchPlayersWithStats(selectedSeason, statsType);
        
        // Filter players with valid z-score data and calculate custom z-scores
        const playersWithZScores = players.filter(p => 
          p.zscore_points !== undefined && !isNaN(p.zscore_points)
        );
        
        if (playersWithZScores.length > 0) {
          // Convert PlayerData to PlayerStatsForZScore for batch calculation
          const playersAsZScoreInput: PlayerStatsForZScore[] = playersWithZScores.map(player => ({
            player_id: player.player_id.toString(),
            player_name: player.player_name,
            points: player.points,
            rebounds: player.rebounds,
            assists: player.assists,
            steals: player.steals,
            blocks: player.blocks,
            turnovers: player.turnovers,
            field_goal_percentage: player.field_goal_percentage,
            field_goals_attempted: player.field_goals_attempted,
            free_throw_percentage: player.free_throw_percentage,
            free_throws_attempted: player.free_throws_attempted,
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
          }));
          
          // Calculate custom z-scores using the same function as the table
          const withCustomZScores = calculateCustomZScoresForPlayers(playersAsZScoreInput, DEFAULT_MULTIPLIERS);
          
          // Map back to PlayerData format with custom z-scores
          const playersWithCustomZScores = playersWithZScores.map(player => {
            const customPlayer = withCustomZScores.find(p => p.player_id === player.player_id.toString());
            return {
              ...player,
              customZScore: customPlayer?.custom_zscore_total || 0
            };
          });
          
          // Sort by custom z-score descending and get the top player
          const sortedPlayers = playersWithCustomZScores.sort((a, b) => 
            b.customZScore - a.customZScore
          );
          setTopPlayer(sortedPlayers[0]);
        } else {
          setTopPlayer(null);
        }
      } catch (error) {
        console.error('Error fetching top player:', error);
        setTopPlayer(null);
      } finally {
        setTopPlayerLoading(false);
      }
    };

    // Only fetch for per_game and per_36 (total stats don't have z-scores)
    if (statsType !== 'total') {
      fetchTopPlayer();
    } else {
      setTopPlayer(null);
      setTopPlayerLoading(false);
    }
  }, [selectedSeason, statsType]);

  // Get display text for stats type
  const getStatsTypeDisplay = (type: StatsType) => {
    switch (type) {
      case "per_game": return "Per Game";
      case "per_36": return "Per 36 Min";
      case "total": return "Total Stats";
    }
  };

  // Stats type labels mapping
  const statsTypeLabels = {
    "per_game": "Per Game",
    "per_36": "Per 36 Min", 
    "total": "Total Stats"
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      {/* Header Section */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Player Database
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Comprehensive NBA player fantasy rankings. 
                Explore 10+ years of player performance data to make informed fantasy decisions.
                Use dynamic Z-Scores to compare players to your needs.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-sm">
                Dynamic Z-Score Player Database
              </Badge>
              <Badge variant="outline" className="text-sm">
                10+ Years Data
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Year Selector and Stats Toggle */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Year Selector */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700 min-w-fit">Season:</span>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select season">{selectedSeason}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_SEASONS.map((season) => (
                    <SelectItem key={season} value={season}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Debug info */}
              <span className="text-xs text-gray-500">({AVAILABLE_SEASONS.length} seasons available)</span>
            </div>

            {/* Stats Type Toggle */}
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700 min-w-fit">Stats:</span>
              <Tabs value={statsType} onValueChange={(value) => setStatsType(value as StatsType)} className="w-auto">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="per_game" className="text-xs px-3">Per Game</TabsTrigger>
                  <TabsTrigger value="per_36" className="text-xs px-3">Per 36</TabsTrigger>
                  <TabsTrigger value="total" className="text-xs px-3">Total</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </section>



      {/* Stats Overview Cards */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">435</div>
                <p className="text-xs text-gray-500 mt-1">Active this season</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Fantasy Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">12T 9CAT</div>
                <p className="text-xs text-gray-500 mt-1">H2H</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Top Z-Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPlayerLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <CircleSpinner size="sm" />
                  </div>
                ) : statsType === 'total' ? (
                  <>
                    <div className="text-2xl font-bold text-gray-400">N/A</div>
                    <p className="text-xs text-gray-500 mt-1">No z-scores for totals</p>
                  </>
                ) : topPlayer ? (
                  <>
                    <div className={`text-2xl font-bold ${
                      (topPlayer.customZScore || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(topPlayer.customZScore || 0) >= 0 ? '+' : ''}{(topPlayer.customZScore || 0).toFixed(1)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{topPlayer.player_name}</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-400">--</div>
                    <p className="text-xs text-gray-500 mt-1">No data available</p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Database Last Updated on
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">July 2025</div>
                <p className="text-xs text-gray-500 mt-1"></p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Player Table */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <BaseTable 
            title={`${selectedSeason} ${statsTypeLabels[statsType]} Stats`}
            showZScore={true}
            className="w-full"
            season={selectedSeason}
            statsType={statsType}
            searchTerm={""}
          />
        </div>
      </section>
      <Footer />
    </div>
  );
}
