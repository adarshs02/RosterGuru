-- Database schema for NBA player statistics
-- Three main tables: per_game_stats, per_36_stats, total_stats

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table (master table for player information)
-- Note: team_abbreviation is NOT stored here since players can change teams
-- Team associations are stored in the individual stats tables
CREATE TABLE IF NOT EXISTS players (
    player_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nba_player_id INTEGER UNIQUE NOT NULL,
    espn_player_id INTEGER UNIQUE NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(50), -- Can store multiple positions like "PG,SG" or "SF,PF"
    years_experience INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per Game Statistics Table
CREATE TABLE IF NOT EXISTS per_game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    season VARCHAR(10) NOT NULL,
    team_abbreviation VARCHAR(10),
    games_played INTEGER,
    games_started INTEGER,
    minutes_per_game DECIMAL(5,2),
    
    -- Scoring stats
    points DECIMAL(5,2),
    field_goals_made DECIMAL(5,2),
    field_goals_attempted DECIMAL(5,2),
    field_goal_percentage DECIMAL(5,4),
    three_pointers_made DECIMAL(5,2),
    three_pointers_attempted DECIMAL(5,2),
    three_point_percentage DECIMAL(5,4),
    free_throws_made DECIMAL(5,2),
    free_throws_attempted DECIMAL(5,2),
    free_throw_percentage DECIMAL(5,4),
    
    -- Advanced shooting stats
    true_shooting_percentage DECIMAL(5,4), -- TS%
    usage_percentage DECIMAL(5,2), -- US%
    
    -- Rebounding stats
    offensive_rebounds DECIMAL(5,2),
    defensive_rebounds DECIMAL(5,2),
    total_rebounds DECIMAL(5,2),
    
    -- Other stats
    assists DECIMAL(5,2),
    steals DECIMAL(5,2),
    blocks DECIMAL(5,2),
    turnovers DECIMAL(5,2),
    personal_fouls DECIMAL(5,2),
    
    -- Advanced stats
    plus_minus DECIMAL(6,2),
    
    -- Z-Score calculations
    zscore_total DECIMAL(10, 4) DEFAULT 0.0,
    zscore_points DECIMAL(6,3),
    zscore_rebounds DECIMAL(6,3),
    zscore_assists DECIMAL(6,3),
    zscore_steals DECIMAL(6,3),
    zscore_blocks DECIMAL(6,3),
    zscore_turnovers DECIMAL(6,3),
    zscore_fg_pct DECIMAL(6,3),
    zscore_ft_pct DECIMAL(6,3),
    zscore_three_pm DECIMAL(6,3),
    overall_rank INTEGER DEFAULT NULL,  -- Rank based on zscore_total within each season
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(player_id, season)
);

-- Per 36 Minutes Statistics Table
CREATE TABLE IF NOT EXISTS per_36_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    season VARCHAR(10) NOT NULL,
    team_abbreviation VARCHAR(10),
    games_played INTEGER,
    minutes_played INTEGER,
    
    -- Scoring stats (per 36 minutes)
    points DECIMAL(5,2),
    field_goals_made DECIMAL(5,2),
    field_goals_attempted DECIMAL(5,2),
    field_goal_percentage DECIMAL(5,4),
    three_pointers_made DECIMAL(5,2),
    three_pointers_attempted DECIMAL(5,2),
    three_point_percentage DECIMAL(5,4),
    free_throws_made DECIMAL(5,2),
    free_throws_attempted DECIMAL(5,2),
    free_throw_percentage DECIMAL(5,4),
    
    -- Advanced shooting stats
    true_shooting_percentage DECIMAL(5,4), -- TS%
    usage_percentage DECIMAL(5,2), -- US%
    
    -- Rebounding stats (per 36 minutes)
    offensive_rebounds DECIMAL(5,2),
    defensive_rebounds DECIMAL(5,2),
    total_rebounds DECIMAL(5,2),
    
    -- Other stats (per 36 minutes)
    assists DECIMAL(5,2),
    steals DECIMAL(5,2),
    blocks DECIMAL(5,2),
    turnovers DECIMAL(5,2),
    personal_fouls DECIMAL(5,2),
    
    -- Z-Score calculations
    zscore_total DECIMAL(10, 4) DEFAULT 0.0,
    zscore_points DECIMAL(6,3),
    zscore_rebounds DECIMAL(6,3),
    zscore_assists DECIMAL(6,3),
    zscore_steals DECIMAL(6,3),
    zscore_blocks DECIMAL(6,3),
    zscore_turnovers DECIMAL(6,3),
    zscore_fg_pct DECIMAL(6,3),
    zscore_ft_pct DECIMAL(6,3),
    zscore_three_pm DECIMAL(6,3),
    overall_rank INTEGER DEFAULT NULL,  -- Rank based on zscore_total within each season
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(player_id, season)
);

