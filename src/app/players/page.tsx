"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
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
  Bookmark,
  BookmarkCheck,
  X,
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
import { fetchTopPlayers } from '@/lib/topPlayersApi';
import { TopPlayerData } from '@/app/api/players/top/route';
import { fetchAllPlayers, AllPlayerData } from '@/lib/allPlayersApi';
import { useUser } from '@clerk/nextjs';
import { useWatchList } from '@/lib/hooks/useWatchList';
import { WatchListPlayerInput } from '@/lib/api/watchListApi';
import { fetchPlayerSeasons, PlayerSeasonStats } from '@/lib/playerSeasonsApi';
import Spinner from '@/components/ui/spinner';
import CircleSpinner from '@/components/ui/circle-spinner';
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useWatchList";

// Type definition for player data
type PopularPlayerData = {
  id: string;
  player_id?: string; // Add the actual database UUID
  name: string;
  team: string;
  position: string[];
  image: string;
  points: number;
  rebounds: number;
  assists: number;
  zscore: number;
  trending: "up" | "down" | "stable";
  discussions: number;
  projections: number;
  // New fields from current_players table
  height: string | null;
  weight: string | null;
  age: number | null;
  jersey: string | null;
};

// API endpoint for fetching top players
const API_ENDPOINT = '/api/players/top';

// Convert TopPlayerData to PopularPlayerData format
const mapTopPlayerToPopularPlayer = (topPlayer: TopPlayerData): PopularPlayerData => {
  return {
    id: topPlayer.id,
    player_id: topPlayer.player_id.toString(), // Convert number to string
    name: topPlayer.name,
    team: topPlayer.team,
    position: topPlayer.position,
    image: topPlayer.image || '/api/placeholder/150/150', // Fallback for null images
    points: topPlayer.points,
    rebounds: topPlayer.rebounds,
    assists: topPlayer.assists,
    zscore: topPlayer.zscore_total, // Use zscore_total from TopPlayerData interface
    trending: "stable" as const, // Default trending status
    discussions: Math.floor(Math.random() * 20), // Mock data for now
    projections: Math.floor(Math.random() * 15), // Mock data for now
    // Add the new fields from the API
    height: topPlayer.height,
    weight: topPlayer.weight,
    age: topPlayer.age,
    jersey: topPlayer.jersey
  };
};

// Convert AllPlayerData to PopularPlayerData format
const mapAllPlayerToPopularPlayer = (allPlayer: AllPlayerData): PopularPlayerData => {
  return {
    id: allPlayer.id,
    player_id: allPlayer.player_id,
    name: allPlayer.name,
    team: allPlayer.team,
    position: allPlayer.position,
    image: allPlayer.image || '/api/placeholder/150/150',
    points: allPlayer.points,
    rebounds: allPlayer.rebounds,
    assists: allPlayer.assists,
    zscore: allPlayer.zscore_total,
    trending: allPlayer.trending,
    discussions: allPlayer.discussions,
    projections: allPlayer.projections,
    height: allPlayer.height,
    weight: allPlayer.weight,
    age: allPlayer.age,
    jersey: allPlayer.jersey
  };
};

// Type for API response
type TopPlayersApiResponse = {
  success: boolean;
  data: Record<string, PopularPlayerData>;
  meta: {
    season: string;
    count: number;
    limit: number;
  };
};

// Helper function to fetch popular players from API
const fetchPopularPlayers = async (): Promise<PopularPlayerData[]> => {
  try {
    const response = await fetchTopPlayers({ limit: 20 });
    
    // Convert dictionary response to array format expected by UI
    const playersArray = Object.values(response.data).map((player) => {
      return mapTopPlayerToPopularPlayer(player);
    });
    
    return playersArray;
  } catch (error) {
    console.error('Error fetching popular players:', error);
    throw error;
  }
};

