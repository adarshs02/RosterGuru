"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Target,
  User,
  Calendar,
  BarChart3,
  Eye,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPlayersWithStats, PlayerData } from "@/lib/playerData";
import Spinner from "@/components/ui/spinner";
import Link from "next/link";

// Mock popular players data
const POPULAR_PLAYERS = [
  {
    id: "1",
    name: "Nikola Jokić",
    team: "DEN",
    position: ["C"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=jokic",
    points: 26.4,
    rebounds: 12.4,
    assists: 9.0,
    zscore: 2.8,
    trending: "up",
    discussions: 47,
    projections: 23,
  },
  {
    id: "2",
    name: "Luka Dončić",
    team: "DAL",
    position: ["PG", "SG"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=luka",
    points: 32.4,
    rebounds: 8.2,
    assists: 9.1,
    zscore: 2.6,
    trending: "up",
    discussions: 52,
    projections: 31,
  },
  {
    id: "3",
    name: "Giannis Antetokounmpo",
    team: "MIL",
    position: ["PF", "C"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=giannis",
    points: 30.4,
    rebounds: 11.5,
    assists: 6.5,
    zscore: 2.5,
    trending: "stable",
    discussions: 38,
    projections: 19,
  },
  {
    id: "4",
    name: "Jayson Tatum",
    team: "BOS",
    position: ["SF", "PF"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=tatum",
    points: 26.9,
    rebounds: 8.1,
    assists: 4.9,
    zscore: 2.1,
    trending: "down",
    discussions: 29,
    projections: 15,
  },
  {
    id: "5",
    name: "Shai Gilgeous-Alexander",
    team: "OKC",
    position: ["PG", "SG"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=shai",
    points: 30.1,
    rebounds: 5.5,
    assists: 6.2,
    zscore: 2.3,
    trending: "up",
    discussions: 34,
    projections: 22,
  },
  {
    id: "6",
    name: "Anthony Davis",
    team: "LAL",
    position: ["PF", "C"],
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=ad",
    points: 24.7,
    rebounds: 12.6,
    assists: 3.5,
    zscore: 2.0,
    trending: "up",
    discussions: 25,
    projections: 18,
  },
];

// Mock player profile data
const getPlayerProfile = (playerId: string) => {
  const player = POPULAR_PLAYERS.find((p) => p.id === playerId);
  if (!player) return null;

  return {
    ...player,
    jersey: "15",
    height: "6'11\"",
    weight: "284 lbs",
    age: 29,
    experience: "9 years",
    seasonHistory: [
      {
        season: "2024-25",
        games: 45,
        points: 26.4,
        rebounds: 12.4,
        assists: 9.0,
        zscore: 2.8,
      },
      {
        season: "2023-24",
        games: 79,
        points: 26.4,
        rebounds: 12.4,
        assists: 9.0,
        zscore: 2.8,
      },
      {
        season: "2022-23",
        games: 69,
        points: 24.5,
        rebounds: 11.8,
        assists: 9.8,
        zscore: 2.6,
      },
      {
        season: "2021-22",
        games: 74,
        points: 27.1,
        rebounds: 13.8,
        assists: 7.9,
        zscore: 2.9,
      },
    ],
    discussions: [
      {
        id: 1,
        title: "Is Jokić the best center in fantasy?",
        replies: 23,
        views: 1203,
        author: "FantasyGuru23",
        time: "2h ago",
      },
      {
        id: 2,
        title: "Jokić triple-double streak analysis",
        replies: 15,
        views: 856,
        author: "StatMaster",
        time: "4h ago",
      },
      {
        id: 3,
        title: "Denver's playoff push impact on Jokić",
        replies: 31,
        views: 967,
        author: "NuggetsFan",
        time: "6h ago",
      },
    ],
    projections: [
      {
        id: 1,
        author: "ProAnalyst",
        points: 26.8,
        rebounds: 12.1,
        assists: 9.2,
        accuracy: 94,
        date: "2024-01-15",
      },
      {
        id: 2,
        author: "FantasyExpert",
        points: 25.9,
        rebounds: 12.8,
        assists: 8.7,
        accuracy: 89,
        date: "2024-01-14",
      },
      {
        id: 3,
        author: "StatWizard",
        points: 27.2,
        rebounds: 11.9,
        assists: 9.5,
        accuracy: 92,
        date: "2024-01-13",
      },
    ],
  };
};

// Position color mapping
const getPositionColor = (position: string): string => {
  const colors = {
    PG: "bg-blue-500 text-white",
    SG: "bg-green-500 text-white",
    SF: "bg-yellow-500 text-white",
    PF: "bg-indigo-500 text-white",
    C: "bg-purple-500 text-white",
  };
  return colors[position as keyof typeof colors] || "bg-gray-500 text-white";
};

export default function PlayersPage() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [filteredPlayers, setFilteredPlayers] = useState(POPULAR_PLAYERS);
  const [activeTab, setActiveTab] = useState("overview");

  // Filter players based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredPlayers(POPULAR_PLAYERS);
    } else {
      const filtered = POPULAR_PLAYERS.filter(
        (player) =>
          player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.position.some((pos) =>
            pos.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
      setFilteredPlayers(filtered);
    }
  }, [searchTerm]);

  const playerProfile = selectedPlayer
    ? getPlayerProfile(selectedPlayer)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header Section */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Player Profiles
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Search and explore detailed NBA player profiles with stats,
                discussions, and community projections.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-sm">
                <Star className="w-3 h-3 mr-1" />
                Popular Players
              </Badge>
              <Badge variant="outline" className="text-sm">
                <MessageSquare className="w-3 h-3 mr-1" />
                Community Discussions
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Target className="w-3 h-3 mr-1" />
                Expert Projections
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search for NBA players by name, team, or position..."
              className="pl-12 pr-4 py-3 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Popular Players Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {searchTerm
                    ? `Search Results (${filteredPlayers.length})`
                    : "Popular Players"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No players found matching your search.</p>
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <div
                      key={player.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedPlayer === player.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedPlayer(player.id)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={player.image}
                          alt={player.name}
                          className="w-12 h-12 rounded-full bg-gray-100"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                              {player.name}
                            </h3>
                            {player.trending === "up" && (
                              <TrendingUp className="w-3 h-3 text-green-500" />
                            )}
                            {player.trending === "down" && (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {player.team}
                            </Badge>
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
                          </div>
                          <div className="text-xs text-gray-600">
                            {player.points} PTS • {player.rebounds} REB •{" "}
                            {player.assists} AST
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span
                              className={`text-xs font-medium ${
                                player.zscore >= 2.0
                                  ? "text-green-600"
                                  : player.zscore >= 1.0
                                    ? "text-blue-600"
                                    : "text-gray-600"
                              }`}
                            >
                              Z-Score: +{player.zscore}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {player.discussions}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {player.projections}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Player Profile Main Content */}
          <div className="lg:col-span-2">
            {!selectedPlayer ? (
              <Card className="h-96">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">
                      Select a Player
                    </h3>
                    <p className="text-gray-500">
                      Choose a player from the list to view their detailed
                      profile, stats, and community discussions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : playerProfile ? (
              <div className="space-y-6">
                {/* Player Header */}
                <Card>
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white rounded-t-xl">
                    <div className="flex items-center gap-6">
                      <img
                        src={playerProfile.image}
                        alt={playerProfile.name}
                        className="w-20 h-20 rounded-full bg-white/20 p-2"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-2xl font-bold">
                            {playerProfile.name}
                          </h1>
                          <Badge className="bg-white/20 text-white border-white/30">
                            #{playerProfile.jersey}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-white/90 text-sm">
                          <span>{playerProfile.team}</span>
                          <span>•</span>
                          <span>{playerProfile.position.join("/")}</span>
                          <span>•</span>
                          <span>
                            {playerProfile.height}, {playerProfile.weight}
                          </span>
                          <span>•</span>
                          <span>Age {playerProfile.age}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold mb-1">
                          +{playerProfile.zscore}
                        </div>
                        <div className="text-white/80 text-sm">Z-Score</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Current Season Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {playerProfile.points}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        +2.1 vs last season
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Rebounds
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {playerProfile.rebounds}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        +0.6 vs last season
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Assists
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {playerProfile.assists}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <TrendingDown className="w-3 h-3" />
                        -0.8 vs last season
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Discussions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {playerProfile.discussions.length}
                      </div>
                      <div className="text-xs text-gray-600">
                        Active threads
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for Stats, Discussions, Projections */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Season History</TabsTrigger>
                    <TabsTrigger value="discussions">Discussions</TabsTrigger>
                    <TabsTrigger value="projections">Projections</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Last 4 Seasons Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Season</TableHead>
                                <TableHead className="text-center">
                                  GP
                                </TableHead>
                                <TableHead className="text-center">
                                  PTS
                                </TableHead>
                                <TableHead className="text-center">
                                  REB
                                </TableHead>
                                <TableHead className="text-center">
                                  AST
                                </TableHead>
                                <TableHead className="text-center">
                                  Z-Score
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {playerProfile.seasonHistory.map(
                                (season, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">
                                      {season.season}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {season.games}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {season.points}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {season.rebounds}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {season.assists}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span
                                        className={`font-semibold ${
                                          season.zscore >= 2.0
                                            ? "text-green-600"
                                            : season.zscore >= 1.0
                                              ? "text-blue-600"
                                              : "text-gray-600"
                                        }`}
                                      >
                                        +{season.zscore}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ),
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="discussions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Community Discussions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {playerProfile.discussions.map((discussion) => (
                            <div
                              key={discussion.id}
                              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <h4 className="font-medium mb-2">
                                {discussion.title}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {discussion.replies} replies
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  {discussion.views} views
                                </span>
                                <span>by {discussion.author}</span>
                                <span>•</span>
                                <span>{discussion.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="projections" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Community Projections
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Analyst</TableHead>
                                <TableHead className="text-center">
                                  PTS
                                </TableHead>
                                <TableHead className="text-center">
                                  REB
                                </TableHead>
                                <TableHead className="text-center">
                                  AST
                                </TableHead>
                                <TableHead className="text-center">
                                  Accuracy
                                </TableHead>
                                <TableHead className="text-center">
                                  Date
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {playerProfile.projections.map((projection) => (
                                <TableRow key={projection.id}>
                                  <TableCell className="font-medium">
                                    {projection.author}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {projection.points}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {projection.rebounds}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {projection.assists}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span
                                      className={`font-medium ${
                                        projection.accuracy >= 90
                                          ? "text-green-600"
                                          : projection.accuracy >= 80
                                            ? "text-blue-600"
                                            : "text-gray-600"
                                      }`}
                                    >
                                      {projection.accuracy}%
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center text-sm text-gray-600">
                                    {projection.date}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card className="h-96">
                <CardContent className="flex items-center justify-center h-full">
                  <Spinner size="lg" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
