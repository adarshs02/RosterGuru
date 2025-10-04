"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Download,
  Plus,
  Eye,
  Star,
  Award,
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import { useState } from "react";

// Mock projection data
const communityProjections = [
  {
    player: "Nikola Jokić",
    team: "DEN",
    position: "C",
    communityAvg: {
      points: 26.8,
      rebounds: 12.1,
      assists: 8.9,
      zscore: 2.7,
    },
    userProjection: {
      points: 27.2,
      rebounds: 12.5,
      assists: 9.2,
      zscore: 2.8,
    },
    accuracy: 94,
    contributors: 156,
  },
  {
    player: "Luka Dončić",
    team: "DAL",
    position: "PG",
    communityAvg: {
      points: 32.1,
      rebounds: 8.4,
      assists: 8.2,
      zscore: 2.5,
    },
    userProjection: {
      points: 31.8,
      rebounds: 8.0,
      assists: 8.5,
      zscore: 2.4,
    },
    accuracy: 89,
    contributors: 142,
  },
  {
    player: "Giannis Antetokounmpo",
    team: "MIL",
    position: "PF",
    communityAvg: {
      points: 30.9,
      rebounds: 11.2,
      assists: 6.1,
      zscore: 2.4,
    },
    userProjection: {
      points: 31.5,
      rebounds: 11.8,
      assists: 5.8,
      zscore: 2.5,
    },
    accuracy: 91,
    contributors: 134,
  },
];

const recentUploads = [
  {
    user: "FantasyGuru23",
    title: "2024 Season Projections - Updated",
    players: 487,
    accuracy: 92,
    uploadDate: "2 hours ago",
  },
  {
    user: "StatMaster",
    title: "Post-Trade Deadline Adjustments",
    players: 156,
    accuracy: 88,
    uploadDate: "1 day ago",
  },
  {
    user: "DraftExpert",
    title: "Rookie Impact Projections",
    players: 45,
    accuracy: 85,
    uploadDate: "3 days ago",
  },
];

