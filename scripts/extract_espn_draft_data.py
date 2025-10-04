#!/usr/bin/env python3
"""
Extract ESPN Draft Data

This script fetches draft information from the ESPN Draft API and maps it to our players
to correct the draft year information in the current_players table.
"""

import requests
import json
import time
import csv
import os
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ESPNDraftExtractor:
    def __init__(self):
        """Initialize the ESPN Draft extractor"""
        self.base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

    def normalize_name(self, name: str) -> str:
        """Normalize player name for matching"""
        import unicodedata
        
        # Remove accents and normalize
        normalized = unicodedata.normalize('NFD', name)
        ascii_name = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
        
        # Clean up
        cleaned = ascii_name.lower().strip()
        cleaned = cleaned.replace('.', '').replace(',', '').replace("'", '')
        cleaned = ' '.join(cleaned.split())  # Normalize whitespace
        
        return cleaned

    def get_draft_data(self, year: int) -> Optional[Dict]:
        """Get draft data for a specific year"""
        try:
            url = f"{self.base_url}/draft/{year}"
            logger.info(f"Fetching draft data for {year}...")
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"✅ Successfully fetched {year} draft data")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to fetch {year} draft data: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Error processing {year} draft data: {e}")
            return None

    def parse_draft_picks(self, draft_data: Dict, year: int) -> List[Dict]:
        """Parse draft picks from ESPN draft data"""
        picks = []
        
        try:
            if 'picks' not in draft_data:
                logger.warning(f"No 'picks' field in {year} draft data")
                return picks
            
            for pick_data in draft_data['picks']:
                pick_info = {
                    'year': year,
                    'pick_number': None,
                    'round': None,
                    'player_name': None,
                    'player_name_normalized': None,
                    'espn_player_id': None,
                    'team': None,
                    'college': None
                }
                
                # Extract pick number and round
                if 'pick' in pick_data:
                    pick_info['pick_number'] = pick_data['pick']
                
                if 'round' in pick_data:
                    pick_info['round'] = pick_data['round']
                
                # Extract player information
                if 'athlete' in pick_data:
                    athlete = pick_data['athlete']
                    
                    if 'displayName' in athlete:
                        pick_info['player_name'] = athlete['displayName']
                        pick_info['player_name_normalized'] = self.normalize_name(athlete['displayName'])
                    
                    if 'id' in athlete:
                        pick_info['espn_player_id'] = athlete['id']
                    
                    # Extract college info
                    if 'college' in athlete and athlete['college']:
                        if 'name' in athlete['college']:
                            pick_info['college'] = athlete['college']['name']
                
                # Extract team information
                if 'team' in pick_data:
                    team = pick_data['team']
                    if 'displayName' in team:
                        pick_info['team'] = team['displayName']
                
                if pick_info['player_name']:  # Only add if we have a player name
                    picks.append(pick_info)
            
            logger.info(f"📊 Parsed {len(picks)} draft picks for {year}")
            return picks
            
        except Exception as e:
            logger.error(f"❌ Error parsing {year} draft picks: {e}")
            return []

    def collect_draft_data(self, start_year: int = 2015, end_year: int = 2025) -> Dict[str, Dict]:
        """Collect draft data for multiple years and create player mapping"""
        print(f"🏀 Collecting ESPN Draft Data ({start_year}-{end_year})")
        print("=" * 60)
        
        all_picks = []
        player_draft_map = {}  # normalized_name -> draft_info
        
        for year in range(start_year, end_year + 1):
            draft_data = self.get_draft_data(year)
            
            if draft_data:
                picks = self.parse_draft_picks(draft_data, year)
                all_picks.extend(picks)
                
                # Add to player mapping
                for pick in picks:
                    normalized_name = pick['player_name_normalized']
                    if normalized_name and normalized_name not in player_draft_map:
                        player_draft_map[normalized_name] = {
                            'draft_year': year,
                            'draft_round': pick['round'],
                            'draft_pick': pick['pick_number'],
                            'draft_team': pick['team'],
                            'player_name': pick['player_name'],
                            'espn_player_id': pick['espn_player_id'],
                            'college': pick['college']
                        }
            
            time.sleep(0.5)  # Rate limiting
        
        print(f"\n📊 COLLECTION SUMMARY:")
        print(f"Total draft picks collected: {len(all_picks)}")
        print(f"Unique players mapped: {len(player_draft_map)}")
        
        # Show some examples
        print(f"\n📋 SAMPLE DRAFT PICKS:")
        print("-" * 50)
        for i, (name, info) in enumerate(list(player_draft_map.items())[:10]):
            print(f"{i+1:2d}. {info['player_name']} - {info['draft_year']} Round {info['draft_round']} Pick {info['draft_pick']}")
        
        # Save draft data to CSV for analysis
        self.save_draft_data_to_csv(all_picks)
        
        return player_draft_map

    def save_draft_data_to_csv(self, picks: List[Dict]):
        """Save all draft picks to CSV for analysis"""
        output_file = "/Users/adarsh/RosterGuru/RosterGuru/data/espn_draft_picks.csv"
        
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                if picks:
                    fieldnames = picks[0].keys()
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(picks)
            
            logger.info(f"💾 Draft picks saved to: {output_file}")
            
        except Exception as e:
            logger.error(f"❌ Error saving draft picks to CSV: {e}")

    def update_current_players_with_draft_info(self, player_draft_map: Dict[str, Dict]):
        """Update current_players CSV with accurate draft information"""
        print(f"\n🔄 Updating Current Players with Draft Info")
        print("=" * 50)
        
        input_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_final.csv"
        output_file = "/Users/adarsh/RosterGuru/RosterGuru/data/current_players_with_draft.csv"
        
        if not os.path.exists(input_file):
            logger.error(f"Input file not found: {input_file}")
            return
        
        try:
            updated_players = []
            matched_count = 0
            not_matched_count = 0
            
            with open(input_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                fieldnames = list(reader.fieldnames)
                
                # Add new draft fields if they don't exist
                new_fields = ['draft_round', 'draft_pick', 'draft_team', 'draft_college']
                for field in new_fields:
                    if field not in fieldnames:
                        fieldnames.append(field)
                
                for row in reader:
                    player_name = row.get('player_name', '')
                    normalized_name = self.normalize_name(player_name)
                    
                    # Check if we have draft info for this player
                    if normalized_name in player_draft_map:
                        draft_info = player_draft_map[normalized_name]
                        
                        # Update draft year if it's currently missing or incorrect
                        old_draft_year = row.get('draft_year', '')
                        new_draft_year = draft_info['draft_year']
                        
                        if not old_draft_year or old_draft_year == '' or old_draft_year == 'None':
                            row['draft_year'] = new_draft_year
                            logger.info(f"✅ {player_name}: Set draft year to {new_draft_year}")
                        elif str(old_draft_year) != str(new_draft_year):
                            row['draft_year'] = new_draft_year
                            logger.info(f"🔄 {player_name}: Updated draft year from {old_draft_year} to {new_draft_year}")
                        
                        # Add additional draft info
                        row['draft_round'] = draft_info['draft_round']
                        row['draft_pick'] = draft_info['draft_pick']
                        row['draft_team'] = draft_info['draft_team']
                        row['draft_college'] = draft_info['college']
                        
                        matched_count += 1
                    else:
                        # Keep existing values, add empty values for new fields
                        for field in new_fields:
                            if field not in row:
                                row[field] = ''
                        not_matched_count += 1
                    
                    updated_players.append(row)
            
            # Write updated CSV
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(updated_players)
            
            print(f"\n📊 UPDATE SUMMARY:")
            print(f"Total players processed: {len(updated_players)}")
            print(f"Players matched with draft info: {matched_count}")
            print(f"Players not matched: {not_matched_count}")
            print(f"Match rate: {(matched_count/(matched_count + not_matched_count)*100):.1f}%")
            print(f"\n💾 Updated CSV saved to: {output_file}")
            
        except Exception as e:
            logger.error(f"❌ Error updating current players with draft info: {e}")

def main():
    """Main function"""
    extractor = ESPNDraftExtractor()
    
    # Collect draft data from ESPN
    player_draft_map = extractor.collect_draft_data(start_year=2015, end_year=2025)
    
    if player_draft_map:
        # Update current players with draft info
        extractor.update_current_players_with_draft_info(player_draft_map)
        print(f"\n✅ Draft data extraction and update completed!")
    else:
        print(f"\n❌ No draft data collected")

if __name__ == "__main__":
    main()
