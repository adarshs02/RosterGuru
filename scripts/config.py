"""
Configuration file for NBA stats collection and processing
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# NBA API Configuration
NBA_API_CONFIG = {
    "season": "2024-25",  # Season to collect data for
    "season_type": "Regular Season",  # Regular Season, Playoffs, All Star
    "timeout": 30,  # API request timeout in seconds (increased for historical data)
    "rate_limit_delay": 0.5,  # Delay between API calls to avoid rate limiting (increased)
}

# Player filtering criteria
PLAYER_FILTERS = {
    "min_games_played": 10,  # Minimum games played to include player
    "min_minutes_per_game": 10.0,  # Minimum minutes per game
    "active_only": True,  # Only include active players
}

# Z-Score calculation configuration
ZSCORE_CONFIG = {
    "categories": [
        "points",
        "total_rebounds", 
        "assists",
        "steals",
        "blocks",
        "turnovers",  # Note: turnovers are negative (lower is better)
        "field_goal_percentage",
        "free_throw_percentage",
        "three_pointers_made"
    ],
    "negative_categories": ["turnovers"],  # Categories where lower values are better
    "weights": {
        "points": 1.0,
        "total_rebounds": 1.0,
        "assists": 1.0,
        "steals": 1.0,
        "blocks": 1.0,
        "turnovers": -1.0,  # Negative weight for turnovers
        "field_goal_percentage": 0.5,
        "free_throw_percentage": 0.3,
        "three_pointers_made": 0.8
    },
}

# Database configuration (Supabase)
DATABASE_CONFIG = {
    "supabase_url": os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    "supabase_key": os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY"),  # Use SERVICE_KEY for full database permissions
}

# Historical data configuration
HISTORICAL_CONFIG = {
    "seasons_to_collect": [
        "2024-25", "2023-24", "2022-23", "2021-22", "2020-21",
        "2019-20", "2018-19", "2017-18", "2016-17", "2015-16"
    ],
    "update_current_season": True,  # Whether to update current season data
    "batch_size": 200,  # Number of players to process in each batch
}

# Logging configuration
LOGGING_CONFIG = {
    "level": "INFO",
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    "file": "logs/nba_stats.log",
    "max_file_size": 10485760,  # 10MB
    "backup_count": 5,
}
