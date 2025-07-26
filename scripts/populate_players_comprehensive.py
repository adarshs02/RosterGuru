#!/usr/bin/env python3
"""
Comprehensive Players Table Population Script

This script:
1. Fetches ALL NBA player IDs from NBA.com (not just stats API)
2. Fetches all ESPN player IDs and positions from ESPN API
3. Matches players between NBA.com and ESPN using normalized names
4. Outputs to CSV for the players table with both NBA and ESPN IDs

Fields output: player_id (UUID), nba_player_id, espn_player_id, player_name, position
"""

import requests
import json
import csv
import uuid
import time
import re
import unicodedata
from typing import Dict, List, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComprehensivePlayersPopulator:
    def __init__(self):
        """Initialize the populator with NBA.com and ESPN API clients."""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        })
        
        # ESPN API setup
        self.espn_base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
        
        # NBA team abbreviations for fetching from ESPN
        self.nba_teams = [
            'atl', 'bos', 'bkn', 'cha', 'chi', 'cle', 'dal', 'den',
            'det', 'gsw', 'hou', 'ind', 'lac', 'lal', 'mem', 'mia',
            'mil', 'min', 'no', 'ny', 'okc', 'orl', 'phi', 'phx',
            'por', 'sac', 'sa', 'tor', 'utah', 'wsh'
        ]

    def normalize_name(self, name: str) -> str:
        """Normalize player name for matching (remove accents, lowercase, etc.)"""
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

    def fetch_nba_stats_players(self) -> List[Dict]:
        """Fetch all NBA player IDs from NBA Stats API"""
        logger.info("🏀 Fetching NBA players from NBA Stats API...")
        
        url = 'https://stats.nba.com/stats/commonallplayers'
        params = {
            'IsOnlyCurrentSeason': '1',
            'LeagueID': '00',
            'Season': '2024-25'
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.nba.com/',
            'x-nba-stats-origin': 'stats'
        }
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            nba_players = []
            for player_data in data['resultSets'][0]['rowSet']:
                if player_data[3] == 1:  # ROSTERSTATUS = 1 (active)
                    nba_players.append({
                        'nba_player_id': player_data[0],  # PERSON_ID
                        'player_name': player_data[2],    # DISPLAY_FIRST_LAST
                        'normalized_name': self.normalize_name(player_data[2])
                    })
            
            logger.info(f"📊 Found {len(nba_players)} active NBA players from Stats API")
            return nba_players
            
        except Exception as e:
            logger.error(f"❌ Error fetching NBA Stats players: {e}")
            return []

    def fetch_espn_players(self) -> List[Dict]:
        """Fetch all ESPN player IDs and positions from ESPN API"""
        logger.info("🏀 Fetching ALL ESPN players and positions...")
        
        espn_players = []
        
        for team_abbr in self.nba_teams:
            try:
                logger.info(f"📋 Processing team: {team_abbr}")
                url = f"{self.espn_base_url}/teams/{team_abbr}/roster"
                
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                time.sleep(0.5)  # Rate limiting
                
                for athlete in data.get('athletes', []):
                    player_name = athlete.get('displayName', '')
                    espn_id = athlete.get('id')
                    position_info = athlete.get('position', {})
                    
                    if espn_id and player_name:
                        # Handle position - could be string or dict
                        if isinstance(position_info, dict):
                            position = position_info.get('abbreviation', '')
                        else:
                            position = str(position_info) if position_info else ''
                        
                        # Normalize position (F -> SF,PF, etc.)
                        if position == 'F':
                            position = 'SF|PF'
                        elif position and ',' not in position and '|' not in position:
                            # Single position, keep as is
                            pass
                        
                        espn_players.append({
                            'espn_player_id': int(espn_id),
                            'player_name': player_name,
                            'normalized_name': self.normalize_name(player_name),
                            'position': position,
                            'team_abbr': team_abbr
                        })
                
            except Exception as e:
                logger.warning(f"⚠️ Error fetching {team_abbr} roster: {e}")
                continue
        
        logger.info(f"📊 Found {len(espn_players)} ESPN players with positions")
        return espn_players

    def match_players(self, nba_players: List[Dict], espn_players: List[Dict]) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """Match NBA.com players with ESPN players"""
        logger.info("🔗 Matching NBA.com players with ESPN players...")
        
        # Create lookup dictionary for ESPN players
        espn_lookup = {player['normalized_name']: player for player in espn_players}
        
        matched_players = []
        nba_only_players = []
        espn_only_players = espn_players.copy()
        
        for nba_player in nba_players:
            normalized_name = nba_player['normalized_name']
            
            if normalized_name in espn_lookup:
                espn_player = espn_lookup[normalized_name]
                
                # Create matched player record
                matched_player = {
                    'player_id': str(uuid.uuid4()),
                    'nba_player_id': nba_player['nba_player_id'],
                    'espn_player_id': espn_player['espn_player_id'],
                    'player_name': nba_player['player_name'],  # Use NBA name as primary
                    'position': espn_player['position']
                }
                
                matched_players.append(matched_player)
                
                # Remove from ESPN-only list
                espn_only_players = [p for p in espn_only_players if p['normalized_name'] != normalized_name]
                
                logger.info(f"  ✅ Matched: {nba_player['player_name']} (NBA ID: {nba_player['nba_player_id']}, ESPN ID: {espn_player['espn_player_id']})")
            else:
                nba_only_players.append(nba_player)
                logger.warning(f"  ❌ No ESPN match found for: {nba_player['player_name']}")
        
        return matched_players, nba_only_players, espn_only_players

    def export_to_csv(self, matched_players: List[Dict], nba_only_players: List[Dict], espn_only_players: List[Dict]):
        """Export all player data to CSV files"""
        
        # Export matched players (complete records)
        matched_filename = '/Users/adarsh/RosterGuru/RosterGuru/data/players_matched.csv'
        logger.info(f"💾 Exporting {len(matched_players)} matched players to {matched_filename}")
        
        with open(matched_filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['player_id', 'nba_player_id', 'espn_player_id', 'player_name', 'position']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(matched_players)
        
        # Export NBA-only players (missing ESPN data)
        nba_only_filename = '/Users/adarsh/RosterGuru/RosterGuru/data/players_nba_only.csv'
        logger.info(f"💾 Exporting {len(nba_only_players)} NBA-only players to {nba_only_filename}")
        
        with open(nba_only_filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['player_id', 'nba_player_id', 'espn_player_id', 'player_name', 'position']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for player in nba_only_players:
                writer.writerow({
                    'player_id': str(uuid.uuid4()),
                    'nba_player_id': player['nba_player_id'],
                    'espn_player_id': None,  # NULL for NBA-only players
                    'player_name': player['player_name'],
                    'position': None  # NULL for missing position
                })
        
        # Export ESPN-only players (missing NBA data)
        espn_only_filename = '/Users/adarsh/RosterGuru/RosterGuru/data/players_espn_only.csv'
        logger.info(f"💾 Exporting {len(espn_only_players)} ESPN-only players to {espn_only_filename}")
        
        with open(espn_only_filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['player_id', 'nba_player_id', 'espn_player_id', 'player_name', 'position']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for player in espn_only_players:
                writer.writerow({
                    'player_id': str(uuid.uuid4()),
                    'nba_player_id': None,  # NULL for ESPN-only players
                    'espn_player_id': player['espn_player_id'],
                    'player_name': player['player_name'],
                    'position': player['position']
                })

    def run_comprehensive_collection(self):
        """Main method to run comprehensive player collection"""
        logger.info("🚀 Starting comprehensive players collection...")
        
        # Step 1: Fetch NBA Stats API players
        nba_players = self.fetch_nba_stats_players()
        if not nba_players:
            logger.error("❌ Failed to fetch NBA players, aborting")
            return
        
        # Step 2: Fetch ESPN players
        espn_players = self.fetch_espn_players()
        if not espn_players:
            logger.error("❌ Failed to fetch ESPN players, aborting")
            return
        
        # Step 3: Match players
        matched_players, nba_only_players, espn_only_players = self.match_players(nba_players, espn_players)
        
        # Step 4: Export to CSV
        self.export_to_csv(matched_players, nba_only_players, espn_only_players)
        
        # Summary
        logger.info("\n📊 COMPREHENSIVE COLLECTION SUMMARY:")
        logger.info(f"Total NBA.com players: {len(nba_players)}")
        logger.info(f"Total ESPN players: {len(espn_players)}")
        logger.info(f"Successfully matched: {len(matched_players)}")
        logger.info(f"NBA-only players: {len(nba_only_players)}")
        logger.info(f"ESPN-only players: {len(espn_only_players)}")
        logger.info("\n🏆 Comprehensive players collection completed!")

if __name__ == "__main__":
    populator = ComprehensivePlayersPopulator()
    populator.run_comprehensive_collection()
