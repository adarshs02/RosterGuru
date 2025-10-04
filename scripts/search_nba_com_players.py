#!/usr/bin/env python3
"""
NBA.com Player Search Enhancement Script

This script searches NBA.com for all ESPN-only players to find their NBA IDs
and adds them to the combined matched players list.
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

class NBAComPlayerSearcher:
    def __init__(self):
        """Initialize the NBA.com searcher"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html, */*',
        })
        
        # Cache NBA.com page content to avoid repeated requests
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
            
            logger.info(f"📊 Successfully parsed {len(self.nba_com_players_data)} NBA.com players")
            return len(self.nba_com_players_data) > 0
            
        except Exception as e:
            logger.error(f"❌ Error fetching NBA.com data: {e}")
            return False

    def search_player_on_nba_com(self, espn_player_name: str) -> Optional[int]:
        """Search for a specific ESPN player on NBA.com and return NBA ID if found"""
        normalized_espn_name = self.normalize_name(espn_player_name)
        
        # Direct name match
        for nba_player in self.nba_com_players_data:
            if nba_player['normalized_name'] == normalized_espn_name:
                logger.info(f"  ✅ Direct match: {espn_player_name} → NBA ID: {nba_player['nba_player_id']}")
                return nba_player['nba_player_id']
        
        # Fuzzy matching - check if names are similar
        espn_name_parts = normalized_espn_name.split()
        if len(espn_name_parts) >= 2:
            first_name, last_name = espn_name_parts[0], espn_name_parts[-1]
            
            for nba_player in self.nba_com_players_data:
                nba_name_parts = nba_player['normalized_name'].split()
                if (len(nba_name_parts) >= 2 and 
                    nba_name_parts[0] == first_name and 
                    nba_name_parts[-1] == last_name):
                    logger.info(f"  ✅ Fuzzy match: {espn_player_name} → {nba_player['player_name']} (NBA ID: {nba_player['nba_player_id']})")
                    return nba_player['nba_player_id']
        
        return None

    def enhance_espn_only_players(self) -> Tuple[List[Dict], int]:
        """Search NBA.com for all ESPN-only players and enhance them"""
        
        # First, fetch NBA.com data
        if not self.fetch_nba_com_data():
            logger.error("❌ Failed to fetch NBA.com data")
            return [], 0
        
        enhanced_players = []
        found_count = 0
        
        logger.info("🔍 Searching NBA.com for ESPN-only players...")
        
        # Read ESPN-only players
        with open('/Users/adarsh/RosterGuru/RosterGuru/data/players_espn_only.csv', 'r') as f:
            reader = csv.DictReader(f)
            espn_only_players = list(reader)
        
        logger.info(f"📋 Processing {len(espn_only_players)} ESPN-only players...")
        
        for i, row in enumerate(espn_only_players):
            player_name = row['player_name']
            logger.info(f"🔍 [{i+1}/{len(espn_only_players)}] Searching for: {player_name}")
            
            nba_id = self.search_player_on_nba_com(player_name)
            
            if nba_id:
                enhanced_player = {
                    'player_id': row['player_id'],
                    'nba_player_id': nba_id,
                    'espn_player_id': row['espn_player_id'],
                    'player_name': player_name,
                    'position': row['position']
                }
                enhanced_players.append(enhanced_player)
                found_count += 1
            else:
                logger.warning(f"  ❌ No NBA.com match found for: {player_name}")
            
            # Rate limiting to be respectful
            if i < len(espn_only_players) - 1:
                time.sleep(0.1)
        
        return enhanced_players, found_count

    def create_comprehensive_matched_file(self):
        """Create the most comprehensive matched players file possible"""
        logger.info("🚀 Starting comprehensive NBA.com enhancement...")
        
        # Get enhanced players from NBA.com search
        enhanced_players, found_count = self.enhance_espn_only_players()
        
        # Read existing enhanced matched players
        existing_matched = []
        try:
            with open('/Users/adarsh/RosterGuru/RosterGuru/data/players_matched_enhanced.csv', 'r') as f:
                reader = csv.DictReader(f)
                existing_matched = list(reader)
        except FileNotFoundError:
            # Fallback to original matched file
            with open('/Users/adarsh/RosterGuru/RosterGuru/data/players_matched.csv', 'r') as f:
                reader = csv.DictReader(f)
                existing_matched = list(reader)
        
        # Combine all matched players
        all_matched = existing_matched + enhanced_players
        
        # Remove duplicates based on NBA ID or ESPN ID
        seen_nba_ids = set()
        seen_espn_ids = set()
        final_matched = []
        
        for player in all_matched:
            nba_id = player.get('nba_player_id')
            espn_id = player.get('espn_player_id')
            
            # Skip if we've already seen this player
            if nba_id in seen_nba_ids or espn_id in seen_espn_ids:
                continue
                
            final_matched.append(player)
            if nba_id:
                seen_nba_ids.add(nba_id)
            if espn_id:
                seen_espn_ids.add(espn_id)
        
        # Write comprehensive matched file
        comprehensive_filename = '/Users/adarsh/RosterGuru/RosterGuru/data/players_matched_comprehensive.csv'
        with open(comprehensive_filename, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['player_id', 'nba_player_id', 'espn_player_id', 'player_name', 'position']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(final_matched)
        
        # Summary
        logger.info("\n📊 COMPREHENSIVE ENHANCEMENT SUMMARY:")
        logger.info(f"Original enhanced matched players: {len(existing_matched)}")
        logger.info(f"NBA.com enhanced players: {found_count}")
        logger.info(f"Total comprehensive matched players: {len(final_matched)}")
        logger.info(f"Comprehensive file: {comprehensive_filename}")
        logger.info("\n🏆 Comprehensive NBA.com enhancement completed!")
        
        return comprehensive_filename

if __name__ == "__main__":
    searcher = NBAComPlayerSearcher()
    searcher.create_comprehensive_matched_file()
