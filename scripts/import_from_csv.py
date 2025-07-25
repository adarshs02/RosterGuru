"""
Import NBA stats data from CSV files to Supabase
"""

import os
import csv
import logging
from typing import List, Dict
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CSVImporter:
    def __init__(self):
        """Initialize Supabase client"""
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
        self.client = create_client(self.supabase_url, self.supabase_key)
        
        self.data_dir = '../historical_stats'
        self.subdirs = {
            'per_game': 'per_game',
            'per_36': 'per_36', 
            'total': 'total'
        }
    
    def read_csv_file(self, filename: str, subdir: str = None) -> List[Dict]:
        """Read CSV file and return list of dictionaries"""
        try:
            if subdir:
                filepath = os.path.join(self.data_dir, subdir, filename)
            else:
                filepath = os.path.join(self.data_dir, filename)
            
            if not os.path.exists(filepath):
                logger.error(f"CSV file not found: {filepath}")
                return []
            
            data = []
            with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    # Convert numeric fields
                    converted_row = self.convert_row_types(row)
                    data.append(converted_row)
            
            logger.info(f"Read {len(data)} records from {filename}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to read CSV file {filename}: {e}")
            return []
    
    def filter_players_data(self, data: List[Dict]) -> List[Dict]:
        """Filter players data to match database schema (remove team_abbreviation)"""
        filtered_data = []
        for row in data:
            # Remove team_abbreviation as it's not in the players table schema
            filtered_row = {k: v for k, v in row.items() if k != 'team_abbreviation'}
            filtered_data.append(filtered_row)
        return filtered_data
    
    def get_player_id_mapping(self) -> Dict[str, int]:
        """Get mapping from nba_player_id to player_id from database"""
        try:
            result = self.client.table('players').select('player_id, nba_player_id').execute()
            mapping = {}
            for player in result.data:
                if player['nba_player_id']:
                    mapping[str(player['nba_player_id'])] = player['player_id']
            logger.info(f"Created player ID mapping for {len(mapping)} players")
            return mapping
        except Exception as e:
            logger.error(f"Failed to create player ID mapping: {e}")
            return {}
    
    def filter_stats_data(self, data: List[Dict], table_name: str, season: str = None) -> List[Dict]:
        """Filter stats data to match database schema and map player IDs"""
        # Get player ID mapping
        player_mapping = self.get_player_id_mapping()
        
        # Fields that should be removed from stats tables (they're not in the schema)
        fields_to_remove = {'nba_player_id', 'player_name'}
        
        # Column name mapping from CSV to database schema
        column_mapping = {
            'zscore_field_goal_percentage': 'zscore_fg_pct',
            'zscore_free_throw_percentage': 'zscore_ft_pct', 
            'zscore_three_pointers_made': 'zscore_three_pm',
            'zscore_total_rebounds': 'zscore_rebounds'
        }
        
        filtered_data = []
        for row in data:
            # Map nba_player_id to player_id
            nba_player_id = str(row.get('nba_player_id', ''))
            if nba_player_id in player_mapping:
                # Remove extra fields and add correct player_id
                filtered_row = {}
                for k, v in row.items():
                    if k not in fields_to_remove:
                        # Map column name if needed
                        mapped_column = column_mapping.get(k, k)
                        filtered_row[mapped_column] = v
                
                filtered_row['player_id'] = player_mapping[nba_player_id]
                
                # Add season if provided and not already in data
                if season and 'season' not in filtered_row:
                    filtered_row['season'] = season
                    
                filtered_data.append(filtered_row)
            else:
                logger.warning(f"No player_id mapping found for nba_player_id: {nba_player_id}")
        
        logger.info(f"Filtered {len(filtered_data)} records for {table_name}")
        return filtered_data
    
    def convert_row_types(self, row: Dict) -> Dict:
        """Convert string values to appropriate types"""
        converted = {}
        
        for key, value in row.items():
            if value == '' or value is None:
                converted[key] = None
            elif key in ['id', 'player_id', 'nba_player_id', 'games_played', 'games_started', 
                        'total_minutes', 'minutes_played', 'total_points', 'total_field_goals_made',
                        'total_field_goals_attempted', 'total_three_pointers_made', 
                        'total_three_pointers_attempted', 'total_free_throws_made',
                        'total_free_throws_attempted', 'total_offensive_rebounds',
                        'total_defensive_rebounds', 'total_rebounds', 'total_assists',
                        'total_steals', 'total_blocks', 'total_turnovers', 'total_personal_fouls',
                        'total_plus_minus', 'years_experience']:
                # Integer fields
                try:
                    converted[key] = int(float(value)) if value else None
                except (ValueError, TypeError):
                    converted[key] = None
            elif key in ['minutes_per_game', 'points', 'field_goals_made', 'field_goals_attempted',
                        'field_goal_percentage', 'three_pointers_made', 'three_pointers_attempted',
                        'three_point_percentage', 'free_throws_made', 'free_throws_attempted',
                        'free_throw_percentage', 'offensive_rebounds', 'defensive_rebounds',
                        'total_rebounds', 'assists', 'steals', 'blocks', 'turnovers',
                        'personal_fouls', 'plus_minus', 'zscore_total', 'zscore_points',
                        'zscore_rebounds', 'zscore_assists', 'zscore_steals', 'zscore_blocks',
                        'zscore_turnovers', 'zscore_fg_pct', 'zscore_ft_pct', 'zscore_three_pm']:
                # Decimal/float fields
                try:
                    converted[key] = float(value) if value else None
                except (ValueError, TypeError):
                    converted[key] = None
            elif key in ['is_active']:
                # Boolean fields
                converted[key] = value.lower() in ('true', '1', 'yes') if value else False
            else:
                # String fields
                converted[key] = value
        
        return converted
    
    def batch_upsert(self, table_name: str, data: List[Dict], conflict_column: str = None):
        """Batch upsert data to Supabase table"""
        try:
            if not data:
                logger.warning(f"No data to upsert for table {table_name}")
                return
            
            # Remove None/empty id fields for insert
            clean_data = []
            for row in data:
                clean_row = {k: v for k, v in row.items() if not (k == 'id' and v is None)}
                clean_data.append(clean_row)
            
            # Batch size for upserts
            batch_size = 200
            total_inserted = 0
            
            for i in range(0, len(clean_data), batch_size):
                batch = clean_data[i:i + batch_size]
                
                if conflict_column:
                    result = self.client.table(table_name).upsert(
                        batch, 
                        on_conflict=conflict_column
                    ).execute()
                else:
                    result = self.client.table(table_name).insert(batch).execute()
                
                total_inserted += len(batch)
                logger.info(f"Upserted batch {i//batch_size + 1}: {len(batch)} records to {table_name}")
            
            logger.info(f"Successfully upserted {total_inserted} records to {table_name}")
            
        except Exception as e:
            logger.error(f"Failed to upsert data to {table_name}: {e}")
    
    def import_players(self, filename: str = 'players.csv'):
        """Import players data from CSV"""
        logger.info("Importing players data...")
        data = self.read_csv_file(filename)
        if data:
            self.batch_upsert('players', data, 'nba_player_id')
    
    def import_stats(self, table_name: str, filename: str):
        """Import stats data from CSV"""
        logger.info(f"Importing {table_name} data from {filename}...")
        
        # Extract season from filename (e.g., "per_game_stats_2021_22.csv" -> "2021-22")
        season = None
        if '_' in filename:
            parts = filename.replace('.csv', '').split('_')
            if len(parts) >= 3:
                # Take last two parts and join with hyphen
                year1, year2 = parts[-2], parts[-1]
                if year1.isdigit() and year2.isdigit() and len(year1) == 4 and len(year2) == 2:
                    season = f"{year1}-{year2}"
        
        # Determine subdirectory based on table type
        subdir = None
        if table_name == 'per_game_stats':
            subdir = 'per_game'
        elif table_name == 'per_36_stats':
            subdir = 'per_36'
        elif table_name == 'total_stats':
            subdir = 'total'
            
        data = self.read_csv_file(filename, subdir)
        if data:
            # Filter data to match database schema
            filtered_data = self.filter_stats_data(data, table_name, season)
            # Use composite key for stats tables
            self.batch_upsert(table_name, filtered_data, 'player_id,season')
    
    def update_with_zscores(self, stats_table: str, zscore_filename: str):
        """Update existing stats table with z-score data from z-score CSV"""
        logger.info(f"Updating {stats_table} with z-scores from {zscore_filename}...")
        
        # Determine subdirectory based on stats table type
        subdir = None
        if stats_table == 'per_game_stats':
            subdir = 'per_game'
        elif stats_table == 'per_36_stats':
            subdir = 'per_36'
            
        zscore_data = self.read_csv_file(zscore_filename, subdir)
        
        if not zscore_data:
            return
        
        # Extract season from filename (e.g., "zscores_per_game_2021_22.csv" -> "2021-22")
        season = None
        if '_' in zscore_filename:
            parts = zscore_filename.replace('.csv', '').split('_')
            # Look for season part like "2021_22" at the end
            if len(parts) >= 3:
                # Take last two parts and join with hyphen (e.g., "2021" + "22" -> "2021-22")
                year1, year2 = parts[-2], parts[-1]
                if year1.isdigit() and year2.isdigit() and len(year1) == 4 and len(year2) == 2:
                    season = f"{year1}-{year2}"
        
        if not season:
            logger.error(f"Could not extract season from filename: {zscore_filename}")
            return
            
        logger.info(f"Extracted season: {season} from filename: {zscore_filename}")
        
        # Get player ID mapping
        player_mapping = self.get_player_id_mapping()
        
        # Map CSV z-score columns to database columns
        zscore_mapping = {
            'zscore_total': 'zscore_total',
            'zscore_points': 'zscore_points', 
            'zscore_total_rebounds': 'zscore_rebounds',
            'zscore_assists': 'zscore_assists',
            'zscore_steals': 'zscore_steals',
            'zscore_blocks': 'zscore_blocks',
            'zscore_turnovers': 'zscore_turnovers',
            'zscore_field_goal_percentage': 'zscore_fg_pct',
            'zscore_free_throw_percentage': 'zscore_ft_pct',
            'zscore_three_pointers_made': 'zscore_three_pm'
        }
        
        # Prepare batch update data
        batch_updates = []
        for row in zscore_data:
            nba_player_id = str(row.get('nba_player_id', ''))
            if nba_player_id in player_mapping:
                player_id = player_mapping[nba_player_id]
                
                # Build update data with only z-score values
                update_data = {'player_id': player_id, 'season': season}
                
                for csv_col, db_col in zscore_mapping.items():
                    if csv_col in row and row[csv_col]:
                        try:
                            update_data[db_col] = float(row[csv_col])
                        except (ValueError, TypeError):
                            update_data[db_col] = None
                
                batch_updates.append(update_data)
        
        # Perform batch update using upsert (more efficient than individual updates)
        if batch_updates:
            try:
                logger.info(f"Performing batch upsert of {len(batch_updates)} z-score records...")
                result = self.client.table(stats_table).upsert(
                    batch_updates,
                    on_conflict='player_id,season'
                ).execute()
                logger.info(f"Successfully updated {len(batch_updates)} records in {stats_table} with z-scores")
            except Exception as e:
                logger.error(f"Failed to batch update z-scores in {stats_table}: {e}")
                # Fall back to individual updates if batch fails
                logger.info("Falling back to individual updates...")
                updates_made = 0
                for update_data in batch_updates:
                    try:
                        result = self.client.table(stats_table).update(update_data).eq('player_id', update_data['player_id']).eq('season', season).execute()
                        updates_made += 1
                    except Exception as e2:
                        logger.warning(f"Failed to update z-scores for player_id {update_data['player_id']}: {e2}")
                logger.info(f"Updated {updates_made} records individually")
        else:
            logger.warning(f"No valid z-score data found in {zscore_filename}")
    
    def import_season_data(self, season: str):
        """Import all stats data for a specific season"""
        logger.info(f"Importing all data for season {season}")
        
        # Convert season format back to underscores for filename lookup (CSV files use underscores)
        season_file = season.replace('-', '_')
        
        # Import each stats table
        stats_tables = [
            ('per_game_stats', f'per_game_stats_{season_file}.csv'),
            ('per_36_stats', f'per_36_stats_{season_file}.csv'),
            ('total_stats', f'total_stats_{season_file}.csv')
        ]
        
        for table_name, filename in stats_tables:
            self.import_stats(table_name, filename)
        
        # Update stats tables with z-score data from z-score CSV files
        zscore_updates = [
            ('per_game_stats', f'zscores_per_game_{season_file}.csv'),
            ('per_36_stats', f'zscores_per_36_{season_file}.csv')
        ]
        
        for stats_table, zscore_filename in zscore_updates:
            self.update_with_zscores(stats_table, zscore_filename)
    
    def list_csv_files(self):
        """List available CSV files in all subdirectories"""
        try:
            if not os.path.exists(self.data_dir):
                logger.warning(f"Data directory {self.data_dir} does not exist")
                return {}
            
            all_files = {}
            for subdir_name, subdir_path in self.subdirs.items():
                subdir_full_path = os.path.join(self.data_dir, subdir_path)
                if os.path.exists(subdir_full_path):
                    csv_files = [f for f in os.listdir(subdir_full_path) if f.endswith('.csv')]
                    all_files[subdir_name] = csv_files
                    logger.info(f"Found {len(csv_files)} CSV files in {subdir_name}: {csv_files[:3]}{'...' if len(csv_files) > 3 else ''}")
                else:
                    logger.warning(f"Subdirectory {subdir_full_path} does not exist")
                    all_files[subdir_name] = []
            
            return all_files
            
        except Exception as e:
            logger.error(f"Failed to list CSV files: {e}")
            return {}

