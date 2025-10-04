// Player Community API Layer
// Handles all API calls for discussions, projections, trends, and votes

import { createClient } from '../../../supabase/client';
import type {
  PlayerProfile,
  PlayerDiscussion,
  PlayerProjection,
  PlayerTrend,
  PlayerActivityMetrics,
  EnhancedPlayer,
  CreateDiscussionRequest,
  CreateProjectionRequest,
  CreateReplyRequest,
  VoteRequest,
  PlayerDiscussionFilters,
  PlayerProjectionFilters,
  PlayerTrendFilters,
  PopularPlayersQuery,
  TrendingPlayersQuery,
  PlayerProfileResponse,
  PlayerDiscussionsResponse,
  PlayerProjectionsResponse,
  PlayerTrendsResponse,
  PopularPlayersResponse,
  ProjectionSummary,
  DiscussionReply
} from '../types/player';

const supabase = createClient();

// ============================================================================
// PLAYER PROFILE FUNCTIONS
// ============================================================================

/**
 * Get comprehensive player profile with community data
 */
export async function getPlayerProfile(playerId: string): Promise<PlayerProfileResponse> {
  try {
    // Get basic player data
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (playerError) throw playerError;

    // Get current season stats (assuming 2024-25 is current)
    const { data: currentStats } = await supabase
      .from('per_game_stats')
      .select('*')
      .eq('player_id', playerId)
      .eq('season', '2024-25')
      .single();

    // Get recent discussions (last 10)
    const { data: discussions } = await supabase
      .from('player_discussions')
      .select(`
        *,
        author:users(*)
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent projections (last 10)
    const { data: projections } = await supabase
      .from('player_projections')
      .select(`
        *,
        author:users(*)
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent trends
    const { data: trends } = await supabase
      .from('player_trends')
      .select('*')
      .eq('player_id', playerId)
      .order('date', { ascending: false })
      .limit(30);

    // Get activity metrics
    const { data: activityMetrics } = await supabase
      .from('player_activity_metrics')
      .select('*')
      .eq('player_id', playerId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Calculate community metrics
    const totalDiscussions = discussions?.length || 0;
    const totalProjections = projections?.length || 0;
    
    let averageProjection: ProjectionSummary | undefined;
    if (projections && projections.length > 0) {
      const validProjections = projections.filter(p => p.projected_points && p.projected_rebounds && p.projected_assists);
      if (validProjections.length > 0) {
        averageProjection = {
          points: validProjections.reduce((sum, p) => sum + (p.projected_points || 0), 0) / validProjections.length,
          rebounds: validProjections.reduce((sum, p) => sum + (p.projected_rebounds || 0), 0) / validProjections.length,
          assists: validProjections.reduce((sum, p) => sum + (p.projected_assists || 0), 0) / validProjections.length,
          zscore: validProjections.reduce((sum, p) => sum + (p.projected_zscore || 0), 0) / validProjections.length,
          confidence: validProjections.reduce((sum, p) => sum + (p.confidence_level || 0), 0) / validProjections.length,
          sampleSize: validProjections.length
        };
      }
    }

    const profile: PlayerProfile = {
      player: player as EnhancedPlayer,
      currentStats: currentStats || undefined,
      discussions: discussions || [],
      projections: projections || [],
      trends: trends || [],
      activityMetrics: activityMetrics || undefined,
      communityMetrics: {
        totalDiscussions,
        totalProjections,
        averageProjection,
        sentimentScore: activityMetrics?.sentiment_score || 0,
        popularityRank: undefined, // TODO: Calculate rank
        trendingScore: activityMetrics?.popularity_score || 0
      }
    };

    return {
      player: profile,
      success: true
    };

  } catch (error: any) {
    console.error('Error fetching player profile:', error);
    return {
      player: {} as PlayerProfile,
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// DISCUSSION FUNCTIONS
// ============================================================================

/**
 * Get player discussions with filters
 */
export async function getPlayerDiscussions(
  playerId: string, 
  filters: PlayerDiscussionFilters = {}
): Promise<PlayerDiscussionsResponse> {
  try {
    let query = supabase
      .from('player_discussions')
      .select(`
        *,
        author:users(*)
      `)
      .eq('player_id', playerId);

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.author_id) {
      query = query.eq('author_id', filters.author_id);
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order === 'asc' ? { ascending: true } : { ascending: false };
    query = query.order(sortBy, sortOrder);

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: discussions, error, count } = await query;

    if (error) throw error;

    return {
      discussions: discussions || [],
      total: count || 0,
      hasMore: (discussions?.length || 0) === limit,
      success: true
    };

  } catch (error: any) {
    console.error('Error fetching discussions:', error);
    return {
      discussions: [],
      total: 0,
      hasMore: false,
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a new discussion
 */
export async function createDiscussion(discussionData: CreateDiscussionRequest): Promise<PlayerDiscussion | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('player_discussions')
      .insert({
        ...discussionData,
        author_id: user.user.id
      })
      .select(`
        *,
        author:users(*)
      `)
      .single();

    if (error) throw error;
    return data;

  } catch (error: any) {
    console.error('Error creating discussion:', error);
    return null;
  }
}

/**
 * Get discussion replies
 */
export async function getDiscussionReplies(discussionId: string): Promise<DiscussionReply[]> {
  try {
    const { data, error } = await supabase
      .from('discussion_replies')
      .select(`
        *,
        author:users(*)
      `)
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];

  } catch (error: any) {
    console.error('Error fetching replies:', error);
    return [];
  }
}

/**
 * Create a reply to a discussion
 */
export async function createReply(replyData: CreateReplyRequest): Promise<DiscussionReply | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('discussion_replies')
      .insert({
        ...replyData,
        author_id: user.user.id
      })
      .select(`
        *,
        author:users(*)
      `)
      .single();

    if (error) throw error;
    return data;

  } catch (error: any) {
    console.error('Error creating reply:', error);
    return null;
  }
}

// ============================================================================
// PROJECTION FUNCTIONS
// ============================================================================

/**
 * Get player projections with filters
 */
export async function getPlayerProjections(
  playerId: string,
  filters: PlayerProjectionFilters = {}
): Promise<PlayerProjectionsResponse> {
  try {
    let query = supabase
      .from('player_projections')
      .select(`
        *,
        author:users(*)
      `)
      .eq('player_id', playerId);

    // Apply filters
    if (filters.season) {
      query = query.eq('season', filters.season);
    }
    if (filters.author_id) {
      query = query.eq('author_id', filters.author_id);
    }
    if (filters.min_confidence) {
      query = query.gte('confidence_level', filters.min_confidence);
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order === 'asc' ? { ascending: true } : { ascending: false };
    query = query.order(sortBy, sortOrder);

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: projections, error, count } = await query;

    if (error) throw error;

    // Calculate summary
    let summary: ProjectionSummary = {
      points: 0,
      rebounds: 0,
      assists: 0,
      zscore: 0,
      confidence: 0,
      sampleSize: 0
    };

    if (projections && projections.length > 0) {
      const validProjections = projections.filter(p => p.projected_points && p.projected_rebounds && p.projected_assists);
      if (validProjections.length > 0) {
        summary = {
          points: validProjections.reduce((sum, p) => sum + (p.projected_points || 0), 0) / validProjections.length,
          rebounds: validProjections.reduce((sum, p) => sum + (p.projected_rebounds || 0), 0) / validProjections.length,
          assists: validProjections.reduce((sum, p) => sum + (p.projected_assists || 0), 0) / validProjections.length,
          zscore: validProjections.reduce((sum, p) => sum + (p.projected_zscore || 0), 0) / validProjections.length,
          confidence: validProjections.reduce((sum, p) => sum + (p.confidence_level || 0), 0) / validProjections.length,
          sampleSize: validProjections.length
        };
      }
    }

    return {
      projections: projections || [],
      summary,
      total: count || 0,
      hasMore: (projections?.length || 0) === limit,
      success: true
    };

  } catch (error: any) {
    console.error('Error fetching projections:', error);
    return {
      projections: [],
      summary: { points: 0, rebounds: 0, assists: 0, zscore: 0, confidence: 0, sampleSize: 0 },
      total: 0,
      hasMore: false,
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a new projection
 */
export async function createProjection(projectionData: CreateProjectionRequest): Promise<PlayerProjection | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('player_projections')
      .insert({
        ...projectionData,
        author_id: user.user.id
      })
      .select(`
        *,
        author:users(*)
      `)
      .single();

    if (error) throw error;
    return data;

  } catch (error: any) {
    console.error('Error creating projection:', error);
    return null;
  }
}

// ============================================================================
// TREND FUNCTIONS
// ============================================================================

/**
 * Get player trends
 */
export async function getPlayerTrends(
  playerId: string,
  filters: PlayerTrendFilters = {}
): Promise<PlayerTrendsResponse> {
  try {
    let query = supabase
      .from('player_trends')
      .select('*')
      .eq('player_id', playerId);

    // Apply filters
    if (filters.metric_name) {
      query = query.eq('metric_name', filters.metric_name);
    }
    if (filters.timeframe) {
      query = query.eq('timeframe', filters.timeframe);
    }
    if (filters.start_date) {
      query = query.gte('date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('date', filters.end_date);
    }
    if (filters.season) {
      query = query.eq('season', filters.season);
    }

    query = query.order('date', { ascending: false });

    const { data: trends, error } = await query;

    if (error) throw error;

    return {
      trends: trends || [],
      success: true
    };

  } catch (error: any) {
    console.error('Error fetching trends:', error);
    return {
      trends: [],
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// VOTING FUNCTIONS
// ============================================================================

/**
 * Vote on a discussion, reply, or projection
 */
export async function vote(voteData: VoteRequest): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Check if user has already voted
    const { data: existingVote } = await supabase
      .from('user_votes')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('votable_type', voteData.votable_type)
      .eq('votable_id', voteData.votable_id)
      .single();

    if (existingVote) {
      // Update existing vote
      const { error } = await supabase
        .from('user_votes')
        .update({ vote_type: voteData.vote_type })
        .eq('id', existingVote.id);

      if (error) throw error;
    } else {
      // Create new vote
      const { error } = await supabase
        .from('user_votes')
        .insert({
          user_id: user.user.id,
          ...voteData
        });

      if (error) throw error;
    }

    // Update vote counts on the target entity
    await updateVoteCounts(voteData.votable_type, voteData.votable_id);
    
    return true;

  } catch (error: any) {
    console.error('Error voting:', error);
    return false;
  }
}

/**
 * Update vote counts for a votable entity
 */
async function updateVoteCounts(votableType: string, votableId: string): Promise<void> {
  try {
    // Get vote counts
    const { data: votes } = await supabase
      .from('user_votes')
      .select('vote_type')
      .eq('votable_type', votableType)
      .eq('votable_id', votableId);

    if (!votes) return;

    const upvotes = votes.filter(v => v.vote_type === 'upvote').length;
    const downvotes = votes.filter(v => v.vote_type === 'downvote').length;

    // Update the target table
    let tableName: string;
    switch (votableType) {
      case 'discussion':
        tableName = 'player_discussions';
        break;
      case 'reply':
        tableName = 'discussion_replies';
        break;
      case 'projection':
        tableName = 'player_projections';
        break;
      default:
        return;
    }

    await supabase
      .from(tableName)
      .update({ upvotes, downvotes })
      .eq('id', votableId);

  } catch (error: any) {
    console.error('Error updating vote counts:', error);
  }
}

// ============================================================================
// POPULAR/TRENDING PLAYERS
// ============================================================================

/**
 * Get popular players based on community activity
 */
export async function getPopularPlayers(query: PopularPlayersQuery): Promise<PopularPlayersResponse> {
  try {
    const { data, error } = await supabase
      .from('player_activity_metrics')
      .select(`
        *,
        players!player_activity_metrics_player_id_fkey(*)
      `)
      .order(query.metric === 'popularity_score' ? 'popularity_score' : `weekly_${query.metric}`, { ascending: false })
      .limit(query.limit || 10);

    if (error) throw error;

    const players = data?.map((item, index) => ({
      player: item.players as EnhancedPlayer,
      metrics: item as PlayerActivityMetrics,
      rank: index + 1
    })) || [];

    return {
      players,
      success: true
    };

  } catch (error: any) {
    console.error('Error fetching popular players:', error);
    return {
      players: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Get trending players (those with recent activity spikes)
 */
export async function getTrendingPlayers(query: TrendingPlayersQuery): Promise<PopularPlayersResponse> {
  try {
    // This would require more complex logic to calculate "trending" based on activity changes
    // For now, return players with high recent activity
    const { data, error } = await supabase
      .from('player_activity_metrics')
      .select(`
        *,
        players!player_activity_metrics_player_id_fkey(*)
      `)
      .order('weekly_discussions', { ascending: false })
      .limit(query.limit || 10);

    if (error) throw error;

    const players = data?.map((item, index) => ({
      player: item.players as EnhancedPlayer,
      metrics: item as PlayerActivityMetrics,
      rank: index + 1
    })) || [];

    return {
      players,
      success: true
    };

  } catch (error: any) {
    console.error('Error fetching trending players:', error);
    return {
      players: [],
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search discussions across all players
 */
export async function searchDiscussions(searchTerm: string, limit: number = 20): Promise<PlayerDiscussion[]> {
  try {
    const { data, error } = await supabase
      .from('player_discussions')
      .select(`
        *,
        author:users(*),
        players!player_discussions_player_id_fkey(player_name)
      `)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];

  } catch (error: any) {
    console.error('Error searching discussions:', error);
    return [];
  }
}

/**
 * Search projections across all players
 */
export async function searchProjections(searchTerm: string, limit: number = 20): Promise<PlayerProjection[]> {
  try {
    const { data, error } = await supabase
      .from('player_projections')
      .select(`
        *,
        author:users(*),
        players!player_projections_player_id_fkey(player_name)
      `)
      .or(`methodology.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];

  } catch (error: any) {
    console.error('Error searching projections:', error);
    return [];
  }
}
