#!/usr/bin/env python3
"""
Add Team Information to Current Players

This script adds team information to the current_players table by fetching
team roster data from ESPN API and mapping players to their teams.
"""

import requests
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

class TeamUpdater:
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

    def get_team_info(self, team_id: int) -> Optional[Dict]:
        """Get team information from ESPN API"""
        try:
            url = f"{self.base_url}/teams/{team_id}"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            team_info = {}
            if 'team' in data:
                team = data['team']
                team_info['id'] = team_id
                team_info['name'] = team.get('displayName', '')
                team_info['abbreviation'] = team.get('abbreviation', '')
                team_info['location'] = team.get('location', '')
                team_info['nickname'] = team.get('name', '')
                
            return team_info
            
        except Exception as e:
            logger.warning(f"Error fetching team {team_id} info: {e}")
            return None

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

    def collect_all_player_teams(self) -> Dict[str, Dict]:
        """Collect team data for all players from all NBA teams"""
        print("🏀 Collecting Team Data from All NBA Teams")
        print("=" * 50)
        
        # NBA has 30 teams (team IDs 1-30)
        player_team_map = {}  # normalized_name -> team_info
        total_players = 0
        successful_teams = 0
        
        # First, get team information for all teams
        team_info_cache = {}
        
        for team_id in range(1, 31):  # Teams 1-30
            logger.info(f"📥 Processing team {team_id}...")
            
            # Get team info
            team_info = self.get_team_info(team_id)
            if team_info:
                team_info_cache[team_id] = team_info
                logger.info(f"   Team: {team_info['name']} ({team_info['abbreviation']})")
            
            # Get team roster
            roster_data = self.get_team_roster(team_id)
            
            if roster_data and 'athletes' in roster_data:
                team_players = 0
                for athlete in roster_data['athletes']:
                    player_name = athlete.get('fullName', '')
                    if not player_name:
                        continue
                    
                    normalized_name = self.normalize_name(player_name)
                    
                    # Store player with team info
                    if normalized_name not in player_team_map and team_info:
                        player_team_map[normalized_name] = {
                            'player_name': player_name,
                            'team_id': team_id,
                            'team_name': team_info['name'],
                            'team_abbreviation': team_info['abbreviation'],
                            'team_location': team_info['location'],
                            'team_nickname': team_info['nickname']
                        }
                        team_players += 1
                
                total_players += team_players
                successful_teams += 1
                logger.info(f"   ✅ {team_players} players added to map")
            else:
                logger.warning(f"   ❌ Failed to get roster for team {team_id}")
            
            time.sleep(0.2)  # Rate limiting
        
        print(f"\n📊 COLLECTION SUMMARY:")
        print(f"Teams processed: {successful_teams}/30")
        print(f"Total players with team data: {len(player_team_map)}")
        print(f"Total player records: {total_players}")
        
        # Show some examples
        print(f"\n📋 SAMPLE TEAM ASSIGNMENTS:")
        print("-" * 50)
        for i, (name, info) in enumerate(list(player_team_map.items())[:10]):
            print(f"{i+1:2d}. {info['player_name']} → {info['team_name']} ({info['team_abbreviation']})")
        
        return player_team_map

    def add_team_columns_if_needed(self):
        """Add team columns to current_players table if they don't exist"""
        try:
            logger.info("🔧 Checking if team columns exist...")
            
            # Try to select team columns to see if they exist
            result = self.supabase.table('current_players').select('team_name, team_abbreviation').limit(1).execute()
            logger.info("✅ Team columns already exist")
            return True
            
        except Exception as e:
            if "column" in str(e).lower() and "does not exist" in str(e).lower():
                logger.info("📝 Team columns do not exist, need to be added to schema")
                print("\n⚠️  SCHEMA UPDATE NEEDED:")
                print("Team columns need to be added to the current_players table.")
                print("Please run these SQL commands in your Supabase SQL editor:")
                print("\nALTER TABLE current_players ADD COLUMN team_name VARCHAR(100);")
                print("ALTER TABLE current_players ADD COLUMN team_abbreviation VARCHAR(10);")
                print("ALTER TABLE current_players ADD COLUMN team_location VARCHAR(100);")
                print("ALTER TABLE current_players ADD COLUMN team_nickname VARCHAR(100);")
                print("\nThen re-run this script.")
                return False
            else:
                logger.error(f"Error checking team columns: {e}")
                return False

    def update_supabase_with_teams(self, team_map: Dict[str, Dict]):
        """Update current_players table with team data"""
        print(f"\n🔄 Updating Current Players Table with Team Data")
        print("=" * 55)
        
        try:
            # Get all current players from Supabase
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
                
                if normalized_name in team_map:
                    team_data = team_map[normalized_name]
                    
                    # Prepare batch update
                    batch_updates.append({
                        'player_id': player_id,
                        'team_name': team_data['team_name'],
                        'team_abbreviation': team_data['team_abbreviation'],
                        'team_location': team_data['team_location'],
                        'team_nickname': team_data['team_nickname']
                    })
                    
                    logger.info(f"✅ {player_name} → {team_data['team_name']} ({team_data['team_abbreviation']})")
                    matched_count += 1
                else:
                    logger.warning(f"⚠️ {player_name}: No team data found")
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
                                    'team_name': player_update['team_name'],
                                    'team_abbreviation': player_update['team_abbreviation'],
                                    'team_location': player_update['team_location'],
                                    'team_nickname': player_update['team_nickname']
                                }).eq('player_id', player_update['player_id']).execute()
                                updated_count += 1
                            except Exception as ie:
                                logger.error(f"     ❌ Failed individual update for {player_update['player_id']}: {ie}")
                    
                    time.sleep(0.1)  # Small delay between batches
            
            print(f"\n📊 UPDATE SUMMARY:")
            print(f"Total current players: {len(current_players)}")
            print(f"Matched with ESPN team data: {matched_count}")
            print(f"Not matched: {not_matched_count}")
            print(f"Successfully updated: {updated_count}")
            print(f"Match rate: {(matched_count/len(current_players)*100):.1f}%")
            print(f"Update rate: {(updated_count/len(current_players)*100):.1f}%")
            
            return updated_count > 0
            
        except Exception as e:
            logger.error(f"Error updating current players with team data: {e}")
            return False

def main():
    """Main function"""
    updater = TeamUpdater()
    
    # Check if team columns exist
    if not updater.add_team_columns_if_needed():
        sys.exit(1)
    
    # Collect team data from ESPN
    team_map = updater.collect_all_player_teams()
    
    if not team_map:
        print("❌ No team data collected from ESPN")
        sys.exit(1)
    
    # Update current_players table
    success = updater.update_supabase_with_teams(team_map)
    
    if success:
        print(f"\n✅ Team data update completed successfully!")
        print(f"The current_players table now includes team information for all players")
    else:
        print(f"\n❌ Team data update failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
