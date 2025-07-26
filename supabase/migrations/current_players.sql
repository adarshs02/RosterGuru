-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table (master table for player information)
-- Note: team_abbreviation is NOT stored here since players can change teams
-- Team associations are stored in the individual stats tables
CREATE TABLE IF NOT EXISTS current_players (
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    nba_player_id INTEGER UNIQUE NOT NULL,
    espn_player_id INTEGER UNIQUE NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(50), -- Can store multiple positions like "PG,SG" or "SF,PF"
    draft_year INTEGER,
    jersey_number VARCHAR,
    college_name VARCHAR,
    display_height VARCHAR,
    display_weight VARCHAR,
    age INTEGER,
    injury_status VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);