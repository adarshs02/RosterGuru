'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutoCompleteSearch } from "./AutoCompleteSearch";
import { X } from "lucide-react";

// Predefined tags for basketball discussions with emojis
const PREDEFINED_TAGS = [
  { name: "MVP", emoji: "👑", color: "bg-yellow-500" },
  { name: "ROTY", emoji: "🌟", color: "bg-blue-500" },
  { name: "DPOY", emoji: "🛡️", color: "bg-green-500" },
  { name: "6MOY", emoji: "⚡", color: "bg-orange-500" },
  { name: "Analysis", emoji: "📊", color: "bg-purple-500" },
  { name: "Trade", emoji: "🔄", color: "bg-indigo-500" },
  { name: "Draft", emoji: "🎯", color: "bg-red-500" },
  { name: "Playoffs", emoji: "🏆", color: "bg-yellow-600" },
  { name: "Championship", emoji: "🏅", color: "bg-amber-500" },
  { name: "Stats", emoji: "📈", color: "bg-cyan-500" },
  { name: "Injury", emoji: "🏥", color: "bg-red-400" },
  { name: "Rookie", emoji: "🚀", color: "bg-emerald-500" },
  { name: "Veteran", emoji: "🎖️", color: "bg-gray-500" },
  { name: "Contract", emoji: "💰", color: "bg-green-600" },
  { name: "Free Agency", emoji: "🆓", color: "bg-blue-600" },
  { name: "All-Star", emoji: "⭐", color: "bg-pink-500" },
  { name: "Hall of Fame", emoji: "🏛️", color: "bg-purple-600" },
  { name: "Coaching", emoji: "📋", color: "bg-teal-500" },
  { name: "Team Chemistry", emoji: "🤝", color: "bg-orange-400" },
  { name: "Defense", emoji: "🔒", color: "bg-slate-600" },
  { name: "Offense", emoji: "⚔️", color: "bg-rose-500" },
  { name: "Clutch", emoji: "⏰", color: "bg-violet-500" },
  { name: "Leadership", emoji: "👨‍💼", color: "bg-blue-700" },
  { name: "Potential", emoji: "💎", color: "bg-cyan-400" },
  { name: "Comparison", emoji: "⚖️", color: "bg-lime-500" },
];