-- Total Season Statistics Table
CREATE TABLE IF NOT EXISTS total_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    season VARCHAR(10) NOT NULL,
    team_abbreviation VARCHAR(10),
    games_played INTEGER,
    games_started INTEGER,
    total_minutes INTEGER,
    
    -- Total scoring stats
    total_points INTEGER,
    total_field_goals_made INTEGER,
    total_field_goals_attempted INTEGER,
    field_goal_percentage DECIMAL(5,4),
    total_three_pointers_made INTEGER,
    total_three_pointers_attempted INTEGER,
    three_point_percentage DECIMAL(5,4),
    
    -- Advanced shooting stats
    true_shooting_percentage DECIMAL(5,4), -- TS%
    usage_percentage DECIMAL(5,2), -- US%
    total_free_throws_made INTEGER,
    total_free_throws_attempted INTEGER,
    free_throw_percentage DECIMAL(5,4),
    
    -- Total rebounding stats
    total_offensive_rebounds INTEGER,
    total_defensive_rebounds INTEGER,
    total_rebounds INTEGER,
    
    -- Total other stats
    total_assists INTEGER,
    total_steals INTEGER,
    total_blocks INTEGER,
    total_turnovers INTEGER,
    total_personal_fouls INTEGER,
    
    -- Advanced totals
    total_plus_minus INTEGER,
    
    -- Ranking based on overall performance (we'll add z-scores to total stats)
    overall_rank INTEGER DEFAULT NULL,  -- Rank based on overall performance within each season
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(player_id, season)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_per_game_stats_player_season ON per_game_stats(player_id, season);
CREATE INDEX IF NOT EXISTS idx_per_game_stats_season ON per_game_stats(season);
CREATE INDEX IF NOT EXISTS idx_per_game_stats_zscore ON per_game_stats(zscore_total DESC);

CREATE INDEX IF NOT EXISTS idx_per_36_stats_player_season ON per_36_stats(player_id, season);
CREATE INDEX IF NOT EXISTS idx_per_36_stats_season ON per_36_stats(season);
CREATE INDEX IF NOT EXISTS idx_per_36_stats_zscore ON per_36_stats(zscore_total DESC);

CREATE INDEX IF NOT EXISTS idx_total_stats_player_season ON total_stats(player_id, season);
CREATE INDEX IF NOT EXISTS idx_total_stats_season ON total_stats(season);
CREATE INDEX IF NOT EXISTS idx_total_stats_rank ON total_stats(overall_rank);

CREATE INDEX IF NOT EXISTS idx_players_season ON players(player_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE per_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE per_36_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE total_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow full access (SELECT, INSERT, UPDATE, DELETE) for all authenticated users
-- This gives you complete control while still having RLS enabled for security

-- Players table policies
CREATE POLICY "Allow full access to players" ON players
    FOR ALL USING (true) WITH CHECK (true);

-- Per-game stats table policies
CREATE POLICY "Allow full access to per_game_stats" ON per_game_stats
    FOR ALL USING (true) WITH CHECK (true);

-- Per-36 stats table policies
CREATE POLICY "Allow full access to per_36_stats" ON per_36_stats
    FOR ALL USING (true) WITH CHECK (true);

-- Total stats table policies
CREATE POLICY "Allow full access to total_stats" ON total_stats
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_players_nba_id ON players(nba_player_id);
CREATE INDEX IF NOT EXISTS idx_players_active ON players(is_active);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_per_game_stats_updated_at BEFORE UPDATE ON per_game_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_per_36_stats_updated_at BEFORE UPDATE ON per_36_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_total_stats_updated_at BEFORE UPDATE ON total_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
