#!/usr/bin/env python3
"""
Update Current Players CSV with Correct Player IDs (Fixed Version)

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

class CurrentPlayersIDUpdaterFixed:
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

    def get_players_mapping_with_debug(self) -> Dict[int, str]:
        """Get mapping of nba_player_id -> player_id from Supabase players table with detailed debugging"""
        try:
            logger.info("🔍 Fetching player mappings from Supabase players table...")
            
            # First, get total count
            count_result = self.supabase.table('players').select('player_id', count='exact').execute()
            total_count = count_result.count if hasattr(count_result, 'count') else len(count_result.data) if count_result.data else 0
            logger.info(f"📊 Total players in Supabase: {total_count}")
            
            # Get all players in batches to avoid potential limits
            all_players = []
            batch_size = 1000
            offset = 0
            
            while True:
                result = self.supabase.table('players').select('player_id, nba_player_id, player_name').range(offset, offset + batch_size - 1).execute()
                
                if not result.data:
                    break
                
                all_players.extend(result.data)
                logger.info(f"📥 Fetched batch: {len(result.data)} players (total so far: {len(all_players)})")
                
                if len(result.data) < batch_size:
                    break
                
                offset += batch_size
            
            logger.info(f"📊 Total players fetched: {len(all_players)}")
            
            # Create mapping: nba_player_id -> player_id
            nba_to_uuid_mapping = {}
            valid_mappings = 0
            invalid_mappings = 0
            
            for player in all_players:
                nba_id = player.get('nba_player_id')
                uuid_id = player.get('player_id')
                player_name = player.get('player_name', 'Unknown')
                
                if nba_id is not None and uuid_id:
                    nba_to_uuid_mapping[nba_id] = uuid_id
                    valid_mappings += 1
                else:
                    invalid_mappings += 1
                    logger.warning(f"⚠️  Invalid mapping for {player_name}: NBA ID={nba_id}, UUID={uuid_id}")
            
            logger.info(f"✅ Created {len(nba_to_uuid_mapping)} player mappings")
            logger.info(f"📊 Valid mappings: {valid_mappings}")
            logger.info(f"📊 Invalid mappings: {invalid_mappings}")
            
            # Debug: Show some sample mappings
            sample_mappings = list(nba_to_uuid_mapping.items())[:5]
            logger.info(f"📋 Sample mappings:")
            for nba_id, uuid_id in sample_mappings:
                logger.info(f"  NBA ID {nba_id} -> {uuid_id}")
            
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

    def update_player_ids_with_debug(self, players_data: List[Dict], mapping: Dict[int, str]) -> Tuple[List[Dict], int, int]:
        """Update player_id values using the mapping with detailed debugging"""
        updated_players = []
        matched_count = 0
        unmatched_count = 0
        unmatched_details = []
        
        logger.info(f"🔄 Starting player ID updates...")
        logger.info(f"📊 CSV players to process: {len(players_data)}")
        logger.info(f"📊 Supabase mappings available: {len(mapping)}")
        
        for i, player in enumerate(players_data):
            try:
                nba_id_str = player.get('nba_player_id', '')
                player_name = player.get('player_name', 'Unknown')
                original_uuid = player.get('player_id')
                
                if not nba_id_str:
                    logger.warning(f"❌ [{i+1}/{len(players_data)}] {player_name}: No NBA ID in CSV")
                    unmatched_count += 1
                    unmatched_details.append(f"{player_name}: No NBA ID")
                    updated_players.append(player)
                    continue
                
                try:
                    nba_id = int(nba_id_str)
                except (ValueError, TypeError):
                    logger.warning(f"❌ [{i+1}/{len(players_data)}] {player_name}: Invalid NBA ID '{nba_id_str}'")
                    unmatched_count += 1
                    unmatched_details.append(f"{player_name}: Invalid NBA ID {nba_id_str}")
                    updated_players.append(player)
                    continue
                
                if nba_id in mapping:
                    # Found matching player in Supabase
                    correct_uuid = mapping[nba_id]
                    player['player_id'] = correct_uuid
                    matched_count += 1
                    
                    if original_uuid != correct_uuid:
                        logger.info(f"✅ [{i+1}/{len(players_data)}] Updated {player_name}: {original_uuid} -> {correct_uuid}")
                    else:
                        logger.info(f"✓ [{i+1}/{len(players_data)}] {player_name}: Already has correct UUID")
                else:
                    # No matching player found in Supabase
                    unmatched_count += 1
                    unmatched_details.append(f"{player_name}: NBA ID {nba_id} not in Supabase")
                    logger.warning(f"❌ [{i+1}/{len(players_data)}] {player_name} (NBA ID: {nba_id}) not found in Supabase")
                
                updated_players.append(player)
                
            except Exception as e:
                logger.error(f"Error processing player {player.get('player_name', 'Unknown')}: {e}")
                unmatched_count += 1
                unmatched_details.append(f"{player.get('player_name', 'Unknown')}: Processing error")
                updated_players.append(player)
        
        # Show detailed unmatched summary
        if unmatched_details:
            logger.info(f"\n❌ DETAILED UNMATCHED PLAYERS ({len(unmatched_details)} total):")
            for detail in unmatched_details[:10]:  # Show first 10
                logger.info(f"  - {detail}")
            if len(unmatched_details) > 10:
                logger.info(f"  ... and {len(unmatched_details) - 10} more")
        
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

    def run_update(self, input_csv: str, output_csv: str):
        """Run the complete ID update process"""
        logger.info("🔄 Starting Current Players ID Update (Fixed Version)")
        logger.info("=" * 60)
        
        # Get player mappings from Supabase with debugging
        mapping = self.get_players_mapping_with_debug()
        if not mapping:
            logger.error("❌ No player mappings found")
            return False
        
        # Read original CSV
        original_data = self.read_current_players_csv(input_csv)
        if not original_data:
            logger.error("❌ No CSV data to process")
            return False
        
        # Update player IDs with debugging
        updated_data, matched, unmatched = self.update_player_ids_with_debug(original_data, mapping)
        
        # Write updated CSV
        success = self.write_updated_csv(updated_data, output_csv)
        
        # Summary
        logger.info(f"\n📊 FINAL UPDATE SUMMARY:")
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
    output_csv = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_updated_ids_fixed.csv"
    
    # Check if input CSV file exists
    if not os.path.exists(input_csv):
        print(f"❌ Input CSV file not found: {input_csv}")
        sys.exit(1)
    
    # Run update
    updater = CurrentPlayersIDUpdaterFixed()
    success = updater.run_update(input_csv, output_csv)
    
    if success:
        print(f"\n✅ Player IDs successfully updated!")
        print(f"📁 Updated CSV: {output_csv}")
    else:
        print(f"\n❌ Update failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
