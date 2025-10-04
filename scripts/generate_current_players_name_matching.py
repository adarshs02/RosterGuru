#!/usr/bin/env python3
"""
Generate Current Players CSV (Name-Based Matching)

This script uses name-based matching to connect our CSV data with ESPN team roster data,
since the ESPN IDs don't match between the two sources.
"""

import csv
import requests
import json
import time
import unicodedata
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CurrentPlayersNameMatcher:
    def __init__(self):
        """Initialize the name-based matcher"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html, */*',
        })
        self.espn_players_by_name = {}  # Name -> player details

    def normalize_name(self, name: str) -> str:
        """Normalize player name for matching"""
        if not name:
            return ""
        
        # Remove accents using Unicode normalization
        name = unicodedata.normalize('NFD', name)
        name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
        
        # Convert to lowercase and remove extra spaces
        name = name.lower().strip()
        
        # Remove common suffixes and prefixes
        name = name.replace(' jr.', '').replace(' sr.', '').replace(' iii', '').replace(' ii', '')
        name = name.replace('.', '').replace("'", '').replace('-', ' ')
        
        # Normalize whitespace
        name = ' '.join(name.split())
        
        return name

    def get_nba_teams(self) -> List[Dict]:
        """Get all NBA teams from ESPN API"""
        try:
            url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            teams = []
            
            if 'sports' in data and data['sports']:
                leagues = data['sports'][0].get('leagues', [])
                if leagues:
                    team_list = leagues[0].get('teams', [])
                    for team_info in team_list:
                        team = team_info.get('team', {})
                        teams.append({
                            'id': team.get('id'),
                            'abbreviation': team.get('abbreviation'),
                            'displayName': team.get('displayName')
                        })
            
            logger.info(f"Found {len(teams)} NBA teams")
            return teams
            
        except Exception as e:
            logger.error(f"Failed to get NBA teams: {e}")
            return []

    def fetch_all_espn_players_by_name(self) -> Dict[str, Dict]:
        """Fetch all NBA players from all team rosters and index by normalized name"""
        logger.info("🏀 Fetching all NBA players from team rosters...")
        
        teams = self.get_nba_teams()
        if not teams:
            logger.error("No teams found")
            return {}
        
        all_players = {}
        
        for i, team in enumerate(teams):
            team_id = team['id']
            team_name = team['displayName']
            
            try:
                logger.info(f"[{i+1}/{len(teams)}] Fetching roster for {team_name}")
                
                url = f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/roster"
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                
                data = response.json()
                athletes = data.get('athletes', [])
                
                for athlete in athletes:
                    original_name = athlete.get('displayName')
                    if not original_name:
                        continue
                    
                    normalized_name = self.normalize_name(original_name)
                    
                    # Extract all the details we need
                    player_details = {
                        'original_name': original_name,
                        'normalized_name': normalized_name,
                        'espn_roster_id': athlete.get('id'),
                        'age': athlete.get('age'),
                        'display_height': athlete.get('displayHeight'),
                        'display_weight': athlete.get('displayWeight'),
                        'jersey_number': athlete.get('jersey'),
                        'college_name': athlete.get('college', {}).get('name') if athlete.get('college') else None,
                        'draft_year': athlete.get('draft', {}).get('year') if athlete.get('draft') else None,
                        'debut_year': athlete.get('debutYear'),
                        'injury_status': None,
                        'team_abbreviation': team['abbreviation'],
                        'team_name': team_name
                    }
                    
                    # Check for injuries
                    injuries = athlete.get('injuries', [])
                    if injuries:
                        latest_injury = injuries[0] if injuries else {}
                        injury_status = latest_injury.get('status')
                        if injury_status:
                            player_details['injury_status'] = injury_status
                    
                    # Index by normalized name
                    all_players[normalized_name] = player_details
                
                # Rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                logger.warning(f"Failed to get roster for {team_name}: {e}")
                continue
        
        logger.info(f"✅ Indexed {len(all_players)} unique players by name")
        return all_players

    def read_players_matched_csv(self) -> List[Dict]:
        """Read the players_matched.csv file"""
        players = []
        file_path = "/Users/adarsh/RosterGuru/RosterGuru/data/players_matched.csv"
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    players.append(row)
            
            logger.info(f"Read {len(players)} players from {file_path}")
            return players
            
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            return []
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            return []

    def generate_current_players_data(self) -> List[Dict]:
        """Generate current players data with name-based ESPN matching"""
        logger.info("🏀 Starting current players data generation (Name-Based Matching)...")
        
        # First, fetch all ESPN player details indexed by name
        espn_players = self.fetch_all_espn_players_by_name()
        if not espn_players:
            logger.error("No ESPN players found")
            return []
        
        # Read matched players
        matched_players = self.read_players_matched_csv()
        if not matched_players:
            logger.error("No matched players found")
            return []
        
        current_players = []
        exact_matches = 0
        no_matches = 0
        
        for i, player in enumerate(matched_players):
            try:
                # Basic player info from CSV
                player_data = {
                    'player_id': player.get('player_id'),
                    'nba_player_id': player.get('nba_player_id'),
                    'espn_player_id': player.get('espn_player_id'),
                    'player_name': player.get('player_name'),
                    'position': player.get('position')
                }
                
                # Try to match by name
                csv_name = player.get('player_name', '')
                normalized_csv_name = self.normalize_name(csv_name)
                
                if normalized_csv_name in espn_players:
                    # Found exact name match!
                    espn_details = espn_players[normalized_csv_name]
                    
                    player_data.update({
                        'draft_year': espn_details.get('draft_year') or espn_details.get('debut_year'),
                        'jersey_number': espn_details.get('jersey_number'),
                        'college_name': espn_details.get('college_name'),
                        'display_height': espn_details.get('display_height'),
                        'display_weight': espn_details.get('display_weight'),
                        'age': espn_details.get('age'),
                        'injury_status': espn_details.get('injury_status')
                    })
                    
                    exact_matches += 1
                    logger.info(f"[{i+1}/{len(matched_players)}] ✅ {csv_name} matched with {espn_details['original_name']}")
                else:
                    # No match found
                    player_data.update({
                        'draft_year': None,
                        'jersey_number': None,
                        'college_name': None,
                        'display_height': None,
                        'display_weight': None,
                        'age': None,
                        'injury_status': None
                    })
                    no_matches += 1
                    logger.warning(f"[{i+1}/{len(matched_players)}] ❌ {csv_name} - No name match found")
                
                current_players.append(player_data)
                
            except Exception as e:
                logger.error(f"Error processing player {player.get('player_name', 'Unknown')}: {e}")
                no_matches += 1
                continue
        
        logger.info(f"\n📊 GENERATION SUMMARY:")
        logger.info(f"Total players processed: {len(matched_players)}")
        logger.info(f"Exact name matches: {exact_matches}")
        logger.info(f"No matches: {no_matches}")
        logger.info(f"Success rate: {(exact_matches/len(matched_players)*100):.1f}%")
        
        return current_players

    def write_current_players_csv(self, players_data: List[Dict]) -> str:
        """Write current players data to CSV file"""
        output_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_name_matched.csv"
        
        if not players_data:
            logger.error("No player data to write")
            return ""
        
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
            return output_file
            
        except Exception as e:
            logger.error(f"Error writing CSV file: {e}")
            return ""

    def preview_matched_data(self, players_data: List[Dict], num_samples: int = 10):
        """Preview players with the most complete data"""
        if not players_data:
            logger.info("No data to preview")
            return
        
        # Sort by completeness (players with most non-null fields first)
        def completeness_score(player):
            fields_to_check = ['age', 'display_height', 'display_weight', 'jersey_number', 'college_name', 'draft_year']
            return sum(1 for field in fields_to_check if player.get(field) is not None)
        
        sorted_players = sorted(players_data, key=completeness_score, reverse=True)
        
        logger.info(f"\n📋 MATCHED DATA PREVIEW (top {num_samples} most complete players):")
        logger.info("=" * 100)
        
        for i, player in enumerate(sorted_players[:num_samples]):
            score = completeness_score(player)
            logger.info(f"\n{i+1}. {player['player_name']} (Completeness: {score}/6)")
            logger.info(f"   NBA ID: {player['nba_player_id']}")
            logger.info(f"   ESPN ID: {player['espn_player_id']}")
            logger.info(f"   Position: {player['position']}")
            logger.info(f"   Age: {player.get('age', 'N/A')}")
            logger.info(f"   Height: {player.get('display_height', 'N/A')}")
            logger.info(f"   Weight: {player.get('display_weight', 'N/A')}")
            logger.info(f"   Jersey: {player.get('jersey_number', 'N/A')}")
            logger.info(f"   College: {player.get('college_name', 'N/A')}")
            logger.info(f"   Draft: {player.get('draft_year', 'N/A')}")
            logger.info(f"   Injury: {player.get('injury_status', 'N/A')}")

def main():
    """Main function"""
    print("🏀 Current Players CSV Generator (Name-Based Matching)")
    print("=" * 70)
    print("Using name-based matching to connect CSV data with ESPN roster data...")
    print()
    
    matcher = CurrentPlayersNameMatcher()
    
    # Generate current players data
    players_data = matcher.generate_current_players_data()
    
    if players_data:
        # Preview matched data
        matcher.preview_matched_data(players_data)
        
        # Write to CSV
        output_file = matcher.write_current_players_csv(players_data)
        
        if output_file:
            print(f"\n🎉 Successfully generated current_players_name_matched.csv!")
            print(f"📁 Output file: {output_file}")
            print(f"📊 Total players: {len(players_data)}")
        else:
            print(f"\n❌ Failed to write output file")
    else:
        print(f"\n❌ Failed to generate current players data")

if __name__ == "__main__":
    main()