export default function ProjectionsPage() {
  const [activeTab, setActiveTab] = useState("community");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [filterPosition, setFilterPosition] = useState("all");

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Projection Sharing
          </h1>
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Upload className="w-4 h-4" />
            Upload Projections
          </button>
        </div>
        <p className="text-gray-600 max-w-2xl">
          Share your player projections with the community and compare them
          against consensus rankings. Track accuracy over time and discover the
          most reliable projection sources.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Projections
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-gray-500">+47 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600">234</div>
            <p className="text-xs text-gray-500">Active users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">87%</div>
            <p className="text-xs text-gray-500">Community average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Your Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-purple-600">92%</div>
            <p className="text-xs text-gray-500">Above average</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="community">Community Projections</TabsTrigger>
          <TabsTrigger value="upload">Upload Projections</TabsTrigger>
          <TabsTrigger value="compare">Compare & Analyze</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search players..."
                        className="flex-1 border-none outline-none text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select
                        className="border-none outline-none text-sm bg-transparent"
                        value={filterPosition}
                        onChange={(e) => setFilterPosition(e.target.value)}
                      >
                        <option value="all">All Positions</option>
                        <option value="PG">Point Guards</option>
                        <option value="SG">Shooting Guards</option>
                        <option value="SF">Small Forwards</option>
                        <option value="PF">Power Forwards</option>
                        <option value="C">Centers</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Top Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Top Community Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {communityProjections.map((projection, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedPlayer === projection.player
                            ? "border-blue-500 bg-blue-50"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedPlayer(
                            selectedPlayer === projection.player
                              ? null
                              : projection.player,
                          )
                        }
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {projection.player}
                              </h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {projection.team}
                                </Badge>
                                <Badge className="text-xs bg-blue-100 text-blue-800">
                                  {projection.position}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {projection.accuracy}%
                            </div>
                            <div className="text-xs text-gray-500">
                              accuracy
                            </div>
                          </div>
                        </div>

                        {selectedPlayer === projection.player && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold">
                                  {projection.communityAvg.points}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Community PTS
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold">
                                  {projection.communityAvg.rebounds}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Community REB
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold">
                                  {projection.communityAvg.assists}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Community AST
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>
                                  {projection.contributors} contributors
                                </span>
                              </div>
                              <div className="text-blue-600 font-medium">
                                Z-Score: +{projection.communityAvg.zscore}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentUploads.map((upload, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{upload.title}</h4>
                        <Badge className="text-xs bg-green-100 text-green-800">
                          {upload.accuracy}%
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>by {upload.user}</div>
                        <div>
                          {upload.players} players • {upload.uploadDate}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Top Contributors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Contributors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-semibold text-sm">
                      🥇
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">StatMaster</div>
                      <div className="text-xs text-gray-500">96% accuracy</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
                      🥈
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">FantasyGuru23</div>
                      <div className="text-xs text-gray-500">94% accuracy</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm">
                      🥉
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">DraftExpert</div>
                      <div className="text-xs text-gray-500">93% accuracy</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Your Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Drop your CSV file here
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload player projections in CSV format. Include columns
                      for player name, team, position, and statistical
                      categories.
                    </p>
                    <Button className="bg-blue-600 text-white hover:bg-blue-700">
                      Choose File
                    </Button>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>
                      Supported format: CSV with headers (Player, Team,
                      Position, Points, Rebounds, Assists, etc.)
                    </p>
                    <p>Maximum file size: 5MB</p>
                  </div>
                </CardContent>
              </Card>

              {/* Upload History */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Upload History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          My 2024 Season Projections
                        </div>
                        <div className="text-sm text-gray-600">
                          487 players • Uploaded 3 days ago
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">
                          92% accuracy
                        </Badge>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Mid-Season Updates</div>
                        <div className="text-sm text-gray-600">
                          156 players • Uploaded 1 week ago
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          89% accuracy
                        </Badge>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Upload Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upload Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <h4 className="font-medium mb-1">Required Columns:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Player Name</li>
                      <li>• Team</li>
                      <li>• Position</li>
                      <li>• Points, Rebounds, Assists</li>
                      <li>• Games Played</li>
                    </ul>
                  </div>
                  <div className="text-sm">
                    <h4 className="font-medium mb-1">Optional Columns:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Steals, Blocks, Turnovers</li>
                      <li>• FG%, FT%, 3PM</li>
                      <li>• Minutes</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Community Projections Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Community vs Your Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Player</th>
                          <th className="text-center p-2">Team</th>
                          <th className="text-center p-2">Pos</th>
                          <th className="text-center p-2">Community PTS</th>
                          <th className="text-center p-2">Your PTS</th>
                          <th className="text-center p-2">Diff</th>
                          <th className="text-center p-2">Contributors</th>
                          <th className="text-center p-2">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {communityProjections.map((projection, index) => {
                          const diff =
                            projection.userProjection.points -
                            projection.communityAvg.points;
                          return (
                            <tr
                              key={index}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-2 font-medium">
                                {projection.player}
                              </td>
                              <td className="text-center p-2">
                                <Badge variant="outline" className="text-xs">
                                  {projection.team}
                                </Badge>
                              </td>
                              <td className="text-center p-2">
                                <Badge className="text-xs bg-blue-100 text-blue-800">
                                  {projection.position}
                                </Badge>
                              </td>
                              <td className="text-center p-2">
                                {projection.communityAvg.points}
                              </td>
                              <td className="text-center p-2 font-medium">
                                {projection.userProjection.points}
                              </td>
                              <td
                                className={`text-center p-2 font-medium ${
                                  diff > 0
                                    ? "text-green-600"
                                    : diff < 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                }`}
                              >
                                {diff > 0 ? "+" : ""}
                                {diff.toFixed(1)}
                              </td>
                              <td className="text-center p-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Users className="w-3 h-3 text-gray-400" />
                                  {projection.contributors}
                                </div>
                              </td>
                              <td className="text-center p-2">
                                <span
                                  className={`font-medium ${
                                    projection.accuracy >= 90
                                      ? "text-green-600"
                                      : projection.accuracy >= 85
                                        ? "text-blue-600"
                                        : "text-orange-600"
                                  }`}
                                >
                                  {projection.accuracy}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Community vs Your Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Community vs Your Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Player</th>
                          <th className="text-center p-2">Team</th>
                          <th className="text-center p-2">Pos</th>
                          <th className="text-center p-2">Community PTS</th>
                          <th className="text-center p-2">Your PTS</th>
                          <th className="text-center p-2">Diff</th>
                          <th className="text-center p-2">Contributors</th>
                          <th className="text-center p-2">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {communityProjections.map((projection, index) => {
                          const diff =
                            projection.userProjection.points -
                            projection.communityAvg.points;
                          return (
                            <tr
                              key={index}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-2 font-medium">
                                {projection.player}
                              </td>
                              <td className="text-center p-2">
                                <Badge variant="outline" className="text-xs">
                                  {projection.team}
                                </Badge>
                              </td>
                              <td className="text-center p-2">
                                <Badge className="text-xs bg-blue-100 text-blue-800">
                                  {projection.position}
                                </Badge>
                              </td>
                              <td className="text-center p-2">
                                {projection.communityAvg.points}
                              </td>
                              <td className="text-center p-2 font-medium">
                                {projection.userProjection.points}
                              </td>
                              <td
                                className={`text-center p-2 font-medium ${
                                  diff > 0
                                    ? "text-green-600"
                                    : diff < 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                }`}
                              >
                                {diff > 0 ? "+" : ""}
                                {diff.toFixed(1)}
                              </td>
                              <td className="text-center p-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Users className="w-3 h-3 text-gray-400" />
                                  {projection.contributors}
                                </div>
                              </td>
                              <td className="text-center p-2">
                                <span
                                  className={`font-medium ${
                                    projection.accuracy >= 90
                                      ? "text-green-600"
                                      : projection.accuracy >= 85
                                        ? "text-blue-600"
                                        : "text-orange-600"
                                  }`}
                                >
                                  {projection.accuracy}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Analysis Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analysis Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Accuracy Tracker
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Trend Analysis
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="w-4 h-4 mr-2" />
                    Projection Builder
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Accuracy Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        rank: 1,
                        user: "StatMaster",
                        accuracy: 96,
                        projections: 487,
                        badge: "🥇",
                      },
                      {
                        rank: 2,
                        user: "FantasyGuru23",
                        accuracy: 94,
                        projections: 423,
                        badge: "🥈",
                      },
                      {
                        rank: 3,
                        user: "DraftExpert",
                        accuracy: 93,
                        projections: 356,
                        badge: "🥉",
                      },
                      {
                        rank: 4,
                        user: "DataWizard",
                        accuracy: 91,
                        projections: 298,
                        badge: "",
                      },
                      {
                        rank: 5,
                        user: "AnalyticsKing",
                        accuracy: 90,
                        projections: 267,
                        badge: "",
                      },
                      {
                        rank: 6,
                        user: "ProjectionPro",
                        accuracy: 89,
                        projections: 234,
                        badge: "",
                      },
                      {
                        rank: 7,
                        user: "StatGenius",
                        accuracy: 88,
                        projections: 198,
                        badge: "",
                      },
                      {
                        rank: 8,
                        user: "FantasyAce",
                        accuracy: 87,
                        projections: 176,
                        badge: "",
                      },
                    ].map((user) => (
                      <div
                        key={user.rank}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.badge || user.rank}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{user.user}</div>
                          <div className="text-sm text-gray-600">
                            {user.projections} projections
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              user.accuracy >= 95
                                ? "text-green-600"
                                : user.accuracy >= 90
                                  ? "text-blue-600"
                                  : "text-orange-600"
                            }`}
                          >
                            {user.accuracy}%
                          </div>
                          <div className="text-xs text-gray-500">accuracy</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Your Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">92%</div>
                    <div className="text-sm text-gray-600">Your Accuracy</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">#12</div>
                      <div className="text-xs text-gray-600">Rank</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">156</div>
                      <div className="text-xs text-gray-600">Projections</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Leaders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Most Accurate</span>
                    <span className="font-medium">StatMaster</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Most Active</span>
                    <span className="font-medium">FantasyGuru23</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rising Star</span>
                    <span className="font-medium">NewAnalyst</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
