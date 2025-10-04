#!/usr/bin/env python3
"""
Update Current Players CSV with Correct Player IDs

This script updates the player_id values in current_players_name_matched.csv
to match the actual player_id values from the Supabase players table.
"""

import csv
import os
import sys
from typing import Dict, List, Optional, Tuple
import logging
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CurrentPlayersIDUpdater:
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
            logger.info("🔍 Fetching player mappings from Supabase players table...")
            
            result = self.supabase.table('players').select('player_id, nba_player_id, player_name').execute()
            
            if not result.data:
                logger.error("No players found in Supabase players table")
                return {}
            
            # Create mapping: nba_player_id -> player_id
            nba_to_uuid_mapping = {}
            for player in result.data:
                nba_id = player.get('nba_player_id')
                uuid_id = player.get('player_id')
                if nba_id and uuid_id:
                    nba_to_uuid_mapping[nba_id] = uuid_id
            
            logger.info(f"✅ Found {len(nba_to_uuid_mapping)} player mappings")
            return nba_to_uuid_mapping
            
        except Exception as e:
            logger.error(f"Error fetching player mappings: {e}")
            return {}

    def read_current_players_csv(self, file_path: str) -> List[Dict]:
        """Read current players CSV"""
        try:
            players = []
            
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    players.append(row)
            
            logger.info(f"Read {len(players)} players from {file_path}")
            return players
            
        except FileNotFoundError:
            logger.error(f"CSV file not found: {file_path}")
            return []
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            return []

    def update_player_ids(self, players_data: List[Dict], mapping: Dict[int, str]) -> Tuple[List[Dict], int, int]:
        """Update player_id values using the mapping"""
        updated_players = []
        matched_count = 0
        unmatched_count = 0
        
        for player in players_data:
            try:
                nba_id = int(player.get('nba_player_id', 0))
                original_uuid = player.get('player_id')
                
                if nba_id in mapping:
                    # Found matching player in Supabase
                    correct_uuid = mapping[nba_id]
                    player['player_id'] = correct_uuid
                    matched_count += 1
                    
                    if original_uuid != correct_uuid:
                        logger.info(f"✅ Updated {player['player_name']}: {original_uuid} -> {correct_uuid}")
                    else:
                        logger.info(f"✓ {player['player_name']}: Already has correct UUID")
                else:
                    # No matching player found in Supabase
                    unmatched_count += 1
                    logger.warning(f"❌ {player['player_name']} (NBA ID: {nba_id}) not found in Supabase players table")
                
                updated_players.append(player)
                
            except (ValueError, TypeError) as e:
                logger.error(f"Error processing player {player.get('player_name', 'Unknown')}: {e}")
                unmatched_count += 1
                updated_players.append(player)
        
        return updated_players, matched_count, unmatched_count

    def write_updated_csv(self, players_data: List[Dict], output_file: str) -> bool:
        """Write updated players data to CSV file"""
        try:
            fieldnames = [
                'player_id',
                'nba_player_id',
                'espn_player_id',
                'player_name',
                'position',
                'draft_year',
                'jersey_number',
                'college_name',
                'display_height',
                'display_weight',
                'age',
                'injury_status'
            ]
            
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(players_data)
            
            logger.info(f"✅ Successfully wrote {len(players_data)} players to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error writing CSV file: {e}")
            return False

    def preview_changes(self, original_data: List[Dict], updated_data: List[Dict], num_samples: int = 5):
        """Preview the changes made to player IDs"""
        logger.info(f"\n📋 PREVIEW OF CHANGES (first {num_samples} updated players):")
        logger.info("=" * 80)
        
        changes_shown = 0
        for i, (original, updated) in enumerate(zip(original_data, updated_data)):
            if original['player_id'] != updated['player_id'] and changes_shown < num_samples:
                logger.info(f"\n{changes_shown + 1}. {updated['player_name']}")
                logger.info(f"   NBA ID: {updated['nba_player_id']}")
                logger.info(f"   Old UUID: {original['player_id']}")
                logger.info(f"   New UUID: {updated['player_id']}")
                changes_shown += 1

    def run_update(self, input_csv: str, output_csv: str):
        """Run the complete ID update process"""
        logger.info("🔄 Starting Current Players ID Update")
        logger.info("=" * 50)
        
        # Get player mappings from Supabase
        mapping = self.get_players_mapping()
        if not mapping:
            logger.error("❌ No player mappings found")
            return False
        
        # Read original CSV
        original_data = self.read_current_players_csv(input_csv)
        if not original_data:
            logger.error("❌ No CSV data to process")
            return False
        
        # Update player IDs
        updated_data, matched, unmatched = self.update_player_ids(original_data, mapping)
        
        # Preview changes
        self.preview_changes(original_data, updated_data)
        
        # Write updated CSV
        success = self.write_updated_csv(updated_data, output_csv)
        
        # Summary
        logger.info(f"\n📊 UPDATE SUMMARY:")
        logger.info(f"Total players processed: {len(original_data)}")
        logger.info(f"Successfully matched: {matched}")
        logger.info(f"Not found in Supabase: {unmatched}")
        logger.info(f"Success rate: {(matched/len(original_data)*100):.1f}%")
        
        if success:
            logger.info(f"\n🎉 Update completed successfully!")
            logger.info(f"📁 Updated CSV: {output_csv}")
        else:
            logger.error(f"\n❌ Update failed")
        
        return success

def main():
    """Main function"""
    input_csv = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_name_matched.csv"
    output_csv = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_updated_ids.csv"
    
    # Check if input CSV file exists
    if not os.path.exists(input_csv):
        print(f"❌ Input CSV file not found: {input_csv}")
        sys.exit(1)
    
    # Run update
    updater = CurrentPlayersIDUpdater()
    success = updater.run_update(input_csv, output_csv)
    
    if success:
        print(f"\n✅ Player IDs successfully updated!")
        print(f"📁 Updated CSV: {output_csv}")
    else:
        print(f"\n❌ Update failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
