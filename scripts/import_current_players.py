#!/usr/bin/env python3
"""
Import Current Players to Supabase

This script imports current_players_name_matched.csv to the current_players table in Supabase.
"""

import csv
import os
import sys
from typing import List, Dict, Optional
import logging
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CurrentPlayersImporter:
    def __init__(self):
        """Initialize the Supabase client"""
        self.supabase = self._init_supabase()

    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        try:
            # Load environment variables
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
            
            if not supabase_url or not supabase_key:
                # Try to load from .env file
                env_path = '/Users/adarsh/RosterGuru/RosterGuru/.env'
                if os.path.exists(env_path):
                    with open(env_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                # Remove quotes from value if present
                                value = value.strip('"').strip("'")
                                if key == 'NEXT_PUBLIC_SUPABASE_URL':
                                    supabase_url = value
                                elif key == 'NEXT_PUBLIC_SUPABASE_SERVICE_KEY':
                                    supabase_key = value
            
            # Remove quotes if still present
            if supabase_url:
                supabase_url = supabase_url.strip('"').strip("'")
            if supabase_key:
                supabase_key = supabase_key.strip('"').strip("'")
            
            if not supabase_url or not supabase_key:
                raise ValueError("Supabase URL and Service Key are required")
            
            logger.info(f"Using Supabase URL: {supabase_url}")
            client = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabase client initialized successfully")
            return client
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            sys.exit(1)

    def read_csv_data(self, file_path: str) -> List[Dict]:
        """Read current players data from CSV"""
        try:
            players = []
            
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    # Clean and prepare the data
                    player_data = {
                        'player_id': row['player_id'].strip() if row['player_id'] else None,
                        'nba_player_id': int(row['nba_player_id']) if row['nba_player_id'] else None,
                        'espn_player_id': int(row['espn_player_id']) if row['espn_player_id'] else None,
                        'player_name': row['player_name'].strip() if row['player_name'] else None,
                        'position': row['position'].strip() if row['position'] else None,
                        'draft_year': int(row['draft_year']) if row['draft_year'] else None,
                        'jersey_number': int(row['jersey_number']) if row['jersey_number'] else None,
                        'college_name': row['college_name'].strip() if row['college_name'] else None,
                        'display_height': row['display_height'].strip() if row['display_height'] else None,
                        'display_weight': row['display_weight'].strip() if row['display_weight'] else None,
                        'age': int(row['age']) if row['age'] else None,
                        'injury_status': row['injury_status'].strip() if row['injury_status'] else None
                    }
                    
                    # Remove None values to let database handle defaults
                    clean_data = {k: v for k, v in player_data.items() if v is not None}
                    players.append(clean_data)
            
            logger.info(f"Read {len(players)} players from {file_path}")
            return players
            
        except FileNotFoundError:
            logger.error(f"CSV file not found: {file_path}")
            return []
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            return []

    def clear_current_players_table(self):
        """Clear existing data from current_players table"""
        try:
            logger.info("🗑️  Clearing existing current_players table...")
            
            result = self.supabase.table('current_players').delete().neq('player_id', '00000000-0000-0000-0000-000000000000').execute()
            
            logger.info("✅ Current players table cleared successfully")
            
        except Exception as e:
            logger.error(f"Error clearing current_players table: {e}")
            raise

    def import_players_batch(self, players: List[Dict], batch_size: int = 100):
        """Import players in batches to Supabase"""
        try:
            total_players = len(players)
            successful_imports = 0
            failed_imports = 0
            
            logger.info(f"🚀 Starting batch import of {total_players} players...")
            
            # Process in batches
            for i in range(0, total_players, batch_size):
                batch = players[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (total_players + batch_size - 1) // batch_size
                
                try:
                    logger.info(f"[Batch {batch_num}/{total_batches}] Importing {len(batch)} players...")
                    
                    result = self.supabase.table('current_players').upsert(batch).execute()
                    
                    if result.data:
                        successful_imports += len(batch)
                        logger.info(f"[Batch {batch_num}/{total_batches}] ✅ Successfully imported {len(batch)} players")
                    else:
                        failed_imports += len(batch)
                        logger.error(f"[Batch {batch_num}/{total_batches}] ❌ No data returned for batch")
                
                except Exception as e:
                    failed_imports += len(batch)
                    logger.error(f"[Batch {batch_num}/{total_batches}] ❌ Failed to import batch: {e}")
                    
                    # Log first few players in failed batch for debugging
                    logger.error(f"First few players in failed batch:")
                    for player in batch[:3]:
                        logger.error(f"  - {player.get('player_name', 'Unknown')}: {player}")
            
            logger.info(f"\n📊 IMPORT SUMMARY:")
            logger.info(f"Total players: {total_players}")
            logger.info(f"Successfully imported: {successful_imports}")
            logger.info(f"Failed imports: {failed_imports}")
            logger.info(f"Success rate: {(successful_imports/total_players*100):.1f}%")
            
            return successful_imports, failed_imports
            
        except Exception as e:
            logger.error(f"Error during batch import: {e}")
            return 0, total_players

    def verify_import(self) -> int:
        """Verify the import by counting records in current_players table"""
        try:
            result = self.supabase.table('current_players').select('player_id', count='exact').execute()
            count = result.count if hasattr(result, 'count') else len(result.data)
            
            logger.info(f"✅ Verification: {count} players found in current_players table")
            return count
            
        except Exception as e:
            logger.error(f"Error verifying import: {e}")
            return 0

    def preview_imported_data(self, limit: int = 5):
        """Preview some imported data"""
        try:
            result = self.supabase.table('current_players').select('*').limit(limit).execute()
            
            if result.data:
                logger.info(f"\n📋 PREVIEW OF IMPORTED DATA (first {limit} players):")
                logger.info("=" * 80)
                
                for i, player in enumerate(result.data):
                    logger.info(f"\n{i+1}. {player.get('player_name', 'Unknown')}")
                    logger.info(f"   Player ID: {player.get('player_id', 'N/A')}")
                    logger.info(f"   NBA ID: {player.get('nba_player_id', 'N/A')}")
                    logger.info(f"   ESPN ID: {player.get('espn_player_id', 'N/A')}")
                    logger.info(f"   Position: {player.get('position', 'N/A')}")
                    logger.info(f"   Age: {player.get('age', 'N/A')}")
                    logger.info(f"   Height: {player.get('display_height', 'N/A')}")
                    logger.info(f"   College: {player.get('college_name', 'N/A')}")
                    logger.info(f"   Draft Year: {player.get('draft_year', 'N/A')}")
            else:
                logger.warning("No data found for preview")
                
        except Exception as e:
            logger.error(f"Error previewing data: {e}")

    def run_import(self, csv_file_path: str, clear_table: bool = True):
        """Run the complete import process"""
        logger.info("🏀 Starting Current Players Import to Supabase")
        logger.info("=" * 60)
        
        # Read CSV data
        players_data = self.read_csv_data(csv_file_path)
        if not players_data:
            logger.error("❌ No player data to import")
            return False
        
        # Clear existing data if requested
        if clear_table:
            self.clear_current_players_table()
        
        # Import players
        successful, failed = self.import_players_batch(players_data)
        
        # Verify import
        final_count = self.verify_import()
        
        # Preview imported data
        self.preview_imported_data()
        
        success = successful > 0 and failed == 0
        if success:
            logger.info(f"\n🎉 Import completed successfully!")
            logger.info(f"📊 {successful} players imported to current_players table")
        else:
            logger.error(f"\n❌ Import completed with issues")
            logger.error(f"📊 {successful} successful, {failed} failed")
        
        return success

def main():
    """Main function"""
    csv_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_final.csv"
    
    # Check if CSV file exists
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        sys.exit(1)
    
    # Run import
    importer = CurrentPlayersImporter()
    success = importer.run_import(csv_file, clear_table=True)
    
    if success:
        print(f"\n✅ Current players successfully imported to Supabase!")
    else:
        print(f"\n❌ Import failed or completed with issues")
        sys.exit(1)

if __name__ == "__main__":
    main()
