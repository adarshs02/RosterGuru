#!/usr/bin/env python3
"""
Update ESPN Player IDs in Players Table

This script updates the espn_player_id field in the main players table
using the ESPN player IDs from current_players_updated_ids_fixed.csv.
"""

import csv
import os
import sys
from typing import Dict, List, Tuple
import logging
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ESPNPlayerIDUpdater:
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

    def read_csv_espn_mappings(self, file_path: str) -> List[Dict]:
        """Read player_id -> espn_player_id mappings from CSV"""
        try:
            mappings = []
            
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    player_id = row.get('player_id', '').strip()
                    espn_id_str = row.get('espn_player_id', '').strip()
                    player_name = row.get('player_name', 'Unknown').strip()
                    
                    if player_id and espn_id_str:
                        try:
                            espn_id = int(espn_id_str)
                            mappings.append({
                                'player_id': player_id,
                                'espn_player_id': espn_id,
                                'player_name': player_name
                            })
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid ESPN ID for {player_name}: '{espn_id_str}'")
                    else:
                        logger.warning(f"Missing data for {player_name}: player_id='{player_id}', espn_id='{espn_id_str}'")
            
            logger.info(f"Read {len(mappings)} ESPN ID mappings from {file_path}")
            return mappings
            
        except FileNotFoundError:
            logger.error(f"CSV file not found: {file_path}")
            return []
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            return []

    def check_current_espn_ids(self) -> Dict[str, int]:
        """Check current ESPN IDs in the players table"""
        try:
            logger.info("🔍 Checking current ESPN IDs in players table...")
            
            result = self.supabase.table('players').select('player_id, espn_player_id, player_name').execute()
            
            if not result.data:
                logger.warning("No players found in players table")
                return {}
            
            current_espn_ids = {}
            populated_count = 0
            null_count = 0
            
            for player in result.data:
                player_id = player.get('player_id')
                espn_id = player.get('espn_player_id')
                
                if player_id:
                    current_espn_ids[player_id] = espn_id
                    if espn_id is not None:
                        populated_count += 1
                    else:
                        null_count += 1
            
            logger.info(f"📊 Current ESPN IDs status:")
            logger.info(f"  Total players: {len(current_espn_ids)}")
            logger.info(f"  With ESPN IDs: {populated_count}")
            logger.info(f"  Without ESPN IDs: {null_count}")
            
            return current_espn_ids
            
        except Exception as e:
            logger.error(f"Error checking current ESPN IDs: {e}")
            return {}

    def update_espn_ids_batch(self, mappings: List[Dict], batch_size: int = 100) -> Tuple[int, int, int]:
        """Update ESPN IDs in players table using batch updates"""
        try:
            total_mappings = len(mappings)
            successful_updates = 0
            failed_updates = 0
            skipped_updates = 0
            
            logger.info(f"🚀 Starting batch update of {total_mappings} ESPN IDs...")
            
            # Get current ESPN IDs to compare
            current_espn_ids = self.check_current_espn_ids()
            
            # Process in batches
            for i in range(0, total_mappings, batch_size):
                batch = mappings[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (total_mappings + batch_size - 1) // batch_size
                
                logger.info(f"[Batch {batch_num}/{total_batches}] Processing {len(batch)} updates...")
                
                batch_successful = 0
                batch_failed = 0
                batch_skipped = 0
                
                for mapping in batch:
                    try:
                        player_id = mapping['player_id']
                        new_espn_id = mapping['espn_player_id']
                        player_name = mapping['player_name']
                        
                        # Check if update is needed
                        current_espn_id = current_espn_ids.get(player_id)
                        
                        if current_espn_id == new_espn_id:
                            # ESPN ID already correct
                            batch_skipped += 1
                            logger.debug(f"✓ {player_name}: ESPN ID already {new_espn_id}")
                            continue
                        
                        # Perform update
                        result = self.supabase.table('players').update({
                            'espn_player_id': new_espn_id
                        }).eq('player_id', player_id).execute()
                        
                        if result.data:
                            batch_successful += 1
                            if current_espn_id is None:
                                logger.info(f"✅ {player_name}: Set ESPN ID to {new_espn_id}")
                            else:
                                logger.info(f"✅ {player_name}: Updated ESPN ID from {current_espn_id} to {new_espn_id}")
                        else:
                            batch_failed += 1
                            logger.error(f"❌ {player_name}: Update failed - no data returned")
                    
                    except Exception as e:
                        batch_failed += 1
                        logger.error(f"❌ Error updating {mapping.get('player_name', 'Unknown')}: {e}")
                
                successful_updates += batch_successful
                failed_updates += batch_failed
                skipped_updates += batch_skipped
                
                logger.info(f"[Batch {batch_num}/{total_batches}] ✅ {batch_successful} success, ❌ {batch_failed} failed, ✓ {batch_skipped} skipped")
            
            return successful_updates, failed_updates, skipped_updates
            
        except Exception as e:
            logger.error(f"Error during batch update: {e}")
            return 0, total_mappings, 0

    def verify_updates(self, mappings: List[Dict]) -> int:
        """Verify the ESPN ID updates were successful"""
        try:
            logger.info("🔍 Verifying ESPN ID updates...")
            
            # Get updated data from players table
            result = self.supabase.table('players').select('player_id, espn_player_id, player_name').execute()
            
            if not result.data:
                logger.error("No players found for verification")
                return 0
            
            # Create lookup for current data
            current_data = {player['player_id']: player.get('espn_player_id') for player in result.data}
            
            verified_count = 0
            mismatch_count = 0
            
            for mapping in mappings[:10]:  # Verify first 10 as sample
                player_id = mapping['player_id']
                expected_espn_id = mapping['espn_player_id']
                player_name = mapping['player_name']
                
                actual_espn_id = current_data.get(player_id)
                
                if actual_espn_id == expected_espn_id:
                    verified_count += 1
                    logger.info(f"✅ Verified {player_name}: ESPN ID = {actual_espn_id}")
                else:
                    mismatch_count += 1
                    logger.error(f"❌ Mismatch {player_name}: Expected {expected_espn_id}, Got {actual_espn_id}")
            
            logger.info(f"📊 Verification sample: {verified_count} correct, {mismatch_count} mismatched")
            return verified_count
            
        except Exception as e:
            logger.error(f"Error during verification: {e}")
            return 0

    def run_update(self, csv_file: str):
        """Run the complete ESPN ID update process"""
        logger.info("🏀 Starting ESPN Player ID Update in Players Table")
        logger.info("=" * 65)
        
        # Read CSV mappings
        mappings = self.read_csv_espn_mappings(csv_file)
        if not mappings:
            logger.error("❌ No ESPN ID mappings found")
            return False
        
        # Update ESPN IDs
        successful, failed, skipped = self.update_espn_ids_batch(mappings)
        
        # Verify updates
        verified = self.verify_updates(mappings)
        
        # Summary
        logger.info(f"\n📊 UPDATE SUMMARY:")
        logger.info(f"Total mappings processed: {len(mappings)}")
        logger.info(f"Successful updates: {successful}")
        logger.info(f"Failed updates: {failed}")
        logger.info(f"Skipped (already correct): {skipped}")
        logger.info(f"Success rate: {(successful/(successful+failed)*100):.1f}%" if (successful+failed) > 0 else "N/A")
        
        success = failed == 0
        if success:
            logger.info(f"\n🎉 ESPN ID update completed successfully!")
        else:
            logger.error(f"\n❌ ESPN ID update completed with {failed} failures")
        
        return success

def main():
    """Main function"""
    csv_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_updated_ids_fixed.csv"
    
    # Check if CSV file exists
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        sys.exit(1)
    
    # Run update
    updater = ESPNPlayerIDUpdater()
    success = updater.run_update(csv_file)
    
    if success:
        print(f"\n✅ ESPN Player IDs successfully updated in players table!")
    else:
        print(f"\n❌ Update failed or completed with issues")
        sys.exit(1)

if __name__ == "__main__":
    main()
