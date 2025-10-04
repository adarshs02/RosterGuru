#!/usr/bin/env python3
"""
Fix Current Players IDs

This script updates the player_id values in current_players_updated_ids_fixed.csv
to match the actual player_id values from the Supabase players table.
"""

import csv
import os
import sys
from typing import Dict, List
import logging
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CurrentPlayersIDFixer:
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
            
            client = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabase client initialized successfully")
            return client
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            sys.exit(1)

    def get_players_mapping(self) -> Dict[int, str]:
        """Get mapping of nba_player_id -> player_id from Supabase players table"""
        try:
            logger.info("🔍 Fetching NBA ID to Player ID mapping from Supabase...")
            
            # Get all players in batches
            nba_to_player_id = {}
            batch_size = 1000
            offset = 0
            
            while True:
                result = self.supabase.table('players').select('player_id, nba_player_id').range(offset, offset + batch_size - 1).execute()
                
                if not result.data:
                    break
                
                for player in result.data:
                    nba_id = player.get('nba_player_id')
                    player_id = player.get('player_id')
                    
                    if nba_id and player_id:
                        nba_to_player_id[int(nba_id)] = player_id
                
                logger.info(f"📥 Fetched batch: {len(result.data)} players (total mapping: {len(nba_to_player_id)})")
                
                if len(result.data) < batch_size:
                    break
                
                offset += batch_size
            
            logger.info(f"✅ Total NBA ID mappings: {len(nba_to_player_id)}")
            return nba_to_player_id
            
        except Exception as e:
            logger.error(f"Error fetching players mapping: {e}")
            return {}

    def fix_csv_player_ids(self, input_file: str, output_file: str):
        """Fix player_id values in CSV using Supabase players table"""
        print("🔧 Fixing Player IDs in Current Players CSV")
        print("=" * 50)
        
        # Get the mapping from Supabase
        nba_to_player_id = self.get_players_mapping()
        if not nba_to_player_id:
            print("❌ No player mappings found")
            return False
        
        try:
            # Read the input CSV
            updated_players = []
            successful_updates = 0
            failed_updates = 0
            
            with open(input_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                fieldnames = reader.fieldnames
                
                for row in reader:
                    nba_id = row.get('nba_player_id')
                    player_name = row.get('player_name', 'Unknown')
                    old_player_id = row.get('player_id')
                    
                    if not nba_id:
                        logger.warning(f"⚠️ {player_name}: No NBA ID, keeping original player_id")
                        updated_players.append(row)
                        failed_updates += 1
                        continue
                    
                    try:
                        nba_id_int = int(nba_id)
                        
                        if nba_id_int in nba_to_player_id:
                            new_player_id = nba_to_player_id[nba_id_int]
                            row['player_id'] = new_player_id
                            
                            if old_player_id != new_player_id:
                                logger.info(f"🔄 {player_name}: Updated player_id from {old_player_id} to {new_player_id}")
                            
                            successful_updates += 1
                        else:
                            logger.warning(f"⚠️ {player_name}: NBA ID {nba_id_int} not found in players table")
                            failed_updates += 1
                        
                        updated_players.append(row)
                        
                    except ValueError:
                        logger.error(f"❌ {player_name}: Invalid NBA ID format: {nba_id}")
                        updated_players.append(row)
                        failed_updates += 1
            
            # Write the updated CSV
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(updated_players)
            
            print(f"\n📊 UPDATE SUMMARY:")
            print(f"Total players processed: {len(updated_players)}")
            print(f"Successful updates: {successful_updates}")
            print(f"Failed updates: {failed_updates}")
            print(f"Success rate: {(successful_updates/(successful_updates + failed_updates)*100):.1f}%")
            print(f"\n📁 Updated CSV saved to: {output_file}")
            
            # Show some sample updates
            if successful_updates > 0:
                print(f"\n✅ Player IDs have been updated to match the players table")
                print(f"   The CSV is now ready for import to current_players table")
            
            return successful_updates > failed_updates
            
        except FileNotFoundError:
            logger.error(f"Input file not found: {input_file}")
            return False
        except Exception as e:
            logger.error(f"Error processing CSV: {e}")
            return False

def main():
    """Main function"""
    input_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_updated_ids_fixed.csv"
    output_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_final.csv"
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)
    
    # Fix the player IDs
    fixer = CurrentPlayersIDFixer()
    success = fixer.fix_csv_player_ids(input_file, output_file)
    
    if success:
        print(f"\n✅ Player IDs fixed successfully!")
        print(f"📄 Ready to import: {output_file}")
    else:
        print(f"\n❌ Fix failed or completed with issues")
        sys.exit(1)

if __name__ == "__main__":
    main()
