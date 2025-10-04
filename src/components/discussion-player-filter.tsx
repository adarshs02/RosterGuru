'use client';

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X } from "lucide-react";

interface Player {
  id: string;
  nba_player_id: number;
  name: string;
  position: string;
  team: string;
  photo?: string;
}

export default function DiscussionPlayerFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

  // Load initial player data
  useEffect(() => {
    setLoading(true);
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        setAllPlayers(data.players || []);

        // Check if there are player_ids in the URL (comma-separated)
        const playerIdsParam = searchParams.get("player_ids");
        if (playerIdsParam) {
          const playerIds = playerIdsParam.split(',').map(id => Number(id));
          const players = (data.players || []).filter((p: Player) =>
            playerIds.includes(p.nba_player_id)
          );
          setSelectedPlayers(players);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch players:", err);
        setLoading(false);
      });
  }, [searchParams]);

  // Filter players based on query (exclude already selected players)
  useEffect(() => {
    if (query.length > 0) {
      const selectedIds = selectedPlayers.map(p => p.id);
      const filtered = allPlayers.filter(
        (player) =>
          !selectedIds.includes(player.id) &&
          (player.name.toLowerCase().includes(query.toLowerCase()) ||
          player.team.toLowerCase().includes(query.toLowerCase()) ||
          player.position.toLowerCase().includes(query.toLowerCase()))
      );
      setResults(filtered);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query, allPlayers, selectedPlayers]);

  const handleSelectPlayer = (player: Player) => {
    const newSelectedPlayers = [...selectedPlayers, player];
    setSelectedPlayers(newSelectedPlayers);

    // Clear search immediately
    setQuery("");
    setResults([]);
    setShowResults(false);

    // Update URL with player filters (comma-separated)
    const params = new URLSearchParams();
    const playerIds = newSelectedPlayers.map(p => p.nba_player_id).join(',');
    params.set("player_ids", playerIds);
    router.push(`/discussion?${params.toString()}`);
  };

  const handleRemovePlayer = (playerId: string) => {
    const newSelectedPlayers = selectedPlayers.filter(p => p.id !== playerId);
    setSelectedPlayers(newSelectedPlayers);

    if (newSelectedPlayers.length === 0) {
      router.push("/discussion");
    } else {
      const params = new URLSearchParams();
      const playerIds = newSelectedPlayers.map(p => p.nba_player_id).join(',');
      params.set("player_ids", playerIds);
      router.push(`/discussion?${params.toString()}`);
    }
  };

  const handleClearAllFilters = () => {
    setSelectedPlayers([]);
    setQuery("");
    router.push("/discussion");
  };

  return (
    <div className="mb-6">
      <div className="relative max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Filter discussions by player..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length > 0 && setShowResults(true)}
            className="pl-10"
            disabled={loading}
          />
        </div>

        {showResults && results.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
            onMouseDown={(e) => e.preventDefault()}
          >
            {results.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                onClick={() => handleSelectPlayer(player)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={player.photo}
                    alt={player.name}
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {player.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{player.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {player.position}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{player.team}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showResults && results.length === 0 && query.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 p-3">
            <p className="text-sm text-muted-foreground">
              {selectedPlayers.length > 0 ? "No more players found" : "No players found"}
            </p>
          </div>
        )}
      </div>

      {selectedPlayers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedPlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2 p-2 pr-1 bg-muted rounded-md"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={player.photo}
                  alt={player.name}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs">
                  {player.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{player.name}</span>
                <Badge variant="outline" className="text-xs">
                  {player.position}
                </Badge>
                <span className="text-xs text-muted-foreground">{player.team}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePlayer(player.id)}
                className="h-6 w-6 ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAllFilters}
            className="h-auto py-1.5"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
