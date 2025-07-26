"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePlayerWatchStatus, useAuth } from "@/lib/hooks/useWatchList";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Target,
  MessageSquare,
  User,
  Trophy,
  Star,
  Bookmark,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data structure for player profile (in real app, this would come from API)
interface PlayerSeasonStats {
  season: string;
  team: string;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fg_pct: number;
  ft_pct: number;
  three_pm: number;
  three_pa: number;
  three_pct: number;
  minutes: number;
  zscore: number;
}

interface PlayerProfile {
  id: string;
  name: string;
  team: string;
  position: string[];
  image: string;
  jersey: string;
  height: string;
  weight: string;
  age: number;
  experience: string;
  currentStats: {
    points: number;
    rebounds: number;
    assists: number;
    zscore: number;
  };
  trending: "up" | "down" | "stable";
  careerHighlights: {
    ppgHigh: { value: number; season: string };
    rpgHigh: { value: number; season: string };
    apgHigh: { value: number; season: string };
    zscoreHigh: { value: number; season: string };
  };
  seasonHistory: PlayerSeasonStats[];
  discussions: number;
  projections: number;
}

// Mock player data
const PLAYER_PROFILES: { [key: string]: PlayerProfile } = {
  "1": {
    id: "1",
    name: "Nikola Jokić",
    team: "DEN",
    position: ["C"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=jokic",
    jersey: "15",
    height: "6'11\"",
    weight: "284 lbs",
    age: 29,
    experience: "9 years",
    currentStats: {
      points: 26.4,
      rebounds: 12.4,
      assists: 9.0,
      zscore: 2.8,
    },
    trending: "up",
    careerHighlights: {
      ppgHigh: { value: 27.1, season: "2021-22" },
      rpgHigh: { value: 13.8, season: "2021-22" },
      apgHigh: { value: 9.8, season: "2022-23" },
      zscoreHigh: { value: 2.9, season: "2021-22" },
    },
    seasonHistory: [
      {
        season: "2024-25",
        team: "DEN",
        games: 45,
        points: 26.4,
        rebounds: 12.4,
        assists: 9.0,
        steals: 1.4,
        blocks: 0.7,
        turnovers: 3.0,
        fg_pct: 58.3,
        ft_pct: 81.7,
        three_pm: 1.2,
        three_pa: 3.4,
        three_pct: 35.3,
        minutes: 34.2,
        zscore: 2.8,
      },
      {
        season: "2023-24",
        team: "DEN",
        games: 79,
        points: 26.4,
        rebounds: 12.4,
        assists: 9.0,
        steals: 1.4,
        blocks: 0.9,
        turnovers: 3.2,
        fg_pct: 58.3,
        ft_pct: 81.7,
        three_pm: 1.2,
        three_pa: 3.6,
        three_pct: 35.9,
        minutes: 34.6,
        zscore: 2.8,
      },
      {
        season: "2022-23",
        team: "DEN",
        games: 69,
        points: 24.5,
        rebounds: 11.8,
        assists: 9.8,
        steals: 1.3,
        blocks: 0.7,
        turnovers: 3.6,
        fg_pct: 63.2,
        ft_pct: 82.2,
        three_pm: 1.1,
        three_pa: 3.0,
        three_pct: 38.3,
        minutes: 33.7,
        zscore: 2.6,
      },
      {
        season: "2021-22",
        team: "DEN",
        games: 74,
        points: 27.1,
        rebounds: 13.8,
        assists: 7.9,
        steals: 1.5,
        blocks: 0.9,
        turnovers: 3.8,
        fg_pct: 58.3,
        ft_pct: 81.0,
        three_pm: 1.0,
        three_pa: 2.8,
        three_pct: 33.7,
        minutes: 33.5,
        zscore: 2.9,
      },
      {
        season: "2020-21",
        team: "DEN",
        games: 72,
        points: 26.4,
        rebounds: 10.8,
        assists: 8.3,
        steals: 1.3,
        blocks: 0.7,
        turnovers: 3.1,
        fg_pct: 56.6,
        ft_pct: 86.8,
        three_pm: 1.1,
        three_pa: 3.2,
        three_pct: 38.8,
        minutes: 34.6,
        zscore: 2.4,
      },
    ],
    discussions: 47,
    projections: 23,
  },
};

function getPositionColor(position: string): string {
  const colors = {
    PG: "bg-blue-100 text-blue-800 border-blue-200",
    SG: "bg-green-100 text-green-800 border-green-200", 
    SF: "bg-yellow-100 text-yellow-800 border-yellow-200",
    PF: "bg-orange-100 text-orange-800 border-orange-200",
    C: "bg-red-100 text-red-800 border-red-200",
  };
  return colors[position as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
}

export default function PlayerProfilePage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  
  const playerId = params.id as string;
  const player = PLAYER_PROFILES[playerId];
  
  // Use Supabase-based watch list
  const { user, isAuthenticated } = useAuth();
  const { 
    isInWatchList, 
    isLoading: watchLoading, 
    error: watchError, 
    toggle 
  } = usePlayerWatchStatus(playerId);
  
  // Handle watch list toggle
  const handleToggleWatch = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to add players to your watch list!');
      return;
    }
    
    if (!player) return;
    
    try {
      await toggle({
        player_id: player.id,
        player_name: player.name,
        player_team: player.team,
        player_position: player.position,
      });
    } catch (error) {
      console.error('Error toggling watch list:', error);
      alert('Failed to update watch list. Please try again.');
    }
  };

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Player Not Found</h1>
          <p className="text-gray-600 mb-8">The player profile you're looking for doesn't exist.</p>
          <Link href="/players">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Player Profiles
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-10">
        <div className="container mx-auto px-4">
          <Link href="/players" className="inline-flex items-center text-blue-100 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Player Profiles
          </Link>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Player Image and Basic Info */}
            <div className="flex items-center gap-6">
              <img
                src={player.image}
                alt={player.name}
                className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-white/10 border-4 border-white/20"
              />
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-4xl lg:text-5xl font-bold">{player.name}</h1>
                  <button
                    onClick={handleToggleWatch}
                    disabled={watchLoading}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20 disabled:opacity-50"
                    title={isInWatchList ? "Remove from Watch List" : "Add to Watch List"}
                  >
                    <Bookmark 
                      className={`w-6 h-6 transition-colors ${
                        isInWatchList 
                          ? 'text-yellow-300 fill-yellow-300' 
                          : 'text-white'
                      }`} 
                    />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                    #{player.jersey} • {player.team}
                  </Badge>
                  <div className="flex gap-2">
                    {player.position.map((pos, idx) => (
                      <Badge
                        key={idx}
                        className="bg-white/10 text-white border-white/30"
                      >
                        {pos}
                      </Badge>
                    ))}
                  </div>
                  {player.trending === "up" && (
                    <TrendingUp className="w-5 h-5 text-green-300" />
                  )}
                  {player.trending === "down" && (
                    <TrendingDown className="w-5 h-5 text-red-300" />
                  )}
                </div>
                <div className="text-blue-100 space-y-1">
                  <p>{player.height} • {player.weight} • Age {player.age}</p>
                  <p>{player.experience} NBA experience</p>
                </div>
              </div>
            </div>

            {/* Current Season Stats */}
            <div className="lg:ml-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold">{player.currentStats.points}</div>
                  <div className="text-blue-200 text-sm">PPG</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold">{player.currentStats.rebounds}</div>
                  <div className="text-blue-200 text-sm">RPG</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold">{player.currentStats.assists}</div>
                  <div className="text-blue-200 text-sm">APG</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold">{player.currentStats.zscore.toFixed(1)}</div>
                  <div className="text-blue-200 text-sm">Z-Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Season Stats</TabsTrigger>
            <TabsTrigger value="gamelogs">Game Logs</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="highlights">Career Highlights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Last Season Stats */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Last Season Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const lastSeason = player.seasonHistory[player.seasonHistory.length - 1];
                      return (
                        <>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">{lastSeason.points.toFixed(1)}</div>
                            <div className="text-sm text-gray-600">PPG</div>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">{lastSeason.rebounds.toFixed(1)}</div>
                            <div className="text-sm text-gray-600">RPG</div>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">{lastSeason.assists.toFixed(1)}</div>
                            <div className="text-sm text-gray-600">APG</div>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">{lastSeason.zscore.toFixed(1)}</div>
                            <div className="text-sm text-gray-600">Z-Score</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-blue-600" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Team</span>
                    <Badge className="bg-blue-100 text-blue-800">{player.team}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discussions</span>
                    <span className="font-medium">{player.discussions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Projections</span>
                    <span className="font-medium">{player.projections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trending</span>
                    <div className="flex items-center gap-1">
                      {player.trending === "up" && (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 font-medium">Up</span>
                        </>
                      )}
                      {player.trending === "down" && (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          <span className="text-red-600 font-medium">Down</span>
                        </>
                      )}
                      {player.trending === "stable" && (
                        <span className="text-gray-600 font-medium">Stable</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Season Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Season-by-Season Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Season</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>GP</TableHead>
                        <TableHead>MIN</TableHead>
                        <TableHead>PTS</TableHead>
                        <TableHead>REB</TableHead>
                        <TableHead>AST</TableHead>
                        <TableHead>STL</TableHead>
                        <TableHead>BLK</TableHead>
                        <TableHead>TO</TableHead>
                        <TableHead>FG%</TableHead>
                        <TableHead>FT%</TableHead>
                        <TableHead>3PM</TableHead>
                        <TableHead>3P%</TableHead>
                        <TableHead>Z-Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {player.seasonHistory.map((season, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{season.season}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{season.team}</Badge>
                          </TableCell>
                          <TableCell>{season.games}</TableCell>
                          <TableCell>{season.minutes.toFixed(1)}</TableCell>
                          <TableCell>{season.points.toFixed(1)}</TableCell>
                          <TableCell>{season.rebounds.toFixed(1)}</TableCell>
                          <TableCell>{season.assists.toFixed(1)}</TableCell>
                          <TableCell>{season.steals.toFixed(1)}</TableCell>
                          <TableCell>{season.blocks.toFixed(1)}</TableCell>
                          <TableCell>{season.turnovers.toFixed(1)}</TableCell>
                          <TableCell>{season.fg_pct.toFixed(1)}%</TableCell>
                          <TableCell>{season.ft_pct.toFixed(1)}%</TableCell>
                          <TableCell>{season.three_pm.toFixed(1)}</TableCell>
                          <TableCell>{season.three_pct.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Badge 
                              className={`${
                                season.zscore >= 2.0 
                                  ? 'bg-green-100 text-green-800' 
                                  : season.zscore >= 1.0 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {season.zscore.toFixed(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Career Highlights Tab */}
          <TabsContent value="highlights" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    Career High PPG
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {player.careerHighlights.ppgHigh.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {player.careerHighlights.ppgHigh.season} season
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    Career High RPG
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {player.careerHighlights.rpgHigh.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {player.careerHighlights.rpgHigh.season} season
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    Career High APG
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {player.careerHighlights.apgHigh.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {player.careerHighlights.apgHigh.season} season
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    Peak Z-Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {player.careerHighlights.zscoreHigh.value.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {player.careerHighlights.zscoreHigh.season} season
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Game Logs Tab */}
          <TabsContent value="gamelogs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Recent Game Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-700">Date</th>
                        <th className="text-left p-3 font-medium text-gray-700">Opponent</th>
                        <th className="text-left p-3 font-medium text-gray-700">Result</th>
                        <th className="text-center p-3 font-medium text-gray-700">MIN</th>
                        <th className="text-center p-3 font-medium text-gray-700">PTS</th>
                        <th className="text-center p-3 font-medium text-gray-700">REB</th>
                        <th className="text-center p-3 font-medium text-gray-700">AST</th>
                        <th className="text-center p-3 font-medium text-gray-700">FG%</th>
                        <th className="text-center p-3 font-medium text-gray-700">3P%</th>
                        <th className="text-center p-3 font-medium text-gray-700">FT%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { date: "Jan 22", opponent: "vs LAL", result: "W 118-108", min: 38, pts: 28, reb: 4, ast: 11, fg: 65.2, tp: 42.9, ft: 90.0 },
                        { date: "Jan 19", opponent: "@ BOS", result: "L 102-125", min: 35, pts: 22, reb: 3, ast: 8, fg: 45.8, tp: 33.3, ft: 100.0 },
                        { date: "Jan 17", opponent: "vs MIA", result: "W 129-121", min: 41, pts: 35, reb: 5, ast: 13, fg: 58.3, tp: 50.0, ft: 87.5 },
                        { date: "Jan 14", opponent: "@ PHI", result: "W 106-104", min: 37, pts: 24, reb: 6, ast: 9, fg: 52.2, tp: 40.0, ft: 85.7 },
                        { date: "Jan 12", opponent: "vs NYK", result: "L 115-119", min: 39, pts: 31, reb: 2, ast: 10, fg: 48.9, tp: 36.4, ft: 92.3 },
                        { date: "Jan 9", opponent: "@ MIL", result: "W 127-110", min: 36, pts: 26, reb: 7, ast: 12, fg: 61.9, tp: 45.5, ft: 88.9 },
                        { date: "Jan 7", opponent: "vs CHI", result: "W 141-136", min: 42, pts: 38, reb: 4, ast: 15, fg: 64.3, tp: 55.6, ft: 95.0 },
                        { date: "Jan 4", opponent: "@ DET", result: "W 122-101", min: 33, pts: 19, reb: 8, ast: 7, fg: 50.0, tp: 25.0, ft: 100.0 },
                        { date: "Jan 2", opponent: "vs CLE", result: "L 108-114", min: 40, pts: 29, reb: 3, ast: 11, fg: 46.7, tp: 38.5, ft: 83.3 },
                        { date: "Dec 30", opponent: "@ ORL", result: "W 117-110", min: 37, pts: 25, reb: 5, ast: 9, fg: 55.6, tp: 44.4, ft: 90.9 }
                      ].map((game, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">{game.date}</td>
                          <td className="p-3 text-sm font-medium">{game.opponent}</td>
                          <td className="p-3 text-sm">
                            <span className={`font-medium ${
                              game.result.startsWith('W') ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {game.result}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-center">{game.min}</td>
                          <td className="p-3 text-sm text-center font-medium">{game.pts}</td>
                          <td className="p-3 text-sm text-center">{game.reb}</td>
                          <td className="p-3 text-sm text-center">{game.ast}</td>
                          <td className="p-3 text-sm text-center">{game.fg}%</td>
                          <td className="p-3 text-sm text-center">{game.tp}%</td>
                          <td className="p-3 text-sm text-center">{game.ft}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                    View Full Season Game Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Recent Discussions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="mb-4">No discussions available yet.</p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Start a Discussion
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Community Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="mb-4">No projections available yet.</p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Share a Projection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
