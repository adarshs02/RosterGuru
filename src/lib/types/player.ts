// Enhanced Player Types for Community Features
// These types correspond to the database schema for discussions, projections, and trends

export interface User {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  reputation_score: number;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  is_active: boolean;
}

export interface EnhancedPlayer {
  // Core player data (existing)
  player_id: string;
  nba_player_id: number;
  player_name: string;
  team_abbreviation: string;
  position: string[];
  
  // Enhanced profile data
  height?: string;
  weight?: string;
  age?: number;
  years_experience?: number;
  jersey_number?: string;
  injury_status?: string;
  is_active: boolean;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface PlayerDiscussion {
  id: string;
  player_id: string;
  author: User;
  title: string;
  content: string;
  category: 'analysis' | 'trade' | 'injury' | 'projection' | 'general';
  upvotes: number;
  downvotes: number;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  net_votes?: number;
  user_vote?: 'upvote' | 'downvote' | null;
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  author: User;
  content: string;
  upvotes: number;
  downvotes: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  net_votes?: number;
  user_vote?: 'upvote' | 'downvote' | null;
}

export interface PlayerProjection {
  id: string;
  player_id: string;
  author: User;
  season: string;
  
  // Projected stats
  projected_games?: number;
  projected_minutes?: number;
  projected_points?: number;
  projected_rebounds?: number;
  projected_assists?: number;
  projected_steals?: number;
  projected_blocks?: number;
  projected_turnovers?: number;
  projected_fg_percentage?: number;
  projected_ft_percentage?: number;
  projected_three_pm?: number;
  projected_three_percentage?: number;
  projected_true_shooting?: number;
  projected_usage_rate?: number;
  projected_zscore?: number;
  
  // Projection metadata
  confidence_level?: number; // 1-100
  methodology?: string;
  notes?: string;
  accuracy_score?: number; // post-season calculation
  
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  net_votes?: number;
  user_vote?: 'upvote' | 'downvote' | null;
}

export interface PlayerTrend {
  id: string;
  player_id: string;
  metric_name: 'zscore' | 'fantasy_rank' | 'trade_value' | 'popularity';
  metric_value: number;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'season';
  date: string;
  season?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface PlayerActivityMetrics {
  id: string;
  player_id: string;
  total_discussions: number;
  total_projections: number;
  total_views: number;
  popularity_score: number;
  sentiment_score: number;
  weekly_discussions: number;
  weekly_projections: number;
  weekly_views: number;
  date: string;
  created_at: string;
}

export interface UserVote {
  id: string;
  user_id: string;
  votable_type: 'discussion' | 'reply' | 'projection';
  votable_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

// Aggregated player profile for frontend consumption
export interface PlayerProfile {
  // Core player data
  player: EnhancedPlayer;
  
  // Current season stats (existing PlayerData interface)
  currentStats?: {
    season: string;
    games_played: number;
    minutes: number;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    field_goal_percentage: number;
    free_throw_percentage: number;
    three_pointers_made: number;
    three_point_percentage: number;
    true_shooting_percentage?: number;
    usage_percentage?: number;
    zscore_total?: number;
  };
  
  // Community features
  discussions: PlayerDiscussion[];
  projections: PlayerProjection[];
  trends: PlayerTrend[];
  activityMetrics?: PlayerActivityMetrics;
  
  // Aggregated community data
  communityMetrics: {
    totalDiscussions: number;
    totalProjections: number;
    averageProjection?: ProjectionSummary;
    sentimentScore: number;
    popularityRank?: number;
    trendingScore?: number;
  };
}

export interface ProjectionSummary {
  points: number;
  rebounds: number;
  assists: number;
  zscore: number;
  confidence: number;
  accuracy?: number;
  sampleSize: number;
}

// API request/response types
export interface CreateDiscussionRequest {
  player_id: string;
  title: string;
  content: string;
  category: PlayerDiscussion['category'];
}

export interface CreateProjectionRequest {
  player_id: string;
  season: string;
  projected_games?: number;
  projected_minutes?: number;
  projected_points?: number;
  projected_rebounds?: number;
  projected_assists?: number;
  projected_steals?: number;
  projected_blocks?: number;
  projected_turnovers?: number;
  projected_fg_percentage?: number;
  projected_ft_percentage?: number;
  projected_three_pm?: number;
  projected_three_percentage?: number;
  projected_true_shooting?: number;
  projected_usage_rate?: number;
  projected_zscore?: number;
  confidence_level?: number;
  methodology?: string;
  notes?: string;
}

export interface CreateReplyRequest {
  discussion_id: string;
  content: string;
}

export interface VoteRequest {
  votable_type: UserVote['votable_type'];
  votable_id: string;
  vote_type: UserVote['vote_type'];
}

// Filter and query types
export interface PlayerDiscussionFilters {
  category?: PlayerDiscussion['category'];
  author_id?: string;
  sort_by?: 'created_at' | 'upvotes' | 'reply_count' | 'view_count';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PlayerProjectionFilters {
  season?: string;
  author_id?: string;
  min_confidence?: number;
  sort_by?: 'created_at' | 'upvotes' | 'confidence_level' | 'accuracy_score';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PlayerTrendFilters {
  metric_name?: PlayerTrend['metric_name'];
  timeframe?: PlayerTrend['timeframe'];
  start_date?: string;
  end_date?: string;
  season?: string;
}

// Popular/trending players query types
export interface PopularPlayersQuery {
  timeframe: 'daily' | 'weekly' | 'monthly';
  metric: 'discussions' | 'projections' | 'views' | 'popularity_score';
  limit?: number;
}

export interface TrendingPlayersQuery {
  timeframe: 'daily' | 'weekly' | 'monthly';
  limit?: number;
}

// Response types for API endpoints
export interface PlayerProfileResponse {
  player: PlayerProfile;
  success: boolean;
  error?: string;
}

export interface PlayerDiscussionsResponse {
  discussions: PlayerDiscussion[];
  total: number;
  hasMore: boolean;
  success: boolean;
  error?: string;
}

export interface PlayerProjectionsResponse {
  projections: PlayerProjection[];
  summary: ProjectionSummary;
  total: number;
  hasMore: boolean;
  success: boolean;
  error?: string;
}

export interface PlayerTrendsResponse {
  trends: PlayerTrend[];
  success: boolean;
  error?: string;
}

export interface PopularPlayersResponse {
  players: Array<{
    player: EnhancedPlayer;
    metrics: PlayerActivityMetrics;
    rank: number;
  }>;
  success: boolean;
  error?: string;
}

// Real-time/live data types
export interface LivePlayerUpdate {
  player_id: string;
  update_type: 'discussion' | 'projection' | 'vote' | 'trend';
  data: any;
  timestamp: string;
}

// Component prop types
export interface PlayerDiscussionCardProps {
  discussion: PlayerDiscussion;
  onVote?: (discussionId: string, voteType: 'upvote' | 'downvote') => void;
  onReply?: (discussionId: string) => void;
  showPlayerName?: boolean;
}

export interface PlayerProjectionCardProps {
  projection: PlayerProjection;
  onVote?: (projectionId: string, voteType: 'upvote' | 'downvote') => void;
  showPlayerName?: boolean;
  showAccuracy?: boolean;
}

export interface PlayerTrendChartProps {
  trends: PlayerTrend[];
  metric: PlayerTrend['metric_name'];
  timeframe: PlayerTrend['timeframe'];
  height?: number;
}

// Export all existing PlayerData for backward compatibility
export * from '../playerData';
