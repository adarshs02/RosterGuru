"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  Plus,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Reply,
  Share,
  Bookmark,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Mock discussion data with Reddit-like features
const discussions = [
  {
    id: 1,
    title: "Nikola Jokić vs Joel Embiid - Who's the better fantasy center?",
    content:
      "Looking at their stats this season, both are putting up incredible numbers. Jokić has the edge in assists and efficiency, while Embiid dominates in scoring. What do you think matters more for fantasy?",
    category: "Player Comparison",
    author: "FantasyGuru23",
    authorAvatar: "FG",
    replies: 47,
    views: 1203,
    upvotes: 156,
    downvotes: 12,
    userVote: null, // null, 'up', or 'down'
    lastActivity: "2 hours ago",
    isHot: true,
    isPinned: false,
    tags: ["Centers", "MVP Candidates"],
    comments: [
      {
        id: 101,
        author: "StatNerd42",
        authorAvatar: "SN",
        content:
          "Jokić all the way! His triple-double potential gives him a higher ceiling in fantasy. Plus his efficiency is unmatched.",
        upvotes: 23,
        downvotes: 3,
        userVote: null,
        timestamp: "1 hour ago",
        replies: [
          {
            id: 102,
            author: "EmbiidFan",
            authorAvatar: "EF",
            content:
              "But Embiid's scoring is more consistent. 30+ points almost every night!",
            upvotes: 8,
            downvotes: 1,
            userVote: null,
            timestamp: "45 minutes ago",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Best sleeper picks for the 2024 fantasy season",
    content:
      "Here are my top sleeper picks that could outperform their ADP. Looking for players with increased opportunity or improved efficiency.",
    category: "Strategy",
    author: "DraftMaster",
    authorAvatar: "DM",
    replies: 23,
    views: 856,
    upvotes: 89,
    downvotes: 5,
    userVote: null,
    lastActivity: "4 hours ago",
    isHot: false,
    isPinned: true,
    tags: ["Draft Strategy", "Sleepers"],
    comments: [],
  },
  {
    id: 3,
    title: "Lakers trade rumors - Impact on fantasy values",
    content:
      "With all the trade speculation around the Lakers, how should we value their players in fantasy? D'Angelo Russell and Austin Reaves could see big changes.",
    category: "Team Discussion",
    author: "TradeAnalyst",
    authorAvatar: "TA",
    replies: 31,
    views: 967,
    upvotes: 67,
    downvotes: 8,
    userVote: null,
    lastActivity: "6 hours ago",
    isHot: true,
    isPinned: false,
    tags: ["Lakers", "Trades"],
    comments: [],
  },
  {
    id: 4,
    title: "Injury report analysis - Week 15 implications",
    content:
      "Key injuries this week and how they affect player values. Kawhi Leonard out again, what does this mean for the Clippers rotation?",
    category: "Injury Updates",
    author: "InjuryTracker",
    authorAvatar: "IT",
    replies: 15,
    views: 542,
    upvotes: 34,
    downvotes: 2,
    userVote: null,
    lastActivity: "8 hours ago",
    isHot: false,
    isPinned: false,
    tags: ["Injuries", "Weekly Analysis"],
    comments: [],
  },
  {
    id: 5,
    title: "Rookie watch: Who's making the biggest fantasy impact?",
    content:
      "Victor Wembanyama is obviously #1, but who are the other rookies making waves in fantasy? Let's discuss the sleeper rookies.",
    category: "Rookies",
    author: "RookieScout",
    authorAvatar: "RS",
    replies: 19,
    views: 634,
    upvotes: 45,
    downvotes: 3,
    userVote: null,
    lastActivity: "12 hours ago",
    isHot: false,
    isPinned: false,
    tags: ["Rookies", "2024 Draft Class"],
    comments: [],
  },
];

const categories = [
  { name: "Player Comparison", count: 156, color: "bg-blue-100 text-blue-800" },
  { name: "Strategy", count: 89, color: "bg-green-100 text-green-800" },
  {
    name: "Team Discussion",
    count: 134,
    color: "bg-purple-100 text-purple-800",
  },
  { name: "Injury Updates", count: 67, color: "bg-red-100 text-red-800" },
  { name: "Rookies", count: 45, color: "bg-yellow-100 text-yellow-800" },
  { name: "Trade Analysis", count: 78, color: "bg-orange-100 text-orange-800" },
];

export default function DiscussionsPage() {
  const [sortBy, setSortBy] = useState("hot");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedThread, setExpandedThread] = useState<number | null>(null);
  const [votes, setVotes] = useState<{ [key: string]: "up" | "down" | null }>(
    {},
  );

  const handleVote = (threadId: number, voteType: "up" | "down") => {
    const key = `thread-${threadId}`;
    const currentVote = votes[key];

    if (currentVote === voteType) {
      // Remove vote if clicking same button
      setVotes((prev) => ({ ...prev, [key]: null }));
    } else {
      // Set new vote
      setVotes((prev) => ({ ...prev, [key]: voteType }));
    }
  };

  const handleCommentVote = (
    threadId: number,
    commentId: number,
    voteType: "up" | "down",
  ) => {
    const key = `comment-${threadId}-${commentId}`;
    const currentVote = votes[key];

    if (currentVote === voteType) {
      setVotes((prev) => ({ ...prev, [key]: null }));
    } else {
      setVotes((prev) => ({ ...prev, [key]: voteType }));
    }
  };

  const getNetVotes = (
    threadId: number,
    upvotes: number,
    downvotes: number,
  ) => {
    const key = `thread-${threadId}`;
    const userVote = votes[key];
    let netVotes = upvotes - downvotes;

    if (userVote === "up") netVotes += 1;
    else if (userVote === "down") netVotes -= 1;

    return netVotes;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Discussion Forums
          </h1>
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Discussion
          </button>
        </div>
        <p className="text-gray-600 max-w-2xl">
          Join the community discussion about NBA players, fantasy strategies,
          and league analysis. Share insights, ask questions, and connect with
          fellow fantasy basketball enthusiasts.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search discussions..."
                className="flex-1 border-none outline-none text-sm"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select className="border-none outline-none text-sm bg-transparent">
                <option>All Categories</option>
                <option>Player Comparison</option>
                <option>Strategy</option>
                <option>Team Discussion</option>
                <option>Injury Updates</option>
                <option>Rookies</option>
                <option>Trade Analysis</option>
              </select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <select
                className="border-none outline-none text-sm bg-transparent"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="hot">Hot</option>
                <option value="new">New</option>
                <option value="top">Top</option>
                <option value="rising">Rising</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Discussion List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Forum Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Discussions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-xs text-gray-500">+23 this week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-green-600">89</div>
                <p className="text-xs text-gray-500">Online now</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Replies
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">8,934</div>
                <p className="text-xs text-gray-500">+156 today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Hot Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-orange-600">12</div>
                <p className="text-xs text-gray-500">Trending now</p>
              </CardContent>
            </Card>
          </div>

          {/* Discussion Threads */}
          <div className="space-y-3">
            {discussions.map((discussion) => (
              <Card
                key={discussion.id}
                className={`hover:shadow-md transition-shadow ${discussion.isPinned ? "border-green-200 bg-green-50/30" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Voting Section */}
                    <div className="flex flex-col items-center gap-1 min-w-[40px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`p-1 h-8 w-8 ${votes[`thread-${discussion.id}`] === "up" ? "text-orange-600 bg-orange-100" : "text-gray-400 hover:text-orange-600"}`}
                        onClick={() => handleVote(discussion.id, "up")}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <span
                        className={`text-sm font-medium ${getNetVotes(discussion.id, discussion.upvotes, discussion.downvotes) > 0 ? "text-orange-600" : getNetVotes(discussion.id, discussion.upvotes, discussion.downvotes) < 0 ? "text-blue-600" : "text-gray-600"}`}
                      >
                        {getNetVotes(
                          discussion.id,
                          discussion.upvotes,
                          discussion.downvotes,
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`p-1 h-8 w-8 ${votes[`thread-${discussion.id}`] === "down" ? "text-blue-600 bg-blue-100" : "text-gray-400 hover:text-blue-600"}`}
                        onClick={() => handleVote(discussion.id, "down")}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {discussion.isPinned && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            📌 Pinned
                          </Badge>
                        )}
                        {discussion.isHot && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Hot
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {discussion.category}
                        </Badge>
                      </div>

                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                          {discussion.authorAvatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <span className="font-medium">
                              {discussion.author}
                            </span>
                            <span>•</span>
                            <span>{discussion.lastActivity}</span>
                          </div>
                          <h3
                            className="font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors cursor-pointer"
                            onClick={() =>
                              setExpandedThread(
                                expandedThread === discussion.id
                                  ? null
                                  : discussion.id,
                              )
                            }
                          >
                            {discussion.title}
                          </h3>
                          {expandedThread === discussion.id && (
                            <p className="text-gray-700 text-sm mb-3">
                              {discussion.content}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {discussion.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <button
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          onClick={() =>
                            setExpandedThread(
                              expandedThread === discussion.id
                                ? null
                                : discussion.id,
                            )
                          }
                        >
                          <MessageSquare className="w-4 h-4" />
                          {discussion.replies} comments
                        </button>
                        <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                          <Reply className="w-4 h-4" />
                          Reply
                        </button>
                        <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                          <Share className="w-4 h-4" />
                          Share
                        </button>
                        <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                          <Bookmark className="w-4 h-4" />
                          Save
                        </button>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {discussion.views} views
                        </div>
                      </div>

                      {/* Comments Section */}
                      {expandedThread === discussion.id &&
                        discussion.comments.length > 0 && (
                          <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
                            {discussion.comments.map((comment) => (
                              <div
                                key={comment.id}
                                className="bg-gray-50 rounded-lg p-3"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex flex-col items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`p-1 h-6 w-6 ${votes[`comment-${discussion.id}-${comment.id}`] === "up" ? "text-orange-600" : "text-gray-400"}`}
                                      onClick={() =>
                                        handleCommentVote(
                                          discussion.id,
                                          comment.id,
                                          "up",
                                        )
                                      }
                                    >
                                      <ChevronUp className="w-3 h-3" />
                                    </Button>
                                    <span className="text-xs">
                                      {comment.upvotes - comment.downvotes}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`p-1 h-6 w-6 ${votes[`comment-${discussion.id}-${comment.id}`] === "down" ? "text-blue-600" : "text-gray-400"}`}
                                      onClick={() =>
                                        handleCommentVote(
                                          discussion.id,
                                          comment.id,
                                          "down",
                                        )
                                      }
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-xs">
                                        {comment.authorAvatar}
                                      </div>
                                      <span className="font-medium text-sm">
                                        {comment.author}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        •
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {comment.timestamp}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-2">
                                      {comment.content}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <button className="hover:text-blue-600">
                                        Reply
                                      </button>
                                      <button className="hover:text-blue-600">
                                        Share
                                      </button>
                                    </div>

                                    {/* Nested Replies */}
                                    {comment.replies &&
                                      comment.replies.length > 0 && (
                                        <div className="mt-3 pl-4 border-l border-gray-300 space-y-2">
                                          {comment.replies.map((reply) => (
                                            <div
                                              key={reply.id}
                                              className="bg-white rounded p-2"
                                            >
                                              <div className="flex items-center gap-2 mb-1">
                                                <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-xs">
                                                  {reply.authorAvatar}
                                                </div>
                                                <span className="font-medium text-xs">
                                                  {reply.author}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  •
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {reply.timestamp}
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-700">
                                                {reply.content}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center pt-6">
            <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors">
              Load More Discussions
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-medium">{category.name}</span>
                  <Badge className={`text-xs ${category.color}`}>
                    {category.count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <div className="font-medium text-gray-900">FantasyGuru23</div>
                <div className="text-gray-600">
                  replied to "Jokić vs Embiid"
                </div>
                <div className="text-xs text-gray-500">2 minutes ago</div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">DraftMaster</div>
                <div className="text-gray-600">
                  started "Best sleeper picks"
                </div>
                <div className="text-xs text-gray-500">1 hour ago</div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">TradeAnalyst</div>
                <div className="text-gray-600">
                  replied to "Lakers trade rumors"
                </div>
                <div className="text-xs text-gray-500">3 hours ago</div>
              </div>
            </CardContent>
          </Card>

          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Contributors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  FG
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">FantasyGuru23</div>
                  <div className="text-xs text-gray-500">247 posts</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                  DM
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">DraftMaster</div>
                  <div className="text-xs text-gray-500">189 posts</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                  TA
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">TradeAnalyst</div>
                  <div className="text-xs text-gray-500">156 posts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
