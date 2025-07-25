-- Enhanced Player Community Features Schema
-- This migration adds tables for discussions, projections, trends, and user management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for community features
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR UNIQUE NOT NULL,
    username VARCHAR UNIQUE,
    display_name VARCHAR,
    avatar_url VARCHAR,
    bio TEXT,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Enhanced player profile information (additional fields to existing players table)
-- Note: This assumes the existing players table - we'll add these columns if they don't exist
DO $$ 
BEGIN
    -- Add physical info columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='height') THEN
        ALTER TABLE players ADD COLUMN height VARCHAR;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='weight') THEN
        ALTER TABLE players ADD COLUMN weight VARCHAR;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='age') THEN
        ALTER TABLE players ADD COLUMN age INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='years_experience') THEN
        ALTER TABLE players ADD COLUMN years_experience INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='jersey_number') THEN
        ALTER TABLE players ADD COLUMN jersey_number VARCHAR;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='injury_status') THEN
        ALTER TABLE players ADD COLUMN injury_status VARCHAR;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='is_active') THEN
        ALTER TABLE players ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Player Discussions Table
CREATE TABLE IF NOT EXISTS player_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR DEFAULT 'general', -- 'analysis', 'trade', 'injury', 'projection', 'general'
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT valid_category CHECK (category IN ('analysis', 'trade', 'injury', 'projection', 'general'))
);

-- Discussion Replies Table
CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES player_discussions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Projections Table
CREATE TABLE IF NOT EXISTS player_projections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    season VARCHAR NOT NULL,
    
    -- Projected stats
    projected_games INTEGER,
    projected_minutes DECIMAL(5,2),
    projected_points DECIMAL(5,2),
    projected_rebounds DECIMAL(5,2),
    projected_assists DECIMAL(5,2),
    projected_steals DECIMAL(5,2),
    projected_blocks DECIMAL(5,2),
    projected_turnovers DECIMAL(5,2),
    projected_fg_percentage DECIMAL(5,3),
    projected_ft_percentage DECIMAL(5,3),
    projected_three_pm DECIMAL(5,2),
    projected_three_percentage DECIMAL(5,3),
    
    -- Advanced projections
    projected_true_shooting DECIMAL(5,3),
    projected_usage_rate DECIMAL(5,3),
    projected_zscore DECIMAL(5,2),
    
    -- Projection metadata
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 100),
    methodology TEXT,
    notes TEXT,
    
    -- Accuracy tracking (filled after season)
    accuracy_score DECIMAL(5,3), -- calculated post-season
    
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one projection per user per player per season
    UNIQUE(player_id, author_id, season)
);

-- Player Trends/Analytics Table
CREATE TABLE IF NOT EXISTS player_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    metric_name VARCHAR NOT NULL, -- 'zscore', 'fantasy_rank', 'trade_value', 'popularity'
    metric_value DECIMAL(10,4),
    timeframe VARCHAR NOT NULL, -- 'daily', 'weekly', 'monthly', 'season'
    date DATE NOT NULL,
    season VARCHAR,
    metadata JSONB, -- for storing additional trend data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite index for efficient querying
    UNIQUE(player_id, metric_name, timeframe, date)
);

-- Player Popularity/Activity Tracking
CREATE TABLE IF NOT EXISTS player_activity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    
    -- Computed metrics
    total_discussions INTEGER DEFAULT 0,
    total_projections INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    popularity_score DECIMAL(10,4) DEFAULT 0, -- weighted score based on activity
    sentiment_score DECIMAL(5,3) DEFAULT 0, -- average sentiment from discussions
    
    -- Time-based metrics
    weekly_discussions INTEGER DEFAULT 0,
    weekly_projections INTEGER DEFAULT 0,
    weekly_views INTEGER DEFAULT 0,
    
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, date)
);

-- Vote tracking for discussions and projections
CREATE TABLE IF NOT EXISTS user_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    votable_type VARCHAR NOT NULL, -- 'discussion', 'reply', 'projection'
    votable_id UUID NOT NULL,
    vote_type VARCHAR NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate votes
    UNIQUE(user_id, votable_type, votable_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_discussions_player_id ON player_discussions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_discussions_author_id ON player_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_player_discussions_created_at ON player_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_discussions_category ON player_discussions(category);

CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_author_id ON discussion_replies(author_id);

CREATE INDEX IF NOT EXISTS idx_player_projections_player_id ON player_projections(player_id);
CREATE INDEX IF NOT EXISTS idx_player_projections_author_id ON player_projections(author_id);
CREATE INDEX IF NOT EXISTS idx_player_projections_season ON player_projections(season);

CREATE INDEX IF NOT EXISTS idx_player_trends_player_id ON player_trends(player_id);
CREATE INDEX IF NOT EXISTS idx_player_trends_metric_date ON player_trends(metric_name, date DESC);

CREATE INDEX IF NOT EXISTS idx_player_activity_player_id ON player_activity_metrics(player_id);
CREATE INDEX IF NOT EXISTS idx_player_activity_date ON player_activity_metrics(date DESC);

CREATE INDEX IF NOT EXISTS idx_user_votes_user_id ON user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_votable ON user_votes(votable_type, votable_id);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (allow read for all, write for authenticated users)
-- Users can read all public data
CREATE POLICY "Allow read access to all users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow read access to discussions" ON player_discussions FOR SELECT USING (true);
CREATE POLICY "Allow read access to replies" ON discussion_replies FOR SELECT USING (true);
CREATE POLICY "Allow read access to projections" ON player_projections FOR SELECT USING (true);
CREATE POLICY "Allow read access to trends" ON player_trends FOR SELECT USING (true);
CREATE POLICY "Allow read access to activity metrics" ON player_activity_metrics FOR SELECT USING (true);

-- Authenticated users can create content
CREATE POLICY "Authenticated users can create discussions" ON player_discussions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create replies" ON discussion_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create projections" ON player_projections FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can vote" ON user_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own content
CREATE POLICY "Users can update their own discussions" ON player_discussions FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can update their own replies" ON discussion_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can update their own projections" ON player_projections FOR UPDATE USING (auth.uid() = author_id);

-- Functions for updating counters
CREATE OR REPLACE FUNCTION update_discussion_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE player_discussions 
        SET reply_count = reply_count + 1 
        WHERE id = NEW.discussion_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE player_discussions 
        SET reply_count = reply_count - 1 
        WHERE id = OLD.discussion_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_reply_count
    AFTER INSERT OR DELETE ON discussion_replies
    FOR EACH ROW EXECUTE FUNCTION update_discussion_reply_count();

-- Function to update activity metrics (can be called by cron job)
CREATE OR REPLACE FUNCTION update_player_activity_metrics()
RETURNS void AS $$
BEGIN
    INSERT INTO player_activity_metrics (player_id, total_discussions, total_projections, date)
    SELECT 
        p.player_id,
        COALESCE(d.discussion_count, 0) as total_discussions,
        COALESCE(pr.projection_count, 0) as total_projections,
        CURRENT_DATE
    FROM players p
    LEFT JOIN (
        SELECT player_id, COUNT(*) as discussion_count
        FROM player_discussions
        GROUP BY player_id
    ) d ON p.player_id = d.player_id
    LEFT JOIN (
        SELECT player_id, COUNT(*) as projection_count
        FROM player_projections
        GROUP BY player_id
    ) pr ON p.player_id = pr.player_id
    ON CONFLICT (player_id, date) 
    DO UPDATE SET
        total_discussions = EXCLUDED.total_discussions,
        total_projections = EXCLUDED.total_projections;
END;
$$ LANGUAGE plpgsql;
