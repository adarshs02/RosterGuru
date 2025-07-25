"""
Export NBA stats data to CSV files for historical data management
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

class CSVExporter:
    def __init__(self):
        """Initialize Supabase client"""
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
        self.client = create_client(self.supabase_url, self.supabase_key)
        
        # Create data directory
        self.data_dir = 'data'
        os.makedirs(self.data_dir, exist_ok=True)
    
    def export_players_to_csv(self, season: str = None):
        """Export players data to CSV"""
        try:
            logger.info("Exporting players data to CSV...")
            
            # Get all players
            result = self.client.table('players').select('*').execute()
            
            if not result.data:
                logger.warning("No players data found")
                return
            
            filename = f"{self.data_dir}/players.csv"
            
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                if result.data:
                    fieldnames = result.data[0].keys()
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(result.data)
            
            logger.info(f"Exported {len(result.data)} players to {filename}")
            
        except Exception as e:
            logger.error(f"Failed to export players: {e}")
    
    def export_stats_to_csv(self, table_name: str, season: str):
        """Export stats data for a specific season and table"""
        try:
            logger.info(f"Exporting {table_name} data for season {season}...")
            
            # Get stats data for the season
            result = self.client.table(table_name).select('*').eq('season', season).execute()
            
            if not result.data:
                logger.warning(f"No {table_name} data found for season {season}")
                return
            
            filename = f"{self.data_dir}/{table_name}_{season.replace('-', '_')}.csv"
            
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                if result.data:
                    fieldnames = result.data[0].keys()
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(result.data)
            
            logger.info(f"Exported {len(result.data)} {table_name} records to {filename}")
            
        except Exception as e:
            logger.error(f"Failed to export {table_name} for {season}: {e}")
    
    def export_season_data(self, season: str):
        """Export all data for a specific season"""
        logger.info(f"Exporting all data for season {season}")
        
        # Export each stats table
        stats_tables = ['per_game_stats', 'per_36_stats', 'total_stats']
        
        for table in stats_tables:
            self.export_stats_to_csv(table, season)
    
    def list_available_seasons(self):
        """List all available seasons in the database"""
        try:
            result = self.client.table('per_game_stats').select('season').execute()
            seasons = list(set(record['season'] for record in result.data))
            seasons.sort(reverse=True)
            
            logger.info(f"Available seasons: {seasons}")
            return seasons
            
        except Exception as e:
            logger.error(f"Failed to list seasons: {e}")
            return []

def main():
    """Main function to export current data"""
    exporter = CSVExporter()
    
    # List available seasons
    seasons = exporter.list_available_seasons()
    
    # Export players data (only need to do this once)
    exporter.export_players_to_csv()
    
    # Export current season data as example
    if seasons:
        current_season = seasons[0]  # Most recent season
        exporter.export_season_data(current_season)
        logger.info(f"Exported data for season {current_season}")
    else:
        logger.warning("No seasons found in database")

if __name__ == "__main__":
    main()
