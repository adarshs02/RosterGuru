"""
Main script for NBA stats collection and processing
"""

import logging
import os
import sys
from datetime import datetime
from typing import List, Dict

# Add scripts directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import NBA_API_CONFIG, HISTORICAL_CONFIG, LOGGING_CONFIG
from database import DatabaseManager
from nba_api_client import NBAApiClient
from espn_api_client import ESPNFantasyClient
from zscore_calculator import ZScoreCalculator

# Setup logging
def setup_logging():
    """Configure logging for the application"""
    os.makedirs('logs', exist_ok=True)
    
    logging.basicConfig(
        level=getattr(logging, LOGGING_CONFIG['level']),
        format=LOGGING_CONFIG['format'],
        handlers=[
            logging.FileHandler(LOGGING_CONFIG['file']),
            logging.StreamHandler(sys.stdout)
        ]
    )

logger = logging.getLogger(__name__)

class NBAStatsCollector:
    """Main class for collecting and processing NBA statistics"""
    
    def __init__(self):
        self.api_client = NBAApiClient()
        self.espn_client = ESPNFantasyClient()
        self.db = DatabaseManager()
        self.zscore_calc = ZScoreCalculator()
        self._espn_positions_cache = None
    
    def initialize_database(self):
        """Initialize database connection"""
        try:
            self.db.connect()
            logger.info("Database connection initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database connection: {e}")
            raise
    
    def get_espn_positions(self) -> Dict[str, List[str]]:
        """Get ESPN position data and cache it for the session"""
        if self._espn_positions_cache is None:
            try:
                logger.info("Fetching player positions from ESPN API")
                espn_players = self.espn_client.get_players_with_positions()
                
                # Create a mapping of player name to positions
                self._espn_positions_cache = {}
                for player in espn_players:
                    player_name = player['player_name']
                    positions = player['positions']
                    if player_name and positions:
                        self._espn_positions_cache[player_name] = positions
                
                logger.info(f"Cached positions for {len(self._espn_positions_cache)} players from ESPN")
                
            except Exception as e:
                logger.warning(f"Failed to fetch ESPN positions: {e}")
                self._espn_positions_cache = {}
        
        return self._espn_positions_cache
    
    def enhance_players_with_positions(self, players_data: List[Dict]) -> List[Dict]:
        """Enhance player data with ESPN positions"""
        espn_positions = self.get_espn_positions()
        
        enhanced_players = []
        for player in players_data:
            enhanced_player = player.copy()
            player_name = player.get('player_name', '')
            
            # Try to find positions from ESPN data
            if player_name in espn_positions:
                enhanced_player['position'] = espn_positions[player_name]
                logger.debug(f"Found ESPN positions for {player_name}: {espn_positions[player_name]}")
            else:
                # Default position if not found in ESPN
                enhanced_player['position'] = ['F']  # Default to Forward
                logger.debug(f"No ESPN position found for {player_name}, using default: F")
            
            enhanced_players.append(enhanced_player)
        
        return enhanced_players
    
    def collect_season_data(self, season: str) -> Dict:
        """Collect all stats for a given season using per-game stats as authoritative filter"""
        logger.info(f"Collecting data for season {season}")
        
        try:
            # Collect player data
            players_data = self.api_client.get_players_list(season)
            logger.info(f"Retrieved {len(players_data)} players")
            
            # Enhance player data with ESPN positions
            enhanced_players = self.enhance_players_with_positions(players_data)
            logger.info(f"Enhanced {len(enhanced_players)} players with position data")
            
            # Get per-game stats first (this applies our filters)
            per_game_stats = self.api_client.get_player_stats(season)
            logger.info(f"Retrieved per-game stats: {len(per_game_stats)} qualified players")
            
            # Create set of qualified player IDs from per-game stats
            qualified_player_ids = set(p['nba_player_id'] for p in per_game_stats)
            logger.info(f"Qualified player IDs: {len(qualified_player_ids)}")
            
            # Get all per-36 and total stats, then filter to only qualified players
            all_per_36_stats = self.api_client.get_per_36_stats(season, apply_filters=False)
            all_total_stats = self.api_client.get_total_stats(season, apply_filters=False)
            
            # Filter to only include qualified players
            per_36_stats = [s for s in all_per_36_stats if s['nba_player_id'] in qualified_player_ids]
            total_stats = [s for s in all_total_stats if s['nba_player_id'] in qualified_player_ids]
            
            logger.info(f"Filtered stats - Per Game: {len(per_game_stats)}, Per 36: {len(per_36_stats)}, Total: {len(total_stats)}")
            
            return {
                'players': enhanced_players,
                'per_game_stats': per_game_stats,
                'per_36_stats': per_36_stats,
                'total_stats': total_stats
            }
            
        except Exception as e:
            logger.error(f"Failed to collect season data: {e}")
            raise
    
    def process_and_store_data(self, season: str, data: Dict):
        """Process collected data and save to Supabase database"""
        try:
            # Extract data
            players = data['players']
            per_game_stats = data['per_game_stats']
            per_36_stats = data['per_36_stats']
            total_stats = data['total_stats']
            
            # Prepare players data with proper field mapping
            players_data = self._prepare_players_data(players)
            
            # Save players to database (batch operation)
            self.db.batch_upsert_players(players_data)
            logger.info(f"Saved {len(players_data)} players to database")
            
            # Create player ID mapping for stats tables
            player_id_map = self._create_player_id_mapping(players_data)
            
            # Process and save stats with z-scores
            self._process_and_save_stats(season, per_game_stats, 'per_game', player_id_map)
            self._process_and_save_stats(season, per_36_stats, 'per_36', player_id_map)
            self._process_and_save_stats(season, total_stats, 'total', player_id_map)
            
            logger.info(f"Successfully processed and saved database data for season {season}")
            
        except Exception as e:
            logger.error(f"Failed to process data for season {season}: {e}")
            raise
    
    def _prepare_players_data(self, players: List[Dict]) -> List[Dict]:
        """Prepare players data for database insertion"""
        players_data = []
        for player in players:
            # Format positions as comma-separated string if it's a list
            positions = player.get('position', ['F'])  # Default to Forward if no position
            if isinstance(positions, list):
                position_str = ','.join(positions)
            else:
                position_str = str(positions)
            
            player_data = {
                'nba_player_id': player['nba_player_id'],
                'player_name': player['player_name'],
                'position': position_str,  # Store as comma-separated string (e.g., "PG,SG")
                'years_experience': player.get('years_experience', 0),
                'is_active': True
            }
            players_data.append(player_data)
        return players_data
    
    def _create_player_id_mapping(self, players_data: List[Dict]) -> Dict[int, int]:
        """Create mapping from NBA player ID to database player ID"""
        try:
            # Query the database to get the actual player_id values after insertion
            client = self.db.get_client()
            
            # Get all players we just inserted/updated
            nba_player_ids = [player['nba_player_id'] for player in players_data]
            
            # Process in batches to avoid 414 Request-URI Too Large error
            batch_size = 100  # Process 100 player IDs at a time
            player_id_map = {}
            
            for i in range(0, len(nba_player_ids), batch_size):
                batch_ids = nba_player_ids[i:i + batch_size]
                logger.debug(f"Processing player ID batch {i//batch_size + 1}/{(len(nba_player_ids) + batch_size - 1)//batch_size}")
                
                result = client.table('players').select('player_id, nba_player_id').in_('nba_player_id', batch_ids).execute()
                
                # Add to mapping
                for player in result.data:
                    player_id_map[player['nba_player_id']] = player['player_id']
            
            logger.info(f"Created player ID mapping for {len(player_id_map)} players")
            return player_id_map
            
        except Exception as e:
            logger.error(f"Failed to create player ID mapping: {e}")
            raise
    
    def _filter_stats_for_database(self, stat_data: Dict, stat_type: str) -> Dict:
        """Filter stats data to only include columns that exist in the database schema"""
        # Define valid columns for each stats table based on database schema
        valid_columns = {
            'per_game': {
                'player_id', 'season', 'team_abbreviation', 'games_played', 'games_started', 
                'minutes_per_game', 'points', 'field_goals_made', 'field_goals_attempted', 
                'field_goal_percentage', 'three_pointers_made', 'three_pointers_attempted', 
                'three_point_percentage', 'free_throws_made', 'free_throws_attempted', 
                'free_throw_percentage', 'offensive_rebounds', 'defensive_rebounds', 
                'total_rebounds', 'assists', 'steals', 'blocks', 'turnovers', 
                'personal_fouls', 'plus_minus', 'zscore_total', 'zscore_points', 
                'zscore_rebounds', 'zscore_assists', 'zscore_steals', 'zscore_blocks', 
                'zscore_turnovers', 'zscore_fg_pct', 'zscore_ft_pct', 'zscore_three_pm'
            },
            'per_36': {
                'player_id', 'season', 'team_abbreviation', 'games_played', 'minutes_played', 
                'points', 'field_goals_made', 'field_goals_attempted', 'field_goal_percentage', 
                'three_pointers_made', 'three_pointers_attempted', 'three_point_percentage', 
                'free_throws_made', 'free_throws_attempted', 'free_throw_percentage', 
                'offensive_rebounds', 'defensive_rebounds', 'total_rebounds', 'assists', 
                'steals', 'blocks', 'turnovers', 'personal_fouls', 'plus_minus', 
                'zscore_total', 'zscore_points', 'zscore_rebounds', 'zscore_assists', 
                'zscore_steals', 'zscore_blocks', 'zscore_turnovers', 'zscore_fg_pct', 
                'zscore_ft_pct', 'zscore_three_pm'
            },
            'total': {
                'player_id', 'season', 'team_abbreviation', 'games_played', 'games_started', 
                'total_minutes', 'total_points', 'total_field_goals_made', 'total_field_goals_attempted', 
                'field_goal_percentage', 'total_three_pointers_made', 'total_three_pointers_attempted', 
                'three_point_percentage', 'total_free_throws_made', 'total_free_throws_attempted', 
                'free_throw_percentage', 'total_offensive_rebounds', 'total_defensive_rebounds', 
                'total_rebounds', 'total_assists', 'total_steals', 'total_blocks', 'total_turnovers', 
                'total_personal_fouls', 'total_plus_minus'
                # Note: total_stats table does not have z-score columns
            }
        }
        
        # Filter to only include valid columns
        valid_cols = valid_columns.get(stat_type, set())
        filtered_data = {k: v for k, v in stat_data.items() if k in valid_cols}
        
        return filtered_data
    
    def _process_and_save_stats(self, season: str, stats: List[Dict], stat_type: str, player_id_map: Dict[int, int]):
        """Process stats with z-scores and save to database"""
        if not stats:
            logger.warning(f"No stats data to process for {stat_type}")
            return
        
        try:
            # Calculate z-scores
            stats_with_zscores = self.zscore_calc.calculate_zscores(stats)
            
            # Prepare data for database insertion
            db_stats = []
            for stat in stats_with_zscores:
                nba_player_id = stat['nba_player_id']
                if nba_player_id in player_id_map:
                    db_stat = stat.copy()
                    db_stat['player_id'] = player_id_map[nba_player_id]
                    db_stat['season'] = season
                    
                    # Remove fields that don't belong in stats tables
                    fields_to_remove = ['nba_player_id', 'player_name']
                    for field in fields_to_remove:
                        db_stat.pop(field, None)
                    
                    # Map z-score field names to match database schema
                    if 'zscore_total_rebounds' in db_stat:
                        db_stat['zscore_rebounds'] = db_stat.pop('zscore_total_rebounds')
                    if 'zscore_field_goal_percentage' in db_stat:
                        db_stat['zscore_fg_pct'] = db_stat.pop('zscore_field_goal_percentage')
                    if 'zscore_free_throw_percentage' in db_stat:
                        db_stat['zscore_ft_pct'] = db_stat.pop('zscore_free_throw_percentage')
                    if 'zscore_three_pointers_made' in db_stat:
                        db_stat['zscore_three_pm'] = db_stat.pop('zscore_three_pointers_made')
                    
                    # Filter to only include fields that exist in the database schema
                    db_stat = self._filter_stats_for_database(db_stat, stat_type)
                    
                    db_stats.append(db_stat)
            
            # Save to appropriate table based on stat_type
            if stat_type == 'per_game':
                self.db.batch_upsert_per_game_stats(db_stats)
            elif stat_type == 'per_36':
                self.db.batch_upsert_per_36_stats(db_stats)
            elif stat_type == 'total':
                self.db.batch_upsert_total_stats(db_stats)
            
            logger.info(f"Processed and saved z-scores for {stat_type} ({len(db_stats)} players)")
            
        except Exception as e:
            logger.error(f"Failed to process z-scores for {stat_type}: {e}")
            raise
    
    def run_full_collection(self):
        """Run full data collection for all configured seasons"""
        logger.info("Starting full NBA stats collection")
        
        try:
            # Initialize database connection
            self.initialize_database()
            
            # Clear all existing stats data for fresh start
            logger.info("Clearing existing stats data from database")
            self.db.clear_all_stats_data()
            
            # Collect data for each season
            for season in HISTORICAL_CONFIG['seasons_to_collect']:
                logger.info(f"Processing season {season}")
                
                try:
                    # Collect data
                    data = self.collect_season_data(season)
                    
                    # Process and store
                    self.process_and_store_data(season, data)
                    
                    logger.info(f"Completed processing for season {season}")
                    
                except Exception as e:
                    logger.error(f"Failed to process season {season}: {e}")
                    continue  # Continue with next season
            
            logger.info("Full NBA stats collection completed")
            
        except Exception as e:
            logger.error(f"Full collection failed: {e}")
            raise
        finally:
            self.db.disconnect()
    
    def update_current_season(self):
        """Update data for current season only"""
        current_season = NBA_API_CONFIG['season']
        logger.info(f"Updating current season data: {current_season}")
        
        try:
            self.initialize_database()
            data = self.collect_season_data(current_season)
            self.process_and_store_data(current_season, data)
            logger.info(f"Current season update completed: {current_season}")
            
        except Exception as e:
            logger.error(f"Failed to update current season: {e}")
            raise

def main():
    """Main entry point"""
    setup_logging()
    
    collector = NBAStatsCollector()
    
    # Check command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'init':
            # Initialize CSV output directory
            collector.initialize_output()
            logger.info("Database initialization completed")
            
        elif command == 'update':
            # Update current season only
            collector.update_current_season()
            
        elif command == 'full':
            # Run full collection
            collector.run_full_collection()
            
        else:
            print("Usage: python main.py [init|update|full]")
            print("  init  - Initialize database schema")
            print("  update - Update current season data")
            print("  full  - Run full historical data collection")
            sys.exit(1)
    else:
        # Default: update current season
        collector.update_current_season()

if __name__ == "__main__":
    main()
