'use client';

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronUp,
  ChevronDown,
  MessageCircle,
  User,
  Clock,
} from "lucide-react";

export interface Discussion {
  id: string;
  title: string;
  description: string;
  author: string;
  subject: {
    type: "player" | "team";
    name: string;
    team?: string;
    image?: string;
    images?: string[]; // For multiple players
    logo?: string;
  };
  tags: string[];
  engagementTags: string[];
  upvotes: number;
  downvotes: number;
  comments: number;
  createdAt: string;
  userVote?: 1 | -1 | 0;
}

interface DiscussionCardProps {
  discussion: Discussion;
}

export const DiscussionCard: React.FC<DiscussionCardProps> = ({ discussion }) => {
  const initialUserVote: "up" | "down" | null =
    discussion.userVote === 1 ? "up" : discussion.userVote === -1 ? "down" : null;
  const [userVote, setUserVote] = useState<"up" | "down" | null>(initialUserVote);
  const [currentUpvotes, setCurrentUpvotes] = useState(discussion.upvotes);
  const [currentDownvotes, setCurrentDownvotes] = useState(discussion.downvotes);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: "up" | "down") => {
    if (isVoting) return;
    setIsVoting(true);

    // Optimistic update
    const prevUserVote = userVote;
    const prevUp = currentUpvotes;
    const prevDown = currentDownvotes;

    // Apply optimistic changes
    if (prevUserVote === voteType) {
      // toggle off
      if (voteType === "up") setCurrentUpvotes((p) => p - 1);
      else setCurrentDownvotes((p) => p - 1);
      setUserVote(null);
    } else if (prevUserVote === null) {
      if (voteType === "up") setCurrentUpvotes((p) => p + 1);
      else setCurrentDownvotes((p) => p + 1);
      setUserVote(voteType);
    } else {
      // switch vote
      if (prevUserVote === "up") {
        setCurrentUpvotes((p) => p - 1);
        setCurrentDownvotes((p) => p + 1);
      } else {
        setCurrentDownvotes((p) => p - 1);
        setCurrentUpvotes((p) => p + 1);
      }
      setUserVote(voteType);
    }

    try {
      const value = voteType === "up" ? 1 : -1;
      const res = await fetch(`/api/discussions/${discussion.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (!res.ok) {
        // Revert on error
        setUserVote(prevUserVote);
        setCurrentUpvotes(prevUp);
        setCurrentDownvotes(prevDown);
        return;
      }

      const data = await res.json();
      if (
        typeof data.upvotes === "number" &&
        typeof data.downvotes === "number" &&
        (data.userVote === 1 || data.userVote === -1 || data.userVote === 0)
      ) {
        setCurrentUpvotes(data.upvotes);
        setCurrentDownvotes(data.downvotes);
        setUserVote(data.userVote === 1 ? "up" : data.userVote === -1 ? "down" : null);
      }
    } catch (e) {
      // Revert on error
      setUserVote(prevUserVote);
      setCurrentUpvotes(prevUp);
      setCurrentDownvotes(prevDown);
    } finally {
      setIsVoting(false);
    }
  };

  const netScore = currentUpvotes - currentDownvotes;

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/20 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Multiple player avatars or single avatar */}
            {discussion.subject.images && discussion.subject.images.length > 0 ? (
              <div className="flex -space-x-3">
                {discussion.subject.images.map((img, idx) => (
                  <Avatar key={idx} className="h-14 w-14 border-2 border-background ring-2 ring-white">
                    <AvatarImage src={img} alt={`Player ${idx + 1}`} />
                    <AvatarFallback>
                      {discussion.subject.name.split(',')[idx]?.trim().substring(0, 2).toUpperCase() || 'P'}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <Avatar className="h-14 w-14">
                <AvatarImage
                  src={
                    discussion.subject.type === "player"
                      ? discussion.subject.image
                      : discussion.subject.logo
                  }
                  alt={discussion.subject.name}
                />
                <AvatarFallback>
                  {discussion.subject.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight mb-1">
                {discussion.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{discussion.subject.name}</span>
                {discussion.subject.team && (
                  <>
                    <span>•</span>
                    <span>{discussion.subject.team}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-muted-foreground mb-4 leading-relaxed">
          {discussion.description}
        </p>

        {/* Engagement Tags */}
        {discussion.engagementTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {discussion.engagementTags.map((tag) => {
              const getEngagementTagStyle = (tagName: string) => {
                const styles: Record<string, { emoji: string; color: string }> = {
                  HOT: { emoji: "🔥", color: "bg-gradient-to-r from-orange-500 to-red-500" },
                  TRENDING: { emoji: "📈", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
                  VIRAL: { emoji: "💥", color: "bg-gradient-to-r from-green-500 to-blue-500" },
                  POPULAR: { emoji: "⭐", color: "bg-gradient-to-r from-yellow-500 to-orange-500" },
                  BREAKING: { emoji: "🚨", color: "bg-gradient-to-r from-red-500 to-pink-500" },
                  "MUST READ": { emoji: "📖", color: "bg-gradient-to-r from-indigo-500 to-purple-500" },
                  CONTROVERSIAL: { emoji: "⚡", color: "bg-gradient-to-r from-yellow-400 to-red-400" },
                  EXCLUSIVE: { emoji: "💎", color: "bg-gradient-to-r from-cyan-500 to-blue-500" },
                  DEVELOPING: { emoji: "📡", color: "bg-gradient-to-r from-teal-500 to-green-500" },
                };
                return styles[tagName] || { emoji: "🔥", color: "bg-gradient-to-r from-orange-500 to-red-500" };
              };

              const tagStyle = getEngagementTagStyle(tag);
              return (
                <Badge
                  key={tag}
                  className={`text-xs font-semibold ${tagStyle.color} hover:opacity-80 text-white border-0 animate-pulse`}
                >
                  {tagStyle.emoji} {tag}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Topic Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {discussion.tags.map((tag) => {
            const getTopicTagStyle = (tagName: string) => {
              const styles: Record<string, { emoji: string; color: string }> = {
                MVP: { emoji: "👑", color: "bg-yellow-500" },
                ROTY: { emoji: "🌟", color: "bg-blue-500" },
                DPOY: { emoji: "🛡️", color: "bg-green-500" },
                "6MOY": { emoji: "⚡", color: "bg-orange-500" },
                Analysis: { emoji: "📊", color: "bg-purple-500" },
                Trade: { emoji: "🔄", color: "bg-indigo-500" },
                Draft: { emoji: "🎯", color: "bg-red-500" },
                Playoffs: { emoji: "🏆", color: "bg-yellow-600" },
                Championship: { emoji: "🏅", color: "bg-amber-500" },
                Stats: { emoji: "📈", color: "bg-cyan-500" },
                Lakers: { emoji: "💜", color: "bg-purple-600" },
                Warriors: { emoji: "⚡", color: "bg-blue-600" },
                Rookies: { emoji: "🚀", color: "bg-emerald-500" },
                Awards: { emoji: "🏆", color: "bg-yellow-500" },
              };
              return styles[tagName] || { emoji: "🏀", color: "bg-gray-500" };
            };

            const tagStyle = getTopicTagStyle(tag);
            return (
              <Badge key={tag} className={`text-xs ${tagStyle.color} text-white border-0 hover:opacity-80`}>
                {tagStyle.emoji} {tag}
              </Badge>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Voting */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("up")}
                disabled={isVoting}
                className={`h-8 w-8 p-0 ${userVote === "up" ? "text-green-600" : ""}`}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <span
                className={`text-sm font-medium min-w-[2rem] text-center ${
                  netScore > 0 ? "text-green-600" : netScore < 0 ? "text-red-600" : ""
                }`}
              >
                {netScore}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("down")}
                disabled={isVoting}
                className={`h-8 w-8 p-0 ${userVote === "down" ? "text-red-600" : ""}`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Comments */}
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{discussion.comments}</span>
            </Button>
          </div>

          {/* Author and time */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{discussion.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{discussion.createdAt}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