// Engagement tags that make posts stand out
const ENGAGEMENT_TAGS = [
  { name: "HOT", emoji: "🔥", color: "bg-gradient-to-r from-orange-500 to-red-500" },
  { name: "TRENDING", emoji: "📈", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
  { name: "VIRAL", emoji: "💥", color: "bg-gradient-to-r from-green-500 to-blue-500" },
  { name: "POPULAR", emoji: "⭐", color: "bg-gradient-to-r from-yellow-500 to-orange-500" },
  { name: "BREAKING", emoji: "🚨", color: "bg-gradient-to-r from-red-500 to-pink-500" },
  { name: "MUST READ", emoji: "📖", color: "bg-gradient-to-r from-indigo-500 to-purple-500" },
  { name: "CONTROVERSIAL", emoji: "⚡", color: "bg-gradient-to-r from-yellow-400 to-red-400" },
  { name: "EXCLUSIVE", emoji: "💎", color: "bg-gradient-to-r from-cyan-500 to-blue-500" },
  { name: "DEVELOPING", emoji: "📡", color: "bg-gradient-to-r from-teal-500 to-green-500" },
];

export interface CreateDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateDiscussionDialog: React.FC<CreateDiscussionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const router = useRouter();
  const [discussionType, setDiscussionType] = useState<"team" | "player">("player");
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [engagementTags, setEngagementTags] = useState<string[]>([]);
  const [selectedEngagementTag, setSelectedEngagementTag] = useState("");

  const handleAddTag = (tagToAdd: string) => {
    if (tagToAdd && !tags.includes(tagToAdd)) {
      setTags([...tags, tagToAdd]);
      setSelectedTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddEngagementTag = (tagToAdd: string) => {
    if (tagToAdd && !engagementTags.includes(tagToAdd)) {
      setEngagementTags([...engagementTags, tagToAdd]);
      setSelectedEngagementTag("");
    }
  };

  const handleRemoveEngagementTag = (tagToRemove: string) => {
    setEngagementTags(engagementTags.filter((tag) => tag !== tagToRemove));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const hasValidSubject = discussionType === "player"
      ? selectedPlayers.length > 0
      : selectedSubject;

    if (!hasValidSubject || !title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);

      let payload;
      if (discussionType === "player" && selectedPlayers.length > 0) {
        // Create one discussion with multiple players
        const playerIds = selectedPlayers.map(p => Number(p.nba_player_id || p.id));
        const playerNames = selectedPlayers.map(p => p.name).join(", ");

        payload = {
          subjectType: discussionType,
          playerIds, // Array of player IDs
          subjectName: playerNames, // Combined player names
          title: title.trim(),
          content: description.trim(),
          tags,
          engagementTags,
        };
      } else {
        // Single team discussion
        payload = {
          subjectType: discussionType,
          playerId: discussionType === "player" ? Number(selectedSubject.id) : undefined,
          teamAbbreviation: discussionType === "team" ? String(selectedSubject.name) : undefined,
          subjectName: selectedSubject?.name,
          title: title.trim(),
          content: description.trim(),
          tags,
          engagementTags,
        };
      }

      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Failed to create discussion", data?.error || res.statusText);
        return;
      }

      // Success: close, reset, refresh page to show new discussion
      onOpenChange(false);
      resetForm();
      router.refresh();
    } catch (e) {
      console.error("Unexpected error creating discussion", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
  };

  const resetForm = () => {
    setDiscussionType("player");
    setSelectedSubject(null);
    setSelectedPlayers([]);
    setTitle("");
    setDescription("");
    setTags([]);
    setSelectedTag("");
    setEngagementTags([]);
    setSelectedEngagementTag("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Discussion</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Discussion Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Discussion About</Label>
            <RadioGroup
              value={discussionType}
              onValueChange={(value) => {
                setDiscussionType(value as "team" | "player");
                setSelectedSubject(null);
              }}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="player" id="player" />
                <Label htmlFor="player">Player</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team">Team</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Auto Complete Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Search {discussionType === "player" ? "Player" : "Team"}
              {discussionType === "player" && " (Multiple allowed)"}
            </Label>
            {discussionType === "player" ? (
              <>
                <AutoCompleteSearch
                  type={discussionType}
                  onSelect={(player) => {
                    if (!selectedPlayers.find(p => p.id === player.id)) {
                      setSelectedPlayers([...selectedPlayers, player]);
                    }
                  }}
                  selectedItem={null}
                />
                {selectedPlayers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
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
                        <span className="font-medium text-sm">{player.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {player.position}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{player.team}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePlayer(player.id)}
                          className="h-6 w-6 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <AutoCompleteSearch
                type={discussionType}
                onSelect={setSelectedSubject}
                selectedItem={selectedSubject}
              />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="title"
              placeholder="Enter discussion title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="What would you like to discuss?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Engagement Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              🔥 Engagement Tags (Select up to 2)
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedEngagementTag}
                onValueChange={(value) => {
                  handleAddEngagementTag(value);
                }}
                disabled={engagementTags.length >= 2}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose an engagement tag..." />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_TAGS.filter((tag) => !engagementTags.includes(tag.name)).map((tag) => (
                    <SelectItem key={tag.name} value={tag.name}>
                      {tag.emoji} {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {engagementTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {engagementTags.map((tag) => {
                  const tagData = ENGAGEMENT_TAGS.find((t) => t.name === tag);
                  return (
                    <Badge
                      key={tag}
                      className={`text-xs cursor-pointer ${
                        tagData?.color || "bg-gradient-to-r from-orange-500 to-red-500"
                      } hover:opacity-80 text-white border-0 flex items-center gap-1`}
                      onClick={() => handleRemoveEngagementTag(tag)}
                    >
                      {tagData?.emoji || "🔥"} {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  );
                })}
              </div>
            )}
            {engagementTags.length >= 2 && (
              <p className="text-xs text-muted-foreground">
                Maximum of 2 engagement tags allowed
              </p>
            )}
          </div>

          {/* Topic Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Topic Tags (Select up to 5)</Label>
            <div className="flex gap-2">
              <Select
                value={selectedTag}
                onValueChange={(value) => {
                  handleAddTag(value);
                }}
                disabled={tags.length >= 5}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a topic tag..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_TAGS.filter((tag) => !tags.includes(tag.name)).map((tag) => (
                    <SelectItem key={tag.name} value={tag.name}>
                      {tag.emoji} {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => {
                  const tagData = PREDEFINED_TAGS.find((t) => t.name === tag);
                  return (
                    <Badge
                      key={tag}
                      className={`${tagData?.color || "bg-gray-500"} text-white text-xs flex items-center gap-1 hover:opacity-80 cursor-pointer border-0`}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tagData?.emoji || "🏀"} {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  );
                })}
              </div>
            )}
            {tags.length >= 5 && (
              <p className="text-xs text-muted-foreground">
                Maximum of 5 topic tags allowed
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                (discussionType === "player" ? selectedPlayers.length === 0 : !selectedSubject) ||
                !title.trim() ||
                !description.trim()
              }
            >
              {submitting ? "Creating..." : "Create Discussion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
