#!/usr/bin/env python3
"""
Generate Current Players CSV (Fixed Version)

This script uses the ESPN team roster endpoint (which actually works) to fetch
detailed player information including age, height, weight, jersey, college, etc.
"""

import csv
import requests
import json
import time
import uuid
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CurrentPlayersGeneratorFixed:
    def __init__(self):
        """Initialize the current players generator"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html, */*',
        })
        self.espn_player_cache = {}  # Cache ESPN player details
        self.team_rosters_cache = {}  # Cache team rosters

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

    def get_team_roster(self, team_id: int) -> List[Dict]:
        """Get detailed roster for a specific team"""
        if team_id in self.team_rosters_cache:
            return self.team_rosters_cache[team_id]
        
        try:
            url = f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/roster"
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            athletes = data.get('athletes', [])
            
            # Cache the result
            self.team_rosters_cache[team_id] = athletes
            
            logger.info(f"Fetched {len(athletes)} players from team {team_id}")
            return athletes
            
        except Exception as e:
            logger.warning(f"Failed to get roster for team {team_id}: {e}")
            return []

    def fetch_all_espn_players(self) -> Dict[int, Dict]:
        """Fetch all NBA players from all team rosters"""
        logger.info("🏀 Fetching all NBA players from team rosters...")
        
        teams = self.get_nba_teams()
        if not teams:
            logger.error("No teams found")
            return {}
        
        all_players = {}
        
        for i, team in enumerate(teams):
            team_id = team['id']
            team_name = team['displayName']
            
            logger.info(f"[{i+1}/{len(teams)}] Fetching roster for {team_name} (ID: {team_id})")
            
            athletes = self.get_team_roster(team_id)
            
            for athlete in athletes:
                espn_id = athlete.get('id')
                if espn_id:
                    # Extract all the details we need
                    player_details = {
                        'espn_player_id': espn_id,
                        'player_name': athlete.get('displayName'),
                        'age': athlete.get('age'),
                        'display_height': athlete.get('displayHeight'),
                        'display_weight': athlete.get('displayWeight'),
                        'jersey_number': athlete.get('jersey'),
                        'college_name': athlete.get('college', {}).get('name') if athlete.get('college') else None,
                        'draft_year': athlete.get('draft', {}).get('year') if athlete.get('draft') else None,
                        'debut_year': athlete.get('debutYear'),  # Alternative to draft year
                        'injury_status': None,  # We'll check injuries
                        'team_abbreviation': team['abbreviation'],
                        'team_name': team_name
                    }
                    
                    # Check for injuries
                    injuries = athlete.get('injuries', [])
                    if injuries:
                        # Get the most recent injury status
                        latest_injury = injuries[0] if injuries else {}
                        injury_status = latest_injury.get('status')
                        if injury_status:
                            player_details['injury_status'] = injury_status
                    
                    all_players[espn_id] = player_details
            
            # Rate limiting
            time.sleep(0.1)
        
        logger.info(f"✅ Collected details for {len(all_players)} unique players")
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
        """Generate current players data with ESPN details"""
        logger.info("🏀 Starting current players data generation (Fixed Version)...")
        
        # First, fetch all ESPN player details from team rosters
        espn_players = self.fetch_all_espn_players()
        if not espn_players:
            logger.error("No ESPN players found")
            return []
        
        # Read matched players
        matched_players = self.read_players_matched_csv()
        if not matched_players:
            logger.error("No matched players found")
            return []
        
        current_players = []
        matched_count = 0
        missing_count = 0
        
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
                
                # Try to match with ESPN data
                espn_id = player.get('espn_player_id')
                if espn_id:
                    try:
                        espn_id = int(espn_id)
                        
                        if espn_id in espn_players:
                            # Found detailed ESPN data!
                            espn_details = espn_players[espn_id]
                            
                            player_data.update({
                                'draft_year': espn_details.get('draft_year') or espn_details.get('debut_year'),
                                'jersey_number': espn_details.get('jersey_number'),
                                'college_name': espn_details.get('college_name'),
                                'display_height': espn_details.get('display_height'),
                                'display_weight': espn_details.get('display_weight'),
                                'age': espn_details.get('age'),
                                'injury_status': espn_details.get('injury_status')
                            })
                            
                            matched_count += 1
                            logger.info(f"[{i+1}/{len(matched_players)}] ✅ {player_data['player_name']} - Full details found")
                        else:
                            # ESPN ID not found in rosters (might be inactive/traded recently)
                            player_data.update({
                                'draft_year': None,
                                'jersey_number': None,
                                'college_name': None,
                                'display_height': None,
                                'display_weight': None,
                                'age': None,
                                'injury_status': None
                            })
                            missing_count += 1
                            logger.warning(f"[{i+1}/{len(matched_players)}] ⚠️  {player_data['player_name']} - ESPN ID {espn_id} not found in rosters")
                        
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid ESPN ID for {player_data['player_name']}: {espn_id}")
                        missing_count += 1
                        # Add default values
                        player_data.update({
                            'draft_year': None,
                            'jersey_number': None,
                            'college_name': None,
                            'display_height': None,
                            'display_weight': None,
                            'age': None,
                            'injury_status': None
                        })
                else:
                    logger.warning(f"No ESPN ID for {player_data['player_name']}")
                    missing_count += 1
                    # Add default values
                    player_data.update({
                        'draft_year': None,
                        'jersey_number': None,
                        'college_name': None,
                        'display_height': None,
                        'display_weight': None,
                        'age': None,
                        'injury_status': None
                    })
                
                current_players.append(player_data)
                
            except Exception as e:
                logger.error(f"Error processing player {player.get('player_name', 'Unknown')}: {e}")
                missing_count += 1
                continue
        
        logger.info(f"\n📊 GENERATION SUMMARY:")
        logger.info(f"Total players processed: {len(matched_players)}")
        logger.info(f"Players with full ESPN details: {matched_count}")
        logger.info(f"Players missing ESPN details: {missing_count}")
        logger.info(f"Success rate: {(matched_count/len(matched_players)*100):.1f}%")
        
        return current_players

    def write_current_players_csv(self, players_data: List[Dict]) -> str:
        """Write current players data to CSV file"""
        output_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_fixed.csv"
        
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

    def preview_enhanced_data(self, players_data: List[Dict], num_samples: int = 10):
        """Preview players with the most complete data"""
        if not players_data:
            logger.info("No data to preview")
            return
        
        # Sort by completeness (players with most non-null fields first)
        def completeness_score(player):
            fields_to_check = ['age', 'display_height', 'display_weight', 'jersey_number', 'college_name', 'draft_year']
            return sum(1 for field in fields_to_check if player.get(field) is not None)
        
        sorted_players = sorted(players_data, key=completeness_score, reverse=True)
        
        logger.info(f"\n📋 ENHANCED DATA PREVIEW (top {num_samples} most complete players):")
        logger.info("=" * 100)
        
        for i, player in enumerate(sorted_players[:num_samples]):
            score = completeness_score(player)
            logger.info(f"\n{i+1}. {player['player_name']} (Completeness: {score}/6)")
            logger.info(f"   NBA ID: {player['nba_player_id']}")
            logger.info(f"   ESPN ID: {player['espn_player_id']}")
            logger.info(f"   Position: {player['position']}")
            logger.info(f"   Draft Year: {player.get('draft_year', 'N/A')}")
            logger.info(f"   Jersey: {player.get('jersey_number', 'N/A')}")
            logger.info(f"   College: {player.get('college_name', 'N/A')}")
            logger.info(f"   Height: {player.get('display_height', 'N/A')}")
            logger.info(f"   Weight: {player.get('display_weight', 'N/A')}")
            logger.info(f"   Age: {player.get('age', 'N/A')}")
            logger.info(f"   Injury: {player.get('injury_status', 'N/A')}")

def main():
    """Main function"""
    print("🏀 Current Players CSV Generator (Fixed Version)")
    print("=" * 70)
    print("Using ESPN team roster endpoint for complete player details...")
    print()
    
    generator = CurrentPlayersGeneratorFixed()
    
    # Generate current players data
    players_data = generator.generate_current_players_data()
    
    if players_data:
        # Preview enhanced data
        generator.preview_enhanced_data(players_data)
        
        # Write to CSV
        output_file = generator.write_current_players_csv(players_data)
        
        if output_file:
            print(f"\n🎉 Successfully generated current_players_fixed.csv!")
            print(f"📁 Output file: {output_file}")
            print(f"📊 Total players: {len(players_data)}")
        else:
            print(f"\n❌ Failed to write output file")
    else:
        print(f"\n❌ Failed to generate current players data")

if __name__ == "__main__":
    main()
