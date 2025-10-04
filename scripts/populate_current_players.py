#!/usr/bin/env python3
"""
Populate Current Players Table Script

This script populates the current_players table in Supabase using data from:
1. Existing players table (for NBA API IDs and player_id UUIDs)
2. ESPN API (for additional player metadata)

The script maps players between NBA API and ESPN API using name normalization.
"""

import requests
import json
import time
import os
import re
import unicodedata
from typing import Dict, List, Optional, Tuple
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CurrentPlayersPopulator:
    def __init__(self):
        """Initialize the populator with Supabase, NBA API, and ESPN API clients."""
        # Supabase setup
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing Supabase credentials in environment variables")
            
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # NBA API setup
        self.nba_base_url = "https://stats.nba.com/stats"
        
        # ESPN API setup
        self.espn_base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.nba.com/',
            'x-nba-stats-origin': 'stats',
            'x-nba-stats-token': 'true'
        })
        
    def normalize_name(self, name: str) -> str:
        """Normalize player name for matching between APIs."""
        # Remove diacritical marks using Unicode normalization
        normalized = unicodedata.normalize('NFD', name)
        # Remove combining characters (accents)
        no_accents = re.sub(r'[\u0300-\u036f]', '', normalized)
        return no_accents.lower().strip()
    
    def get_nba_players(self) -> List[Dict]:
        """Get all active NBA players from NBA API."""
        try:
            logger.info("Fetching current NBA players from NBA API...")
            
            # Get all players for current season
            url = f"{self.nba_base_url}/commonallplayers"
            params = {
                'LeagueID': '00',  # NBA
                'Season': '2024-25',  # Current season
                'IsOnlyCurrentSeason': '1'  # Only current season players
            }
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'resultSets' in data and data['resultSets']:
                headers = data['resultSets'][0]['headers']
                rows = data['resultSets'][0]['rowSet']
                
                players = []
                for row in rows:
                    player_dict = dict(zip(headers, row))
                    # Only include active players
                    if player_dict.get('ROSTERSTATUS') == 1:  # 1 = Active
                        players.append({
                            'nba_player_id': player_dict['PERSON_ID'],
                            'player_name': player_dict['DISPLAY_FIRST_LAST'],
                            'team_abbreviation': player_dict.get('TEAM_ABBREVIATION', '')
                        })
                
                logger.info(f"Found {len(players)} active NBA players")
                return players
            else:
                logger.warning("No NBA players found")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching NBA players: {e}")
            return []
    
    def get_espn_teams(self) -> List[Dict]:
        """Get all NBA teams from ESPN API."""
        try:
            url = f"{self.espn_base_url}/teams"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            teams = []
            
            if 'sports' in data and data['sports']:
                leagues = data['sports'][0].get('leagues', [])
                if leagues:
                    teams = leagues[0].get('teams', [])
                    
            logger.info(f"Found {len(teams)} NBA teams from ESPN")
            return teams
            
        except Exception as e:
            logger.error(f"Error fetching ESPN teams: {e}")
            return []
    
    def get_espn_team_roster(self, team_id: str) -> List[Dict]:
        """Get roster for a specific ESPN team."""
        try:
            url = f"{self.espn_base_url}/teams/{team_id}/roster"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            athletes = []
            
            if 'athletes' in data:
                athletes = data['athletes']
            elif 'roster' in data and 'athletes' in data['roster']:
                athletes = data['roster']['athletes']
                
            return athletes
            
        except Exception as e:
            logger.error(f"Error fetching roster for team {team_id}: {e}")
            return []
    
    def extract_player_data(self, espn_player: Dict) -> Dict:
        """Extract and normalize player data from ESPN API response."""
        player_data = {
            'espn_player_id': espn_player.get('id'),
            'player_name': espn_player.get('displayName', ''),
            'position': '',
            'draft_year': None,
            'jersey_number': None,
            'college_name': '',
            'display_height': '',
            'display_weight': '',
            'age': None,
            'injury_status': None
        }
        
        # Extract position
        position_data = espn_player.get('position', {})
        if isinstance(position_data, dict):
            player_data['position'] = position_data.get('abbreviation', '')
        
        # Extract jersey number
        jersey = espn_player.get('jersey')
        if jersey:
            player_data['jersey_number'] = str(jersey)
        
        # Extract physical attributes
        player_data['display_height'] = espn_player.get('height', '')
        weight = espn_player.get('weight')
        if weight:
            player_data['display_weight'] = str(weight)
        
        # Extract age
        age = espn_player.get('age')
        if age:
            player_data['age'] = int(age)
        
        # Extract college
        college = espn_player.get('college', {})
        if isinstance(college, dict):
            player_data['college_name'] = college.get('name', '')
        elif isinstance(college, str):
            player_data['college_name'] = college
        
        # Extract draft year (if available)
        draft = espn_player.get('draft', {})
        if isinstance(draft, dict):
            player_data['draft_year'] = draft.get('year')
        
        # Extract injury status (if available)
        injury = espn_player.get('injury', {})
        if isinstance(injury, dict):
            status = injury.get('status')
            if status:
                player_data['injury_status'] = status
        
        return player_data
    
    def find_matching_nba_player(self, espn_player: Dict, nba_players: List[Dict]) -> Optional[Dict]:
        """Find matching player between ESPN and NBA APIs using name normalization."""
        espn_name = self.normalize_name(espn_player.get('displayName', ''))
        
        for nba_player in nba_players:
            nba_name = self.normalize_name(nba_player.get('player_name', ''))
            
            # Exact match
            if espn_name == nba_name:
                return nba_player
            
            # Partial match (handles cases like "LeBron James" vs "LeBron Raymone James")
            espn_parts = espn_name.split()
            nba_parts = nba_name.split()
            
            if len(espn_parts) >= 2 and len(nba_parts) >= 2:
                # Check if first and last names match
                if (espn_parts[0] == nba_parts[0] and 
                    espn_parts[-1] == nba_parts[-1]):
                    return nba_player
        
        return None
    
    def populate_current_players(self) -> None:
        """Main method to populate the current_players table."""
        logger.info("🏀 Starting Current Players Population (Direct API Approach)")
        logger.info("=" * 70)
        
        # Get current NBA players from NBA API
        nba_players = self.get_nba_players()
        if not nba_players:
            logger.error("No NBA players found. Cannot proceed.")
            return
        
        # Get ESPN teams
        espn_teams = self.get_espn_teams()
        if not espn_teams:
            logger.error("No ESPN teams found. Cannot proceed.")
            return
        
        # Clear existing current_players table
        logger.info("Clearing existing current_players table...")
        try:
            self.supabase.table('current_players').delete().neq('player_id', '00000000-0000-0000-0000-000000000000').execute()
            logger.info("✅ Existing current_players data cleared")
        except Exception as e:
            logger.warning(f"⚠️ Could not clear existing data: {e}")
        
        # Collect all ESPN players
        all_espn_players = []
        matched_players = []
        unmatched_players = []
        
        for team_data in espn_teams:
            team = team_data.get('team', {})
            team_id = team.get('id')
            team_name = team.get('displayName', 'Unknown')
            
            if not team_id:
                continue
                
            logger.info(f"📋 Processing team: {team_name}")
            
            roster = self.get_espn_team_roster(team_id)
            
            for espn_player in roster:
                # Extract player data from ESPN
                player_data = self.extract_player_data(espn_player)
                
                if not player_data['espn_player_id'] or not player_data['player_name']:
                    continue
                
                # Find matching player in NBA API data
                matching_nba_player = self.find_matching_nba_player(espn_player, nba_players)
                
                if matching_nba_player:
                    # Generate UUID for player_id (will be used as foreign key)
                    import uuid
                    player_uuid = str(uuid.uuid4())
                    
                    # Prepare data for current_players table
                    current_player_data = {
                        'player_id': player_uuid,
                        'nba_player_id': matching_nba_player['nba_player_id'],
                        'espn_player_id': player_data['espn_player_id'],
                        'player_name': player_data['player_name'],
                        'position': player_data['position'],
                        'draft_year': player_data['draft_year'],
                        'jersey_number': player_data['jersey_number'],
                        'college_name': player_data['college_name'],
                        'display_height': player_data['display_height'],
                        'display_weight': player_data['display_weight'],
                        'age': player_data['age'],
                        'injury_status': player_data['injury_status']
                    }
                    
                    matched_players.append(current_player_data)
                    logger.info(f"  ✅ Matched: {player_data['player_name']} (NBA ID: {matching_nba_player['nba_player_id']}, ESPN ID: {player_data['espn_player_id']})")
                else:
                    unmatched_players.append(player_data['player_name'])
                    logger.warning(f"  ❌ No NBA match found for: {player_data['player_name']}")
            
            time.sleep(0.5)  # Rate limiting
        
        # Insert matched players into current_players table
        logger.info(f"\n📊 SUMMARY:")
        logger.info(f"Total ESPN players processed: {len(matched_players) + len(unmatched_players)}")
        logger.info(f"Successfully matched: {len(matched_players)}")
        logger.info(f"Unmatched players: {len(unmatched_players)}")
        
        if matched_players:
            logger.info(f"\n💾 Inserting {len(matched_players)} players into current_players table...")
            
            try:
                # Insert in batches to avoid timeouts
                batch_size = 50
                for i in range(0, len(matched_players), batch_size):
                    batch = matched_players[i:i + batch_size]
                    
                    response = self.supabase.table('current_players').upsert(
                        batch,
                        on_conflict='nba_player_id'
                    ).execute()
                    
                    logger.info(f"  ✅ Inserted batch {i//batch_size + 1}: {len(batch)} players")
                
                logger.info(f"✅ Successfully populated current_players table with {len(matched_players)} players!")
                
            except Exception as e:
                logger.error(f"❌ Error inserting players: {e}")
        
        # Show unmatched players for debugging
        if unmatched_players:
            logger.info(f"\n⚠️ Unmatched players ({len(unmatched_players)}):")
            for name in unmatched_players[:10]:  # Show first 10
                logger.info(f"  - {name}")
            if len(unmatched_players) > 10:
                logger.info(f"  ... and {len(unmatched_players) - 10} more")
        
        logger.info("\n🏆 Current players population completed!")

def main():
    """Main execution function."""
    try:
        populator = CurrentPlayersPopulator()
        populator.populate_current_players()
        
    except KeyboardInterrupt:
        logger.info("\n⏹️ Process interrupted by user")
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
