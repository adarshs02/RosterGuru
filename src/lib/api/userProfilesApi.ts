import { createClient } from '@supabase/supabase-js';
import { User } from '@clerk/nextjs/server';

// Types
export interface UserProfile {
  clerk_user_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image_url: string;
  joined_at: string;
  last_active: string;
  is_active: boolean;
  total_discussions: number;
  total_projections: number;
  total_votes: number;
  reputation_score: number;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInput {
  clerk_user_id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  profile_image_url?: string;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export class UserProfilesApi {
  /**
   * Create or update user profile from Clerk user data
   */
  static async upsertUserProfile(clerkUser: any): Promise<UserProfile> {
    const userProfileData: UserProfileInput = {
      clerk_user_id: clerkUser.id,
      username: clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
      email: clerkUser.emailAddresses?.[0]?.emailAddress,
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
      full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      profile_image_url: clerkUser.imageUrl,
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        ...userProfileData,
        last_active: new Date().toISOString(),
      }, {
        onConflict: 'clerk_user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get user profile by Clerk user ID
   */
  static async getUserProfile(clerkUserId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get multiple user profiles by Clerk user IDs
   */
  static async getUserProfiles(clerkUserIds: string[]): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('clerk_user_id', clerkUserIds);

    if (error) {
      console.error('Error fetching user profiles:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Update user's last active timestamp
   */
  static async updateLastActive(clerkUserId: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        last_active: new Date().toISOString() 
      })
      .eq('clerk_user_id', clerkUserId);

    if (error) {
      console.error('Error updating last active:', error);
      // Don't throw - this is a non-critical update
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    clerkUserId: string, 
    preferences: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ preferences })
      .eq('clerk_user_id', clerkUserId);

    if (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Get top users by reputation (for leaderboards, etc.)
   */
  static async getTopUsers(limit: number = 10): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .order('reputation_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top users:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Search users by username (for mentions, etc.)
   */
  static async searchUsers(query: string, limit: number = 10): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .eq('is_active', true)
      .order('reputation_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Increment user's community stats (discussions, projections, votes)
   */
  static async incrementUserStats(
    clerkUserId: string, 
    statType: 'discussions' | 'projections' | 'votes',
    increment: number = 1
  ): Promise<void> {
    const column = `total_${statType}`;
    
    const { error } = await supabase
      .rpc('increment_user_stat', {
        user_id: clerkUserId,
        stat_column: column,
        increment_value: increment
      });

    if (error) {
      console.error(`Error incrementing ${statType}:`, error);
      // Don't throw - this is a non-critical update
    }
  }
}

// SQL function for incrementing stats (run this in Supabase SQL editor)
export const CREATE_INCREMENT_FUNCTION = `
CREATE OR REPLACE FUNCTION increment_user_stat(
  user_id TEXT,
  stat_column TEXT,
  increment_value INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE user_profiles SET %I = %I + $1 WHERE clerk_user_id = $2', stat_column, stat_column)
  USING increment_value, user_id;
END;
$$ LANGUAGE plpgsql;
`;

export { supabase };
