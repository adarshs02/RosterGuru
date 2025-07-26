import { createClient } from '@supabase/supabase-js';

// Types
export interface WatchListPlayer {
  id: string;
  clerk_user_id: string; // Clerk user ID
  player_id: string;
  player_name: string;
  player_team: string;
  player_position: string[];
  added_at: string;
  updated_at: string;
}

export interface WatchListPlayerInput {
  player_id: string;
  player_name: string;
  player_team: string;
  player_position: string[];
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export class WatchListApi {
  /**
   * Get all watch list items for the specified user (Clerk user ID)
   */
  static async getUserWatchList(clerkUserId: string): Promise<WatchListPlayer[]> {
    if (!clerkUserId) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabase
      .from('user_watch_lists')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching watch list:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Add a player to the user's watch list
   */
  static async addToWatchList(clerkUserId: string, player: WatchListPlayerInput): Promise<WatchListPlayer> {
    if (!clerkUserId) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabase
      .from('user_watch_lists')
      .insert({
        clerk_user_id: clerkUserId,
        player_id: player.player_id,
        player_name: player.player_name,
        player_team: player.player_team,
        player_position: player.player_position,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (player already in watch list)
      if (error.code === '23505') {
        throw new Error('Player already in watch list');
      }
      console.error('Error adding to watch list:', error);
      throw error;
    }

    return data;
  }

  /**
   * Remove a player from the user's watch list
   */
  static async removeFromWatchList(clerkUserId: string, playerId: string): Promise<void> {
    if (!clerkUserId) {
      throw new Error('User ID is required');
    }

    const { error } = await supabase
      .from('user_watch_lists')
      .delete()
      .eq('clerk_user_id', clerkUserId)
      .eq('player_id', playerId);

    if (error) {
      console.error('Error removing from watch list:', error);
      throw error;
    }
  }

  /**
   * Check if a player is in the user's watch list
   */
  static async isPlayerInWatchList(clerkUserId: string, playerId: string): Promise<boolean> {
    if (!clerkUserId) {
      return false; // Not authenticated, so not in watch list
    }

    const { data, error } = await supabase
      .from('user_watch_lists')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .eq('player_id', playerId)
      .limit(1);

    if (error) {
      console.error('Error checking watch list status:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }

  /**
   * Toggle player in/out of watch list
   */
  static async toggleWatchList(clerkUserId: string, player: WatchListPlayerInput): Promise<{ isInWatchList: boolean }> {
    const isCurrentlyInWatchList = await this.isPlayerInWatchList(clerkUserId, player.player_id);
    
    if (isCurrentlyInWatchList) {
      await this.removeFromWatchList(clerkUserId, player.player_id);
      return { isInWatchList: false };
    } else {
      await this.addToWatchList(clerkUserId, player);
      return { isInWatchList: true };
    }
  }

  /**
   * Get watch list count for the current user
   */
  static async getWatchListCount(clerkUserId: string): Promise<number> {
    if (!clerkUserId) {
      return 0;
    }

    const { count, error } = await supabase
      .from('user_watch_lists')
      .select('*', { count: 'exact', head: true })
      .eq('clerk_user_id', clerkUserId);

    if (error) {
      console.error('Error getting watch list count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Subscribe to real-time changes in user's watch list
   */
  static subscribeToWatchList(callback: (payload: any) => void) {
    return supabase
      .channel('user_watch_lists')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_watch_lists',
        },
        callback
      )
      .subscribe();
  }
}

// Export Supabase client for direct use if needed
export { supabase };
