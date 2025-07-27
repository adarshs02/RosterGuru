#!/usr/bin/env python3
"""
Script to update only z-scores in the database using the new impact-weighted formula.
Fetches existing stats from per_game_stats and per_36_stats tables and updates z-score columns.
"""

import logging
import sys
import os
from typing import List, Dict
import pandas as pd
from datetime import datetime
from supabase import create_client, Client

# Add the scripts directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from zscore_calculator import ZScoreCalculator
from config import NBA_API_CONFIG

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'update_zscores_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)


class ZScoreUpdater:
    """Update z-scores in the database using the new impact-weighted formula"""
    
    def __init__(self):
        self.supabase = self._init_supabase()
        self.zscore_calc = ZScoreCalculator()
        self.season = NBA_API_CONFIG['season']
    
    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        try:
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
            
            if not supabase_url or not supabase_key:
                # Try loading from .env file in parent directory
                env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
                if os.path.exists(env_path):
                    with open(env_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                key = key.strip()
                                value = value.strip()
                                if key == 'NEXT_PUBLIC_SUPABASE_URL':
                                    supabase_url = value
                                elif key == 'NEXT_PUBLIC_SUPABASE_SERVICE_KEY':
                                    supabase_key = value
            
            # Clean quotes from values
            if supabase_url:
                supabase_url = supabase_url.strip('"').strip("'")
            if supabase_key:
                supabase_key = supabase_key.strip('"').strip("'")
            
            if not supabase_url or not supabase_key:
                raise ValueError("Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_KEY")
            
            client = create_client(supabase_url, supabase_key)
            logger.info("Supabase connection established")
            return client
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    def update_per_game_zscores(self):
        """Update z-scores for per_game_stats table"""
        logger.info("Starting per_game_stats z-score update...")
        
        try:
            # Fetch existing per_game stats from Supabase
            result = self.supabase.table('per_game_stats').select(
                'player_id, season, team_abbreviation, games_played, games_started, '
                'minutes_per_game, field_goals_made, field_goals_attempted, field_goal_percentage, '
                'three_pointers_made, three_pointers_attempted, three_point_percentage, '
                'free_throws_made, free_throws_attempted, free_throw_percentage, '
                'offensive_rebounds, defensive_rebounds, total_rebounds, '
                'assists, steals, blocks, turnovers, personal_fouls, points, plus_minus'
            ).eq('season', self.season).execute()
            
            if not result.data:
                logger.warning(f"No per_game_stats found for season {self.season}")
                return
            
            logger.info(f"Found {len(result.data)} per_game_stats records for season {self.season}")
            
            # Calculate z-scores using the new formula
            logger.info("Calculating z-scores with impact-weighted FG% and FT%...")
            stats_with_zscores = self.zscore_calc.calculate_zscores(result.data)
            
            # Update database with new z-scores
            self._update_zscores_in_db(stats_with_zscores, 'per_game_stats')
            
            logger.info("Successfully updated per_game_stats z-scores")
            
        except Exception as e:
            logger.error(f"Error updating per_game_stats z-scores: {e}")
            raise
    
    def update_per_36_zscores(self):
        """Update per_36_stats z-scores using new impact-weighted formula"""
        logger.info("Starting per_36_stats z-score update...")
        
        try:
            # Fetch per_36_stats data from Supabase (excluding columns that don't exist)
            result = self.supabase.table('per_36_stats').select(
                'player_id, season, team_abbreviation, '
                'field_goals_made, field_goals_attempted, field_goal_percentage, '
                'three_pointers_made, three_pointers_attempted, three_point_percentage, '
                'free_throws_made, free_throws_attempted, free_throw_percentage, '
                'offensive_rebounds, defensive_rebounds, total_rebounds, assists, steals, '
                'blocks, turnovers, personal_fouls, points'
            ).eq('season', '2024-25').execute()
            
            if not result.data:
                logger.warning(f"No per_36_stats found for season {self.season}")
                return
            
            logger.info(f"Found {len(result.data)} per_36_stats records for season {self.season}")
            
            # Calculate z-scores using the new formula
            logger.info("Calculating z-scores with impact-weighted FG% and FT%...")
            stats_with_zscores = self.zscore_calc.calculate_zscores(result.data)
            
            # Update database with new z-scores
            self._update_zscores_in_db(stats_with_zscores, 'per_36_stats')
            
            logger.info("Successfully updated per_36_stats z-scores")
            
        except Exception as e:
            logger.error(f"Error updating per_36_stats z-scores: {e}")
            raise
    
    def _update_zscores_in_db(self, stats_with_zscores: List[Dict], table_name: str):
        """Update only z-score columns in the specified table using Supabase"""
        
        logger.info(f"Updating {len(stats_with_zscores)} records in {table_name}...")
        
        # Process updates in batches for efficiency
        batch_size = 50
        total_updated = 0
        
        for i in range(0, len(stats_with_zscores), batch_size):
            batch = stats_with_zscores[i:i + batch_size]
            
            for stat in batch:
                try:
                    # Prepare z-score data for update
                    zscore_data = {}
                    
                    # Handle column name mapping
                    if 'zscore_total_rebounds' in stat:
                        zscore_data['zscore_rebounds'] = stat['zscore_total_rebounds']
                    if 'zscore_field_goal_percentage' in stat:
                        zscore_data['zscore_fg_pct'] = stat['zscore_field_goal_percentage']
                    if 'zscore_free_throw_percentage' in stat:
                        zscore_data['zscore_ft_pct'] = stat['zscore_free_throw_percentage']
                    if 'zscore_three_pointers_made' in stat:
                        zscore_data['zscore_three_pm'] = stat['zscore_three_pointers_made']
                    
                    # Add other z-score columns directly
                    for col in ['zscore_total', 'zscore_points', 'zscore_assists', 'zscore_steals', 
                               'zscore_blocks', 'zscore_turnovers']:
                        if col in stat:
                            zscore_data[col] = stat[col]
                    
                    # Update the record using Supabase
                    result = self.supabase.table(table_name).update(zscore_data).eq(
                        'player_id', stat['player_id']
                    ).eq('season', stat['season']).execute()
                    
                    if result.data:
                        total_updated += 1
                    
                except Exception as e:
                    logger.error(f"Error updating player {stat.get('player_id', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Processed batch {i//batch_size + 1}: {len(batch)} records")
        
        logger.info(f"Successfully updated {total_updated} z-score records in {table_name}")
    
    def run_update(self):
        """Run the complete z-score update process"""
        logger.info("Starting z-score update process...")
        logger.info(f"Season: {self.season}")
        logger.info("Using impact-weighted formula for FG% and FT%")
        
        try:
            # Update per_game z-scores
            self.update_per_game_zscores()
            
            # Update per_36 z-scores
            self.update_per_36_zscores()
            
            logger.info("✅ Z-score update completed successfully!")
            logger.info("Impact-weighted FG% and FT% z-scores are now in the database")
            
        except Exception as e:
            logger.error(f"❌ Z-score update failed: {e}")
            raise


def main():
    """Main function"""
    try:
        updater = ZScoreUpdater()
        updater.run_update()
        
    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