// Get player profile data with real info from API
const getPlayerProfile = (playerId: string, popularPlayers: PopularPlayerData[], allPlayers: PopularPlayerData[], seasonDataDict: Record<string, any[]>) => {
  // First try to find in popular players, then in all players
  let player = popularPlayers.find((p: PopularPlayerData) => p.id === playerId);
  if (!player) {
    player = allPlayers.find((p: PopularPlayerData) => p.id === playerId);
  }
  if (!player) return null;

  return {
    ...player,
    jersey: player.jersey || "N/A",
    height: player.height || "N/A",
    weight: player.weight || "N/A",
    age: player.age || null,
    experience: "9 years", // Keep mock for now
    seasonHistory: (player as any).seasons ? (player as any).seasons.map((season: any) => ({
      season: season.season,
      games: season.games_played,
      points: season.points,
      rebounds: season.total_rebounds,
      assists: season.assists,
      zscore: season.zscore_total,
    })) : (
      // Fallback to seasonDataDict for popular players or empty array
      seasonDataDict[player.player_id || ''] || []
    ),
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
  const [popularPlayers, setPopularPlayers] = useState<PopularPlayerData[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PopularPlayerData[]>([]);
  const [allPlayers, setAllPlayers] = useState<PopularPlayerData[]>([]);
  const [filteredAllPlayers, setFilteredAllPlayers] = useState<PopularPlayerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [allPlayersLoading, setAllPlayersLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarTab, setSidebarTab] = useState<"popular" | "watchlist" | "all">("popular");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(["PG", "SG", "SF", "PF", "C"]);
  
  // Season data dictionary - preloaded for all players
  const [seasonDataDict, setSeasonDataDict] = useState<Record<string, PlayerSeasonStats[]>>({});
  const [seasonDataLoading, setSeasonDataLoading] = useState<boolean>(false);
  const [seasonDataError, setSeasonDataError] = useState<string | null>(null);
  
  // Integrate Supabase+Clerk watch list system
  const { user } = useUser();
  const { watchList, isLoading: watchListLoading, toggleWatchList: toggleWatchListAPI } = useWatchList();

  // Toggle watch list using Supabase+Clerk API
  const toggleWatchList = async (player: PopularPlayerData) => {
    if (!user) {
      // Handle unauthenticated users - could show login modal
      console.log('User must be logged in to use watch list');
      return;
    }

    try {
      const watchListPlayer: WatchListPlayerInput = {
        player_id: player.id,
        player_name: player.name,
        player_team: player.team,
        player_position: player.position,
      };
      
      await toggleWatchListAPI(watchListPlayer);
    } catch (error) {
      console.error('Error toggling watch list:', error);
    }
  };

  // Normalize text for search (remove accents, lowercase, trim)
  const normalizeText = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .toLowerCase()
      .trim();
  };

  // Clear search function
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredAllPlayers(allPlayers); // Reset all players filter
  };

  // Fetch all players data
  const fetchAllPlayersData = async (searchQuery: string = '') => {
    setAllPlayersLoading(true);
    try {
      const response = await fetchAllPlayers(500, searchQuery); // Fetch up to 500 players
      const allPlayersArray = Object.values(response.data).map(mapAllPlayerToPopularPlayer);
      setAllPlayers(allPlayersArray);
      setFilteredAllPlayers(allPlayersArray);
    } catch (error) {
      console.error('Error fetching all players:', error);
      setError('Failed to load all players data');
    } finally {
      setAllPlayersLoading(false);
    }
  };

  // Toggle position filter
  const togglePosition = (position: string) => {
    setSelectedPositions(prev => 
      prev.includes(position)
        ? prev.filter(pos => pos !== position)
        : [...prev, position]
    );
  };

  // Fetch popular players on component mount
  useEffect(() => {
    const loadPlayers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load popular players
        const players = await fetchPopularPlayers();
        setPopularPlayers(players);
        setFilteredPlayers(players);

        // Preload all players data (non-blocking)
        try {
          setAllPlayersLoading(true);
          const allPlayersResponse = await fetchAllPlayers(300); // Fetch up to 300 players (avoiding API limit)
          const allPlayersArray = Object.values(allPlayersResponse.data).map(mapAllPlayerToPopularPlayer);
          setAllPlayers(allPlayersArray);
          setFilteredAllPlayers(allPlayersArray);
          console.log(`Preloaded ${allPlayersArray.length} players for All Players tab`);
        } catch (allPlayersErr) {
          console.warn('Warning: Failed to preload all players (non-blocking):', allPlayersErr);
        } finally {
          setAllPlayersLoading(false);
        }
      } catch (err) {
        setError('Failed to load players');
        console.error('Error loading players:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, []);

  // Filter players based on search term and position filters
  useEffect(() => {
    // If user starts typing, switch to All Players tab and fetch data if needed
    if (searchTerm && sidebarTab !== 'all') {
      setSidebarTab('all');
      if (allPlayers.length === 0) {
        fetchAllPlayersData(searchTerm);
      }
    }

    // Filter popular players
    let filteredPopular = popularPlayers;

    // Apply position filter to popular players
    if (selectedPositions.length > 0 && selectedPositions.length < 5) {
      filteredPopular = filteredPopular.filter((player: PopularPlayerData) =>
        player.position.some((pos: string) => selectedPositions.includes(pos))
      );
    }

    // Apply search filter to popular players
    if (searchTerm) {
      const normalizedSearchTerm = normalizeText(searchTerm);
      filteredPopular = filteredPopular.filter(
        (player: PopularPlayerData) =>
          normalizeText(player.name).includes(normalizedSearchTerm) ||
          normalizeText(player.team).includes(normalizedSearchTerm) ||
          player.position.some((pos: string) =>
            normalizeText(pos).includes(normalizedSearchTerm)
          )
      );
    }

    setFilteredPlayers(filteredPopular);

    // Filter all players
    let filteredAll = allPlayers;

    // Apply position filter to all players
    if (selectedPositions.length > 0 && selectedPositions.length < 5) {
      filteredAll = filteredAll.filter((player: PopularPlayerData) =>
        player.position.some((pos: string) => selectedPositions.includes(pos))
      );
    }

    // Apply search filter to all players
    if (searchTerm) {
      const normalizedSearchTerm = normalizeText(searchTerm);
      filteredAll = filteredAll.filter(
        (player: PopularPlayerData) =>
          normalizeText(player.name).includes(normalizedSearchTerm) ||
          normalizeText(player.team).includes(normalizedSearchTerm) ||
          player.position.some((pos: string) =>
            normalizeText(pos).includes(normalizedSearchTerm)
          )
      );
    }

    setFilteredAllPlayers(filteredAll);
  }, [searchTerm, selectedPositions, popularPlayers, allPlayers, sidebarTab]);

  // Load all players data when the "All Players" tab is selected
  useEffect(() => {
    if (sidebarTab === 'all' && allPlayers.length === 0 && !allPlayersLoading) {
      fetchAllPlayersData();
    }
  }, [sidebarTab]);

  // Load all players data when user manually clicks "All Players" tab
  const handleTabChange = (value: "popular" | "watchlist" | "all") => {
    setSidebarTab(value);
    if (value === 'all' && allPlayers.length === 0 && !allPlayersLoading) {
      fetchAllPlayersData();
    }
  };

  // Preload season data for all players when popularPlayers loads
  useEffect(() => {
    const preloadSeasonData = async () => {
      if (popularPlayers.length === 0) {
        return; // Wait for popular players to load
      }

      if (Object.keys(seasonDataDict).length > 0) {
        return; // Already loaded
      }

      setSeasonDataLoading(true);
      setSeasonDataError(null);
      
      try {
        const seasonPromises = popularPlayers.map(async (player) => {
          if (!player.player_id) {
            console.warn(`No player_id for player: ${player.name}`);
            return { playerId: player.player_id, seasons: [] };
          }
          
          try {
            const response = await fetchPlayerSeasons(player.player_id);
            return { playerId: player.player_id, seasons: response.seasons };
          } catch (error) {
            console.error(`Error fetching season data for ${player.name}:`, error);
            return { playerId: player.player_id, seasons: [] };
          }
        });

        const seasonResults = await Promise.all(seasonPromises);
        
        // Build the dictionary
        const newSeasonDict: Record<string, PlayerSeasonStats[]> = {};
        seasonResults.forEach(result => {
          if (result.playerId) {
            newSeasonDict[result.playerId] = result.seasons;
          }
        });
        
        setSeasonDataDict(newSeasonDict);
        console.log(`Preloaded season data for ${Object.keys(newSeasonDict).length} players`);
      } catch (error) {
        console.error('Error preloading season data:', error);
        setSeasonDataError('Failed to load season data');
      } finally {
        setSeasonDataLoading(false);
      }
    };

    preloadSeasonData();
  }, [popularPlayers]);

  const playerProfile = selectedPlayer
    ? getPlayerProfile(selectedPlayer, popularPlayers, allPlayers, seasonDataDict)
    : null;

  // Show loading screen while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Players</h2>
            <p className="text-gray-500">Fetching the latest NBA player data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Error Loading Players</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
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
                Player Tracking
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
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for NBA players by name, team, or position..."
                className="pl-12 pr-12 py-3 text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Position Filters */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-600 mr-2">Filter by Position:</span>
                {["PG", "SG", "SF", "PF", "C"].map((position) => (
                  <button
                    key={position}
                    onClick={() => togglePosition(position)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedPositions.includes(position)
                        ? `${getPositionColor(position)} border`
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {position}
                  </button>
                ))}
                {selectedPositions.length < 5 && (
                  <button
                    onClick={() => setSelectedPositions(["PG", "SG", "SF", "PF", "C"])}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-600 border border-blue-200 hover:bg-blue-200 transition-colors ml-2"
                  >
                    Select All
                  </button>
                )}
                {selectedPositions.length === 5 && (
                  <button
                    onClick={() => setSelectedPositions([])}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors ml-2"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Popular Players / Watch List Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <Tabs value={sidebarTab} onValueChange={(value) => handleTabChange(value as "popular" | "watchlist" | "all")} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="popular" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Popular
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      All Players
                    </TabsTrigger>
                    <TabsTrigger value="watchlist" className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4" />
                      Watch List ({watchList.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={sidebarTab} className="w-full">
                  <TabsContent value="popular" className="mt-0">
                    <div className="max-h-[600px] overflow-y-auto scrollbar-hide hover:scrollbar-show smooth-scroll px-6 pb-6">
                      <div className="space-y-3 pt-6">
                        {filteredPlayers.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No players found matching your search.</p>
                          </div>
                        ) : (
                          filteredPlayers.map((player) => (
                            <div
                              key={player.id}
                              className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md relative ${
                                selectedPlayer === player.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              onClick={() => setSelectedPlayer(player.id)}
                            >
                              {/* Watch List Icon */}
                              <button
                                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWatchList(player);
                                }}
                              >
                                {watchList.some(w => w.player_id === player.id) ? (
                                  <BookmarkCheck className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Bookmark className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                                )}
                              </button>
                              
                              <div className="flex items-center gap-3">
                                <img
                                  src={player.image}
                                  alt={player.name}
                                  className="w-14 h-12 rounded-lg bg-gray-100 object-cover"
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
                                    {player.points} PTS • {player.rebounds} REB • {player.assists} AST
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
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="all" className="mt-0">
                    <div className="max-h-[600px] overflow-y-auto scrollbar-hide hover:scrollbar-show smooth-scroll px-6 pb-6">
                      <div className="space-y-3 pt-6">
                        {allPlayersLoading ? (
                          <div className="text-center py-8">
                            <CircleSpinner />
                            <p className="text-gray-500 mt-2">Loading all players...</p>
                          </div>
                        ) : filteredAllPlayers.length === 0 && searchTerm ? (
                          <div className="text-center py-8 text-gray-500">
                            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="mb-2">No players found matching "{searchTerm}".</p>
                            <p className="text-sm">Try searching for a different player name, team, or position.</p>
                          </div>
                        ) : filteredAllPlayers.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="mb-2">Start typing to search all NBA players.</p>
                            <p className="text-sm">Search by player name, team, or position to see all results.</p>
                          </div>
                        ) : (
                          filteredAllPlayers.map((player) => (
                            <div
                              key={player.id}
                              className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md relative ${
                                selectedPlayer === player.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              onClick={() => setSelectedPlayer(player.id)}
                            >
                              {/* Watch List Icon */}
                              <button
                                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWatchList(player);
                                }}
                              >
                                {watchList.some(w => w.player_id === player.id) ? (
                                  <Bookmark className="w-4 h-4 text-blue-500 fill-current" />
                                ) : (
                                  <Bookmark className="w-4 h-4 text-gray-400" />
                                )}
                              </button>

                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <img
                                    src={player.image}
                                    alt={player.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`;
                                    }}
                                  />
                                  {player.trending === "up" && (
                                    <TrendingUp className="w-3 h-3 text-green-500 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
                                  )}
                                  {player.trending === "down" && (
                                    <TrendingDown className="w-3 h-3 text-red-500 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
                                  )}
                                </div>
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
                                    {player.points} PTS • {player.rebounds} REB • {player.assists} AST
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
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="watchlist" className="mt-0">
                    <div className="max-h-[600px] overflow-y-auto scrollbar-hide hover:scrollbar-show smooth-scroll px-6 pb-6">
                      <div className="space-y-3 pt-6">
                        {watchListLoading ? (
                          <div className="text-center py-8">
                            <Spinner />
                            <p className="text-gray-500 mt-2">Loading watch list...</p>
                          </div>
                        ) : !user ? (
                          <div className="text-center py-8 text-gray-500">
                            <Bookmark className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="mb-2">Sign in to create a watch list.</p>
                            <p className="text-sm">Track your favorite players across devices.</p>
                          </div>
                        ) : watchList.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Bookmark className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="mb-2">Your watch list is empty.</p>
                            <p className="text-sm">Click the bookmark icon on any player to add them to your watch list.</p>
                          </div>
                        ) : (
                          watchList.map((watchListItem) => {
                            // Convert WatchListPlayer to PopularPlayerData format for UI consistency
                            const player: PopularPlayerData = {
                              id: watchListItem.player_id,
                              name: watchListItem.player_name,
                              team: watchListItem.player_team,
                              position: watchListItem.player_position,
                              image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${watchListItem.player_name}`, // Fallback image
                              points: 0, // These would need to be fetched from stats if needed
                              rebounds: 0,
                              assists: 0,
                              zscore: 0,
                              trending: "stable" as const,
                              discussions: 0,
                              projections: 0,
                              // New fields - would need to be fetched if required
                              height: null,
                              weight: null,
                              age: null,
                              jersey: null,
                            };
                            
                            return (
                              <div
                                key={watchListItem.id}
                                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md relative ${
                                  selectedPlayer === player.id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => setSelectedPlayer(player.id)}
                              >
                                {/* Remove from Watch List Icon */}
                                <button
                                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchList(player);
                                  }}
                                >
                                  <BookmarkCheck className="w-4 h-4 text-blue-600 hover:text-red-600" />
                                </button>
                                
                                <div className="flex items-center gap-3">
                                  <img
                                    src={player.image}
                                    alt={player.name}
                                    className="w-14 h-12 rounded-lg bg-gray-100 object-cover"
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
                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                      <span>{player.points} PTS • {player.rebounds} REB • {player.assists} AST</span>
                                      <div className="flex items-center gap-3">
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
                            );
                          })
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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
                        className="w-24 h-20 rounded-lg bg-white/20 p-2 object-cover"
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
                          +{(playerProfile.zscore || 0).toFixed(2)}
                        </div>
                        <div className="text-white/80 text-sm mb-3">Z-Score</div>
                        <Link href={`/players/${selectedPlayer}`}>
                          <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                            <Eye className="w-4 h-4 mr-2" />
                            View Player Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Current Season Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Points Per Game
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {playerProfile.points}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Rebounds Per Game
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {playerProfile.rebounds}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Assists Per Game
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {playerProfile.assists}
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
                        <CardTitle>Last 3 Seasons Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          // Get current player's season data from the dictionary
                          if (!selectedPlayer) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <div className="mb-2">🏀 Select a player</div>
                                <p className="text-sm">Choose a player to view their season statistics.</p>
                              </div>
                            );
                          }

                          const player = popularPlayers.find(p => p.id === selectedPlayer);
                          if (!player || !player.player_id) {
                            return (
                              <div className="text-center py-8 text-red-500">
                                <div className="mb-2">⚠️ Player not found</div>
                                <p className="text-sm">Player information could not be loaded.</p>
                              </div>
                            );
                          }

                          // Check if we're still loading season data
                          if (seasonDataLoading) {
                            return (
                              <div className="flex items-center justify-center py-8">
                                <CircleSpinner size="md" className="mr-3" />
                                <span className="text-gray-600">Loading season data...</span>
                              </div>
                            );
                          }

                          // Check for general loading error
                          if (seasonDataError) {
                            return (
                              <div className="text-center py-8">
                                <div className="text-red-600 mb-2">⚠️ {seasonDataError}</div>
                                <button 
                                  onClick={() => window.location.reload()}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                  Retry
                                </button>
                              </div>
                            );
                          }

                          // Get season data for this specific player
                          const currentPlayerSeasonData = seasonDataDict[player.player_id] || [];
                          
                          if (currentPlayerSeasonData.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <div className="mb-2">📊 No season data available</div>
                                <p className="text-sm">Season statistics not found for this player.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Season</TableHead>
                                    <TableHead className="text-center">Team</TableHead>
                                    <TableHead className="text-center">GP</TableHead>
                                    <TableHead className="text-center">PTS</TableHead>
                                    <TableHead className="text-center">REB</TableHead>
                                    <TableHead className="text-center">AST</TableHead>
                                    <TableHead className="text-center">FG%</TableHead>
                                    <TableHead className="text-center">Z-Score</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {currentPlayerSeasonData.map((season: PlayerSeasonStats, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">
                                      {season.season}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                        {season.team_abbreviation}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {season.games_played}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {season.points.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {season.total_rebounds.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {season.assists.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {(season.field_goal_percentage * 100).toFixed(1)}%
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span
                                        className={`font-semibold ${
                                          season.zscore_total >= 2.0
                                            ? "text-green-600"
                                            : season.zscore_total >= 1.0
                                              ? "text-blue-600"
                                              : season.zscore_total >= 0
                                                ? "text-gray-600"
                                                : "text-red-600"
                                        }`}
                                      >
                                         {season.zscore_total >= 0 ? '+' : ''}{season.zscore_total.toFixed(2)}
                                       </span>
                                     </TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </div>
                          );
                        })()}
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
      <Footer />
    </div>
  );
}
