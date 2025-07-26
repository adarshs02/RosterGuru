-- Create user_watch_lists table for storing player watch lists (Clerk Auth)
CREATE TABLE user_watch_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_team TEXT,
  player_position TEXT[] NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only have one entry per player
  CONSTRAINT unique_user_player UNIQUE(clerk_user_id, player_id)
);

-- NOTE: RLS is disabled for Clerk authentication
-- Security is handled at the application level through Clerk authentication
-- and our API layer which validates user_id matches the authenticated Clerk user

-- RLS policies would use auth.uid() which only works with Supabase Auth
-- Since we're using Clerk, we rely on application-level security instead

-- Create index for efficient queries
CREATE INDEX idx_user_watch_lists_clerk_user_id ON user_watch_lists(clerk_user_id);
CREATE INDEX idx_user_watch_lists_player_id ON user_watch_lists(player_id);
CREATE INDEX idx_user_watch_lists_added_at ON user_watch_lists(added_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_watch_lists_updated_at 
  BEFORE UPDATE ON user_watch_lists 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