def main():
    """Main function to import data from CSV"""
    importer = CSVImporter()
    
    # List available CSV files
    csv_files_by_subdir = importer.list_csv_files()
    
    if not any(csv_files_by_subdir.values()):
        logger.error("No CSV files found. Please export data first or add CSV files to historical_stats/ subdirectories")
        return
    
    # First, find seasons from per_game files
    seasons = set()
    per_game_files = csv_files_by_subdir.get('per_game', [])
    
    for filename in per_game_files:
        if filename.startswith('per_game_stats_') and filename.endswith('.csv'):
            season_part = filename.replace('per_game_stats_', '').replace('.csv', '')
            # Convert underscores to hyphens for season format
            season = season_part.replace('_', '-')
            seasons.add(season)
    
    logger.info(f"Found {len(seasons)} seasons to import: {sorted(seasons)}")
    
    # Import all historical players data from per_game files first
    # (they contain all unique players across all seasons)
    all_players_data = []
    
    for filename in per_game_files:
        if filename.startswith('per_game_stats_'):
            logger.info(f"Reading players from {filename}")
            player_data = importer.read_csv_file(filename, 'per_game')
            if player_data:
                # Extract unique player data (remove duplicates by nba_player_id)
                for row in player_data:
                    player_info = {
                        'nba_player_id': row.get('nba_player_id'),
                        'player_name': row.get('player_name'),
                        'position': row.get('position', ''),
                        'is_active': True  # Assume active for now
                    }
                    # Only add if we don't already have this player
                    if not any(p['nba_player_id'] == player_info['nba_player_id'] for p in all_players_data):
                        all_players_data.append(player_info)
    
    if all_players_data:
        # Filter players data to match database schema
        filtered_players_data = importer.filter_players_data(all_players_data)
        logger.info(f"Importing {len(filtered_players_data)} unique players from all seasons")
        importer.batch_upsert('players', filtered_players_data, 'nba_player_id')
    
    # Now import season data for each season
    for season in sorted(seasons):
        logger.info(f"Importing data for season: {season}")
        importer.import_season_data(season)

if __name__ == "__main__":
    main()
