"""
Database connection and operations for NBA stats collection
"""

from supabase import create_client, Client
import logging
from typing import Dict, List, Optional, Any
from config import DATABASE_CONFIG

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Handles all database operations for NBA stats using Supabase"""
    
    def __init__(self, config: Dict = None):
        self.config = config or DATABASE_CONFIG
        self.client: Optional[Client] = None
    
    def connect(self):
        """Establish Supabase connection"""
        try:
            if not self.config['supabase_url'] or not self.config['supabase_key']:
                raise ValueError("Supabase URL and key are required")
            
            self.client = create_client(
                self.config['supabase_url'],
                self.config['supabase_key']
            )
            logger.info("Supabase connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            raise
    
    def clear_all_stats_data(self):
        """Clear all stats data from database tables for full collection"""
        try:
            tables_to_clear = ['per_game_stats', 'per_36_stats', 'total_stats']
            
            for table in tables_to_clear:
                result = self.client.table(table).delete().neq('id', 0).execute()
                logger.info(f"Cleared {table} table")
            
            logger.info("Successfully cleared all stats data from database")
            
        except Exception as e:
            logger.error(f"Failed to clear stats data: {e}")
            raise
    
    def disconnect(self):
        """Close Supabase connection"""
        self.client = None
        logger.info("Supabase connection closed")
    
    def get_client(self) -> Client:
        """Get Supabase client, connecting if necessary"""
        if not self.client:
            self.connect()
        return self.client
    
    def execute_schema(self, schema_file: str):
        """Note: Supabase schema must be created through the Supabase dashboard or SQL editor"""
        logger.warning("Schema execution not supported through Python client. ")
        logger.warning("Please run the SQL schema through Supabase dashboard SQL editor.")
        logger.info(f"Schema file location: {schema_file}")
    
    def upsert_player(self, player_data: Dict) -> int:
        """Insert or update player information"""
        try:
            client = self.get_client()
            
            # Try to upsert the player
            result = client.table('players').upsert(
                player_data,
                on_conflict='player_id'
            ).execute()
            
            if result.data:
                player_id = result.data[0]['player_id']
                logger.info(f"Player {player_data['player_name']} upserted successfully")
                return player_id
            else:
                return player_data['player_id']
                
        except Exception as e:
            logger.error(f"Failed to upsert player {player_data.get('player_name', 'Unknown')}: {e}")
            raise
    
    def upsert_per_game_stats(self, stats_data: Dict):
        """Insert or update per-game statistics"""
        try:
            client = self.get_client()
            
            result = client.table('per_game_stats').upsert(
                stats_data,
                on_conflict='player_id,season'
            ).execute()
            
            logger.info(f"Per-game stats upserted for player {stats_data.get('player_id')} season {stats_data.get('season')}")
            
        except Exception as e:
            logger.error(f"Failed to upsert per-game stats: {e}")
            raise
    
    def upsert_per_36_stats(self, stats_data: Dict):
        """Insert or update per-36 minute statistics"""
        try:
            client = self.get_client()
            
            result = client.table('per_36_stats').upsert(
                stats_data,
                on_conflict='player_id,season'
            ).execute()
            
            logger.info(f"Per-36 stats upserted for player {stats_data.get('player_id')} season {stats_data.get('season')}")
            
        except Exception as e:
            logger.error(f"Failed to upsert per-36 stats: {e}")
            raise
    
    def upsert_total_stats(self, stats_data: Dict):
        """Insert or update total season statistics"""
        try:
            client = self.get_client()
            
            result = client.table('total_stats').upsert(
                stats_data,
                on_conflict='player_id,season'
            ).execute()
            
            logger.info(f"Total stats upserted for player {stats_data.get('player_id')} season {stats_data.get('season')}")
            
        except Exception as e:
            logger.error(f"Failed to upsert total stats: {e}")
            raise
    
    def batch_upsert_players(self, players_data: List[Dict]):
        """Batch upsert multiple players for better performance"""
        try:
            client = self.get_client()
            
            result = client.table('players').upsert(
                players_data,
                on_conflict='nba_player_id'
            ).execute()
            
            logger.info(f"Batch upserted {len(players_data)} players")
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to batch upsert players: {e}")
            raise
    
    def batch_upsert_per_game_stats(self, stats_data: List[Dict]):
        """Batch upsert multiple per-game stats for better performance"""
        try:
            client = self.get_client()
            
            result = client.table('per_game_stats').upsert(
                stats_data,
                on_conflict='player_id,season'
            ).execute()
            
            logger.info(f"Batch upserted {len(stats_data)} per-game stats records")
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to batch upsert per-game stats: {e}")
            raise
    
    def batch_upsert_per_36_stats(self, stats_data: List[Dict]):
        """Batch upsert multiple per-36 stats for better performance"""
        try:
            client = self.get_client()
            
            result = client.table('per_36_stats').upsert(
                stats_data,
                on_conflict='player_id,season'
            ).execute()
            
            logger.info(f"Batch upserted {len(stats_data)} per-36 stats records")
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to batch upsert per-36 stats: {e}")
            raise
    
    def batch_upsert_total_stats(self, stats_data: List[Dict]):
        """Batch upsert multiple total stats for better performance"""
        try:
            client = self.get_client()
            
            result = client.table('total_stats').upsert(
                stats_data,
                on_conflict='player_id,season'
            ).execute()
            
            logger.info(f"Batch upserted {len(stats_data)} total stats records")
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to batch upsert total stats: {e}")
            raise
    
    def get_players_for_season(self, season: str) -> List[Dict]:
        """Get all players for a specific season"""
        try:
            client = self.get_client()
            
            # Get players with their per-game stats for the season
            result = client.table('players').select(
                '*, per_game_stats!inner(games_played, minutes_per_game)'
            ).eq('per_game_stats.season', season).eq('is_active', True).order('player_name').execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to get players for season {season}: {e}")
            raise
    
    def get_season_stats(self, season: str, stat_type: str = 'per_game') -> List[Dict]:
        """Get all stats for a season by type"""
        try:
            table_map = {
                'per_game': 'per_game_stats',
                'per_36': 'per_36_stats',
                'total': 'total_stats'
            }
            
            if stat_type not in table_map:
                raise ValueError(f"Invalid stat_type: {stat_type}")
            
            client = self.get_client()
            table = table_map[stat_type]
            
            # Get stats with player info, ordered by z-score
            result = client.table(table).select(
                '*, players!inner(player_name, team_abbreviation)'
            ).eq('season', season).order('zscore_total', desc=True).execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to get season stats: {e}")
            raise
