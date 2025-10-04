-- Create user_profiles table for storing Clerk user metadata in Supabase
-- This enables efficient joins for community features (discussions, projections, etc.)

CREATE TABLE user_profiles (
  clerk_user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  profile_image_url TEXT,
  
  -- App-specific metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Community stats (can be updated via triggers or background jobs)
  total_discussions INTEGER DEFAULT 0,
  total_projections INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  
  -- Preferences (stored as JSON for flexibility)
  preferences JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_joined_at ON user_profiles(joined_at DESC);
CREATE INDEX idx_user_profiles_reputation ON user_profiles(reputation_score DESC);
CREATE INDEX idx_user_profiles_active_users ON user_profiles(is_active, last_active DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Update the existing community tables to reference user_profiles

-- Update discussions table (if it exists)
-- ALTER TABLE discussions ADD CONSTRAINT fk_discussions_user 
--   FOREIGN KEY (user_id) REFERENCES user_profiles(clerk_user_id) ON DELETE SET NULL;

-- Update projections table (if it exists)
-- ALTER TABLE projections ADD CONSTRAINT fk_projections_user 
--   FOREIGN KEY (user_id) REFERENCES user_profiles(clerk_user_id) ON DELETE SET NULL;

-- Update trends table (if it exists)
-- ALTER TABLE trends ADD CONSTRAINT fk_trends_user 
--   FOREIGN KEY (user_id) REFERENCES user_profiles(clerk_user_id) ON DELETE SET NULL;

-- Update votes table (if it exists)
-- ALTER TABLE votes ADD CONSTRAINT fk_votes_user 
--   FOREIGN KEY (user_id) REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE;

-- Update user_watch_lists to reference user_profiles (optional)
-- ALTER TABLE user_watch_lists ADD CONSTRAINT fk_watch_lists_user 
--   FOREIGN KEY (user_id) REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE;
