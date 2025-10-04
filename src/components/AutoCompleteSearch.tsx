'use client';

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

type AutoType = 'team' | 'player';

export interface AutoCompleteSearchProps {
  type: AutoType;
  onSelect: (item: any) => void;
  selectedItem: any;
}

interface Player {
  id: string;
  nba_player_id: number;
  name: string;
  position: string;
  team: string;
  photo?: string;
}

// Mock data for teams (keeping for now)
const mockTeams = [
  {
    id: 1,
    name: "Los Angeles Lakers",
    logo: "https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=64&h=64&fit=crop",
  },
  {
    id: 2,
    name: "Golden State Warriors",
    logo: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=64&h=64&fit=crop",
  },
  {
    id: 3,
    name: "Phoenix Suns",
    logo: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=64&h=64&fit=crop",
  },
  {
    id: 4,
    name: "Milwaukee Bucks",
    logo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=64&h=64&fit=crop",
  },
];

export const AutoCompleteSearch: React.FC<AutoCompleteSearchProps> = ({
  type,
  onSelect,
  selectedItem,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all players when component mounts (only for player type)
  useEffect(() => {
    if (type === "player") {
      setLoading(true);
      fetch("/api/players")
        .then((res) => res.json())
        .then((data) => {
          setAllPlayers(data.players || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch players:", err);
          setLoading(false);
        });
    }
  }, [type]);

  useEffect(() => {
    if (query.length > 0) {
      if (type === "player") {
        // Filter players by query
        const filtered = allPlayers.filter(
          (player) =>
            player.name.toLowerCase().includes(query.toLowerCase()) ||
            player.team.toLowerCase().includes(query.toLowerCase()) ||
            player.position.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } else {
        // Filter teams (using mock data for now)
        const filtered = mockTeams.filter((team) =>
          team.name.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      }
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query, allPlayers, type]);

  const handleSelect = (item: any) => {
    onSelect(item);
    // Clear search for multi-select scenarios (when selectedItem is null)
    if (selectedItem === null) {
      setQuery("");
      setResults([]);
    } else {
      setQuery(item.name);
    }
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={`Search for a ${type}...`}
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
          {results.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
              onClick={() => handleSelect(item)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={type === "player" ? item.photo : item.logo}
                  alt={item.name}
                  className="object-cover"
                />
                <AvatarFallback>
                  {item.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.name}</p>
                {type === "player" && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.position}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{item.team}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 p-3">
          <p className="text-sm text-muted-foreground">No {type}s found</p>
        </div>
      )}

      {selectedItem && (
        <div className="mt-3 p-3 bg-muted rounded-md">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={type === "player" ? selectedItem.photo : selectedItem.logo}
                alt={selectedItem.name}
                className="object-cover"
              />
              <AvatarFallback>
                {selectedItem.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedItem.name}</p>
              {type === "player" && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {selectedItem.position}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedItem.team}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
