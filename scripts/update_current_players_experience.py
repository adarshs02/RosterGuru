#!/usr/bin/env python3
"""
Update Current Players with Experience Data

This script replaces draft_year with experience_years in the current_players table
using ESPN roster data that provides complete coverage of experience.years.
"""

import requests
import csv
import os
import sys
import time
from typing import Dict, List, Optional
import logging
from supabase import create_client, Client
import unicodedata

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CurrentPlayersExperienceUpdater:
    def __init__(self):
        """Initialize the ESPN API client and Supabase client"""
        self.base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
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

    def normalize_name(self, name: str) -> str:
        """Normalize player name for matching"""
        # Remove accents and normalize
        normalized = unicodedata.normalize('NFD', name)
        ascii_name = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
        
        # Clean up
        cleaned = ascii_name.lower().strip()
        cleaned = cleaned.replace('.', '').replace(',', '').replace("'", '')
        cleaned = ' '.join(cleaned.split())  # Normalize whitespace
        
        return cleaned

    def get_team_roster(self, team_id: int) -> Optional[Dict]:
        """Get team roster from ESPN API"""
        try:
            url = f"{self.base_url}/teams/{team_id}/roster"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Error fetching team {team_id} roster: {e}")
            return None

    def collect_all_player_experience(self) -> Dict[str, int]:
        """Collect experience data for all players from all NBA teams"""
        print("🏀 Collecting Experience Data from All NBA Teams")
        print("=" * 55)
        
        # NBA has 30 teams (team IDs 1-30)
        player_experience_map = {}  # normalized_name -> years_experience
        total_players = 0
        successful_teams = 0
        
        for team_id in range(1, 31):  # Teams 1-30
            logger.info(f"📥 Fetching roster for team {team_id}...")
            roster_data = self.get_team_roster(team_id)
            
            if roster_data and 'athletes' in roster_data:
                team_players = 0
                for athlete in roster_data['athletes']:
                    player_name = athlete.get('fullName', '')
                    if not player_name:
                        continue
                    
                    normalized_name = self.normalize_name(player_name)
                    
                    # Extract experience years
                    experience_years = None
                    if 'experience' in athlete and athlete['experience']:
                        if 'years' in athlete['experience']:
                            experience_years = athlete['experience']['years']
                    
                    # Store if we have experience data
                    if experience_years is not None and normalized_name not in player_experience_map:
                        player_experience_map[normalized_name] = {
                            'experience_years': experience_years,
                            'player_name': player_name,
                            'team_id': team_id
                        }
                        team_players += 1
                
                total_players += team_players
                successful_teams += 1
                logger.info(f"   ✅ {team_players} players with experience data")
            else:
                logger.warning(f"   ❌ Failed to get roster for team {team_id}")
            
            time.sleep(0.2)  # Rate limiting
        
        print(f"\n📊 COLLECTION SUMMARY:")
        print(f"Teams processed: {successful_teams}/30")
        print(f"Total players with experience data: {len(player_experience_map)}")
        print(f"Total player records: {total_players}")
        
        return player_experience_map

    def update_supabase_current_players(self, experience_map: Dict[str, Dict]):
        """Update current_players table with experience data"""
        print(f"\n🔄 Updating Current Players Table with Experience Data")
        print("=" * 60)
        
        try:
            # First, get all current players from Supabase
            logger.info("📥 Fetching current players from Supabase...")
            result = self.supabase.table('current_players').select('player_id, player_name').execute()
            
            if not result.data:
                logger.error("No current players found in Supabase")
                return False
            
            current_players = result.data
            logger.info(f"Found {len(current_players)} current players in Supabase")
            
            # Match and update players
            matched_count = 0
            not_matched_count = 0
            updated_count = 0
            batch_updates = []
            
            for player in current_players:
                player_id = player['player_id']
                player_name = player['player_name']
                normalized_name = self.normalize_name(player_name)
                
                if normalized_name in experience_map:
                    experience_data = experience_map[normalized_name]
                    experience_years = experience_data['experience_years']
                    
                    # Prepare batch update
                    batch_updates.append({
                        'player_id': player_id,
                        'experience_years': experience_years
                    })
                    
                    logger.info(f"✅ {player_name}: {experience_years} years experience")
                    matched_count += 1
                else:
                    logger.warning(f"⚠️ {player_name}: No experience data found")
                    not_matched_count += 1
            
            # Execute batch updates
            if batch_updates:
                logger.info(f"🚀 Executing batch update for {len(batch_updates)} players...")
                
                # Update in batches of 100
                batch_size = 100
                for i in range(0, len(batch_updates), batch_size):
                    batch = batch_updates[i:i + batch_size]
                    
                    try:
                        # Use upsert to update existing records
                        self.supabase.table('current_players').upsert(batch, on_conflict='player_id').execute()
                        updated_count += len(batch)
                        logger.info(f"   ✅ Updated batch {i//batch_size + 1}: {len(batch)} players")
                        
                    except Exception as e:
                        logger.error(f"   ❌ Failed to update batch {i//batch_size + 1}: {e}")
                        # Try individual updates for this batch
                        for player_update in batch:
                            try:
                                self.supabase.table('current_players').update({
                                    'experience_years': player_update['experience_years']
                                }).eq('player_id', player_update['player_id']).execute()
                                updated_count += 1
                            except Exception as ie:
                                logger.error(f"     ❌ Failed individual update for {player_update['player_id']}: {ie}")
                    
                    time.sleep(0.1)  # Small delay between batches
            
            print(f"\n📊 UPDATE SUMMARY:")
            print(f"Total current players: {len(current_players)}")
            print(f"Matched with ESPN data: {matched_count}")
            print(f"Not matched: {not_matched_count}")
            print(f"Successfully updated: {updated_count}")
            print(f"Match rate: {(matched_count/len(current_players)*100):.1f}%")
            print(f"Update rate: {(updated_count/len(current_players)*100):.1f}%")
            
            return updated_count > 0
            
        except Exception as e:
            logger.error(f"Error updating current players: {e}")
            return False

    def add_experience_column_if_needed(self):
        """Add experience_years column to current_players table if it doesn't exist"""
        try:
            logger.info("🔧 Checking if experience_years column exists...")
            
            # Try to select experience_years to see if column exists
            result = self.supabase.table('current_players').select('experience_years').limit(1).execute()
            logger.info("✅ experience_years column already exists")
            return True
            
        except Exception as e:
            if "column" in str(e).lower() and "does not exist" in str(e).lower():
                logger.info("📝 experience_years column does not exist, needs to be added to schema")
                print("\n⚠️  SCHEMA UPDATE NEEDED:")
                print("The experience_years column needs to be added to the current_players table.")
                print("Please run this SQL command in your Supabase SQL editor:")
                print("\nALTER TABLE current_players ADD COLUMN experience_years INTEGER;")
                print("\nThen re-run this script.")
                return False
            else:
                logger.error(f"Error checking experience_years column: {e}")
                return False

def main():
    """Main function"""
    updater = CurrentPlayersExperienceUpdater()
    
    # Check if experience_years column exists
    if not updater.add_experience_column_if_needed():
        sys.exit(1)
    
    # Collect experience data from ESPN
    experience_map = updater.collect_all_player_experience()
    
    if not experience_map:
        print("❌ No experience data collected from ESPN")
        sys.exit(1)
    
    # Update current_players table
    success = updater.update_supabase_current_players(experience_map)
    
    if success:
        print(f"\n✅ Experience data update completed successfully!")
        print(f"The current_players table now has experience_years instead of draft_year")
    else:
        print(f"\n❌ Experience data update failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
