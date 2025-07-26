#!/usr/bin/env python3
"""
Search for specific NBA players with name variations

This script searches for the 3 problematic players mentioned:
- Nikola Đurišić (called Nikola Djurisic)
- Hansen Yang (called Yang Hansen)  
- Nigel Hayes (called Nigel Hayes-Davis)
"""

import csv
import requests
import re
import time
import unicodedata
from typing import Dict, List, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Target players with their variations
TARGET_PLAYERS = {
    'Nikola Djurisic': ['Nikola Đurišić', 'Nikola Durisic', 'N. Djurisic', 'N. Durisic'],
    'Hansen Yang': ['Yang Hansen', 'H. Yang', 'Yang H.'],
    'Nigel Hayes': ['Nigel Hayes-Davis', 'N. Hayes', 'N. Hayes-Davis', 'Hayes-Davis']
}

class PlayerSearcher:
    def __init__(self):
        """Initialize the player searcher"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html, */*',
        })
        self.nba_com_content = None
        self.nba_com_players_data = []

    def normalize_name(self, name: str) -> str:
        """Normalize player name for matching"""
        if not name:
            return ""
        
        # Remove accents using Unicode normalization
        name = unicodedata.normalize('NFD', name)
        name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
        
        # Convert to lowercase and remove extra spaces
        name = re.sub(r'\s+', ' ', name.lower().strip())
        
        # Handle common name variations
        name = name.replace(' jr.', '').replace(' sr.', '').replace(' iii', '').replace(' ii', '')
        name = name.replace('.', '').replace("'", '').replace('-', ' ')
        
        return name

    def fetch_nba_com_data(self) -> bool:
        """Fetch and parse NBA.com players page content"""
        if self.nba_com_content is not None:
            return True  # Already cached
            
        logger.info("🏀 Fetching NBA.com players page...")
        
        try:
            url = "https://www.nba.com/players"
            response = self.session.get(url, timeout=20)
            response.raise_for_status()
            self.nba_com_content = response.text
            
            # Extract player data using various regex patterns
            logger.info("🔍 Parsing NBA.com player data...")
            
            # Try multiple patterns to extract player data
            patterns = [
                # Pattern 1: Standard JSON-like structure
                r'"person_id":(\d+)[^}]*?"player_last_name":"([^"]+)"[^}]*?"player_first_name":"([^"]+)"',
                # Pattern 2: Alternative structure
                r'"id":(\d+)[^}]*?"lastName":"([^"]+)"[^}]*?"firstName":"([^"]+)"',
                # Pattern 3: More flexible pattern
                r'person_id["\']?\s*:\s*(\d+)[^}]*?last_name["\']?\s*:\s*["\']([^"\']+)[^}]*?first_name["\']?\s*:\s*["\']([^"\']+)'
            ]
            
            all_matches = []
            for i, pattern in enumerate(patterns):
                matches = re.findall(pattern, self.nba_com_content, re.IGNORECASE)
                logger.info(f"Pattern {i+1}: Found {len(matches)} potential matches")
                all_matches.extend(matches)
            
            # Process and deduplicate matches
            seen_ids = set()
            for match in all_matches:
                try:
                    person_id, last_name, first_name = match
                    person_id = int(person_id)
                    
                    if person_id not in seen_ids and person_id > 1000:  # Filter out invalid IDs
                        full_name = f"{first_name} {last_name}".strip()
                        self.nba_com_players_data.append({
                            'nba_player_id': person_id,
                            'player_name': full_name,
                            'normalized_name': self.normalize_name(full_name)
                        })
                        seen_ids.add(person_id)
                        
                except (ValueError, IndexError):
                    continue
            
            logger.info(f"✅ Successfully parsed {len(self.nba_com_players_data)} players from NBA.com")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch NBA.com data: {e}")
            return False

    def search_player_variations(self, target_name: str, variations: List[str]) -> Optional[int]:
        """Search for a player using various name variations"""
        logger.info(f"\n🔍 Searching for: {target_name}")
        logger.info(f"   Variations: {', '.join(variations)}")
        
        if not self.fetch_nba_com_data():
            return None
        
        # Normalize all variations
        normalized_variations = [self.normalize_name(var) for var in variations]
        normalized_target = self.normalize_name(target_name)
        all_variations = normalized_variations + [normalized_target]
        
        # Search for exact matches first
        for player in self.nba_com_players_data:
            normalized_player_name = player['normalized_name']
            
            for variation in all_variations:
                if normalized_player_name == variation:
                    logger.info(f"   ✅ EXACT MATCH: {player['player_name']} (ID: {player['nba_player_id']})")
                    return player['nba_player_id']
        
        # Search for partial matches
        for player in self.nba_com_players_data:
            normalized_player_name = player['normalized_name']
            
            for variation in all_variations:
                if len(variation) > 3:  # Only check longer names to avoid false positives
                    if variation in normalized_player_name or normalized_player_name in variation:
                        logger.info(f"   🟡 PARTIAL MATCH: {player['player_name']} (ID: {player['nba_player_id']})")
                        return player['nba_player_id']
        
        logger.info(f"   ❌ No match found for {target_name}")
        return None

    def search_all_target_players(self):
        """Search for all target players and report results"""
        logger.info("🚀 Starting targeted player search...")
        
        results = {}
        found_count = 0
        
        for target_name, variations in TARGET_PLAYERS.items():
            nba_id = self.search_player_variations(target_name, variations)
            results[target_name] = nba_id
            
            if nba_id:
                found_count += 1
            
            # Rate limiting
            time.sleep(0.2)
        
        # Print summary
        logger.info(f"\n📊 SEARCH RESULTS SUMMARY:")
        logger.info(f"=" * 50)
        
        for target_name, nba_id in results.items():
            if nba_id:
                logger.info(f"✅ {target_name}: NBA ID {nba_id}")
            else:
                logger.info(f"❌ {target_name}: Not found")
        
        logger.info(f"\nTotal found: {found_count}/{len(TARGET_PLAYERS)}")
        
        # If we found any players, suggest adding them to manual enhancement
        if found_count > 0:
            logger.info(f"\n💡 SUGGESTED MANUAL_NBA_IDS ADDITIONS:")
            logger.info(f"Add these to enhance_players_manual.py:")
            for target_name, nba_id in results.items():
                if nba_id:
                    logger.info(f"    '{target_name}': {nba_id},")
        
        return results

    def check_existing_data(self):
        """Check if any of these players are already in our data files"""
        logger.info("📋 Checking existing player data files...")
        
        data_files = [
            '/Users/adarsh/RosterGuru/RosterGuru/data/players_matched_comprehensive.csv',
            '/Users/adarsh/RosterGuru/RosterGuru/data/players_espn_only.csv',
            '/Users/adarsh/RosterGuru/RosterGuru/data/players_nba_only.csv'
        ]
        
        for file_path in data_files:
            try:
                logger.info(f"\n🔍 Checking {file_path.split('/')[-1]}...")
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    
                    for row in reader:
                        player_name = row.get('player_name', '')
                        
                        # Check if this player matches any of our targets
                        for target_name, variations in TARGET_PLAYERS.items():
                            all_names = [target_name] + variations
                            
                            for name_variant in all_names:
                                if self.normalize_name(player_name) == self.normalize_name(name_variant):
                                    logger.info(f"   ✅ Found: {player_name} matches {target_name}")
                                    logger.info(f"      NBA ID: {row.get('nba_player_id', 'N/A')}")
                                    logger.info(f"      ESPN ID: {row.get('espn_player_id', 'N/A')}")
                                    break
            
            except FileNotFoundError:
                logger.warning(f"   ⚠️  File not found: {file_path}")
            except Exception as e:
                logger.error(f"   ❌ Error reading {file_path}: {e}")

def main():
    """Main function"""
    print("🏀 NBA Player Search Tool")
    print("=" * 50)
    print("Searching for specific players with name variations:")
    for target, variations in TARGET_PLAYERS.items():
        print(f"  • {target} ({', '.join(variations)})")
    print()
    
    searcher = PlayerSearcher()
    
    # Check existing data first
    searcher.check_existing_data()
    
    # Search NBA.com for missing players
    results = searcher.search_all_target_players()
    
    print("\n🏆 Search completed!")

if __name__ == "__main__":
    main()
