#!/usr/bin/env python3
"""
Generate Current Players CSV

This script reads the players_matched.csv file and uses the ESPN API to fetch
additional player details needed for the current_players table:
- draft_year
- jersey_number
- college_name
- display_height
- display_weight
- age
- injury_status
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

class CurrentPlayersGenerator:
    def __init__(self):
        """Initialize the current players generator"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html, */*',
        })
        self.espn_player_cache = {}  # Cache ESPN player details

    def get_espn_player_details(self, espn_player_id: int) -> Dict:
        """Get detailed player information from ESPN API"""
        if espn_player_id in self.espn_player_cache:
            return self.espn_player_cache[espn_player_id]
        
        try:
            # ESPN player profile API endpoint
            url = f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/{espn_player_id}"
            
            logger.debug(f"Fetching ESPN details for player ID: {espn_player_id}")
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            # Extract player details from ESPN response
            athlete = data.get('athlete', {})
            
            player_details = {
                'draft_year': None,
                'jersey_number': None,
                'college_name': None,
                'display_height': None,
                'display_weight': None,
                'age': None,
                'injury_status': None
            }
            
            # Extract basic info
            player_details['age'] = athlete.get('age')
            player_details['display_height'] = athlete.get('displayHeight')
            player_details['display_weight'] = athlete.get('displayWeight')
            player_details['jersey_number'] = athlete.get('jersey')
            
            # Extract college information
            college = athlete.get('college', {})
            if college:
                player_details['college_name'] = college.get('name') or college.get('shortName')
            
            # Extract draft information
            draft = athlete.get('draft', {})
            if draft:
                player_details['draft_year'] = draft.get('year')
            
            # Extract injury status
            injuries = athlete.get('injuries', [])
            if injuries:
                # Get the most recent injury
                latest_injury = injuries[0] if injuries else {}
                injury_status = latest_injury.get('status')
                if injury_status:
                    player_details['injury_status'] = injury_status
            
            # Cache the result
            self.espn_player_cache[espn_player_id] = player_details
            
            return player_details
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Failed to fetch ESPN details for player ID {espn_player_id}: {e}")
            return {
                'draft_year': None,
                'jersey_number': None,
                'college_name': None,
                'display_height': None,
                'display_weight': None,
                'age': None,
                'injury_status': None
            }
        except Exception as e:
            logger.error(f"Unexpected error fetching ESPN details for player ID {espn_player_id}: {e}")
            return {
                'draft_year': None,
                'jersey_number': None,
                'college_name': None,
                'display_height': None,
                'display_weight': None,
                'age': None,
                'injury_status': None
            }

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
        logger.info("🏀 Starting current players data generation...")
        
        # Read matched players
        matched_players = self.read_players_matched_csv()
        if not matched_players:
            logger.error("No matched players found")
            return []
        
        current_players = []
        processed_count = 0
        failed_count = 0
        
        for i, player in enumerate(matched_players):
            processed_count += 1
            
            try:
                # Basic player info from CSV
                player_data = {
                    'player_id': player.get('player_id'),
                    'nba_player_id': player.get('nba_player_id'),
                    'espn_player_id': player.get('espn_player_id'),
                    'player_name': player.get('player_name'),
                    'position': player.get('position')
                }
                
                # Get ESPN player details
                espn_id = player.get('espn_player_id')
                if espn_id:
                    try:
                        espn_id = int(espn_id)
                        espn_details = self.get_espn_player_details(espn_id)
                        
                        # Merge ESPN details
                        player_data.update(espn_details)
                        
                        logger.info(f"[{processed_count}/{len(matched_players)}] ✅ {player_data['player_name']} - Details fetched")
                        
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid ESPN ID for {player_data['player_name']}: {espn_id}")
                        failed_count += 1
                        # Add default values for missing ESPN details
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
                    failed_count += 1
                    # Add default values for missing ESPN details
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
                
                # Rate limiting to be respectful to ESPN API
                if i < len(matched_players) - 1:
                    time.sleep(0.1)  # 100ms delay between requests
                
            except Exception as e:
                logger.error(f"Error processing player {player.get('player_name', 'Unknown')}: {e}")
                failed_count += 1
                continue
        
        logger.info(f"\n📊 GENERATION SUMMARY:")
        logger.info(f"Total players processed: {processed_count}")
        logger.info(f"Successfully enhanced: {processed_count - failed_count}")
        logger.info(f"Failed to enhance: {failed_count}")
        
        return current_players

    def write_current_players_csv(self, players_data: List[Dict]) -> str:
        """Write current players data to CSV file"""
        output_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players.csv"
        
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

    def preview_sample_data(self, players_data: List[Dict], num_samples: int = 5):
        """Preview sample player data"""
        if not players_data:
            logger.info("No data to preview")
            return
        
        logger.info(f"\n📋 SAMPLE DATA PREVIEW (first {num_samples} players):")
        logger.info("=" * 80)
        
        for i, player in enumerate(players_data[:num_samples]):
            logger.info(f"\n{i+1}. {player['player_name']}")
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
    print("🏀 Current Players CSV Generator")
    print("=" * 60)
    print("Reading players_matched.csv and fetching ESPN details...")
    print()
    
    generator = CurrentPlayersGenerator()
    
    # Generate current players data
    players_data = generator.generate_current_players_data()
    
    if players_data:
        # Preview sample data
        generator.preview_sample_data(players_data)
        
        # Write to CSV
        output_file = generator.write_current_players_csv(players_data)
        
        if output_file:
            print(f"\n🎉 Successfully generated current_players.csv!")
            print(f"📁 Output file: {output_file}")
            print(f"📊 Total players: {len(players_data)}")
        else:
            print(f"\n❌ Failed to write output file")
    else:
        print(f"\n❌ Failed to generate current players data")

if __name__ == "__main__":
    main()
