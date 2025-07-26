#!/usr/bin/env python3
"""
Investigate ESPN API Draft Information

This script explores the ESPN API to understand what draft-related information
is available for NBA players and how to access it.
"""

import requests
import json
import time
from typing import Dict, List, Optional

class ESPNDraftInvestigator:
    def __init__(self):
        """Initialize the ESPN API investigator"""
        self.base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

    def get_team_roster(self, team_id: int) -> Optional[Dict]:
        """Get team roster from ESPN API"""
        try:
            url = f"{self.base_url}/teams/{team_id}/roster"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching team {team_id} roster: {e}")
            return None

    def analyze_player_draft_fields(self, player_data: Dict) -> Dict:
        """Analyze what draft-related fields are available for a player"""
        draft_info = {}
        
        # Check all possible draft-related fields
        draft_fields = [
            'draft', 'draftYear', 'draft_year', 'draftRound', 'draft_round',
            'draftPick', 'draft_pick', 'draftPosition', 'draft_position',
            'draftTeam', 'draft_team', 'drafted', 'draftInfo'
        ]
        
        def search_nested(obj, path=""):
            """Recursively search for draft-related fields"""
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_path = f"{path}.{key}" if path else key
                    
                    # Check if this key contains draft info
                    if any(draft_field.lower() in key.lower() for draft_field in draft_fields):
                        draft_info[current_path] = value
                    
                    # Continue searching nested objects
                    if isinstance(value, (dict, list)):
                        search_nested(value, current_path)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    current_path = f"{path}[{i}]"
                    if isinstance(item, (dict, list)):
                        search_nested(item, current_path)
        
        search_nested(player_data)
        return draft_info

    def get_player_detailed_info(self, espn_player_id: int) -> Optional[Dict]:
        """Try to get detailed player information from ESPN"""
        try:
            # Try the player endpoint
            url = f"{self.base_url}/athletes/{espn_player_id}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Player endpoint failed for {espn_player_id}: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error fetching player {espn_player_id}: {e}")
            return None

    def investigate_sample_players(self):
        """Investigate draft info for a sample of players"""
        print("🔍 Investigating ESPN API Draft Information")
        print("=" * 55)
        
        # Get a few team rosters to analyze
        sample_teams = [1, 2, 3, 4, 5]  # Lakers, Celtics, Hawks, Nets, Hornets
        all_players = []
        
        for team_id in sample_teams:
            print(f"\n📥 Fetching roster for team {team_id}...")
            roster_data = self.get_team_roster(team_id)
            
            if roster_data and 'athletes' in roster_data:
                for athlete in roster_data['athletes']:
                    all_players.append(athlete)
                print(f"   Found {len(roster_data['athletes'])} players")
            
            time.sleep(0.5)  # Rate limiting
        
        print(f"\n📊 Total players to analyze: {len(all_players)}")
        
        # Analyze draft fields for sample players
        print(f"\n🔬 ANALYZING DRAFT FIELDS IN ROSTER DATA:")
        print("=" * 60)
        
        draft_fields_found = {}
        sample_size = min(10, len(all_players))
        
        for i, player in enumerate(all_players[:sample_size]):
            player_name = player.get('fullName', f'Player {i+1}')
            print(f"\n{i+1}. {player_name}")
            print("-" * 40)
            
            # Show all available fields
            print("Available fields:")
            for key in player.keys():
                print(f"  - {key}: {type(player[key])}")
            
            # Look for draft-specific info
            draft_info = self.analyze_player_draft_fields(player)
            if draft_info:
                print(f"\n🏀 Draft-related fields found:")
                for field, value in draft_info.items():
                    print(f"  - {field}: {value}")
                    draft_fields_found[field] = draft_fields_found.get(field, 0) + 1
            else:
                print("   No draft-related fields found in roster data")
        
        # Try individual player endpoints
        print(f"\n🔬 TESTING INDIVIDUAL PLAYER ENDPOINTS:")
        print("=" * 50)
        
        for i, player in enumerate(all_players[:5]):  # Test first 5 players
            player_name = player.get('fullName', f'Player {i+1}')
            player_id = player.get('id')
            
            if not player_id:
                continue
                
            print(f"\n{i+1}. Testing {player_name} (ID: {player_id})")
            
            detailed_info = self.get_player_detailed_info(player_id)
            if detailed_info:
                print("   ✅ Individual player endpoint works!")
                
                # Analyze draft fields in detailed info
                draft_info = self.analyze_player_draft_fields(detailed_info)
                if draft_info:
                    print(f"   🏀 Draft fields in detailed info:")
                    for field, value in draft_info.items():
                        print(f"      - {field}: {value}")
                else:
                    print("   ❌ No draft fields in detailed player info")
                    
                # Show structure of detailed response
                if 'athlete' in detailed_info:
                    athlete = detailed_info['athlete']
                    print(f"   📋 Available athlete fields:")
                    for key in athlete.keys():
                        print(f"      - {key}: {type(athlete[key])}")
            else:
                print("   ❌ Individual player endpoint failed")
            
            time.sleep(0.5)  # Rate limiting
        
        # Summary
        print(f"\n📊 DRAFT FIELDS SUMMARY:")
        print("=" * 30)
        if draft_fields_found:
            print("Draft-related fields found:")
            for field, count in draft_fields_found.items():
                print(f"  - {field}: found in {count} players")
        else:
            print("❌ No draft-related fields found in ESPN roster data")
        
        # Test ESPN Draft API endpoint if it exists
        print(f"\n🔬 TESTING ESPN DRAFT API:")
        print("=" * 35)
        
        # Try different draft endpoint patterns
        draft_endpoints = [
            f"{self.base_url}/draft",
            f"{self.base_url}/draft/2024",
            f"{self.base_url}/draft/2023",
            "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/draft",
            "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/draft/2024",
        ]
        
        for endpoint in draft_endpoints:
            try:
                print(f"Testing: {endpoint}")
                response = self.session.get(endpoint, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    print(f"   ✅ Success! Keys: {list(data.keys())}")
                    
                    # If we find draft data, show structure
                    if 'draft' in data or 'picks' in data:
                        print(f"   🎯 Draft data found!")
                        return data  # Return first successful draft endpoint
                else:
                    print(f"   ❌ Failed: {response.status_code}")
            except Exception as e:
                print(f"   ❌ Error: {e}")
            
            time.sleep(0.5)
        
        print(f"\n💡 RECOMMENDATIONS:")
        print("=" * 20)
        print("Based on the analysis:")
        if draft_fields_found:
            print("✅ Some draft fields are available in ESPN data")
            print("   Consider extracting these fields to improve draft info")
        else:
            print("❌ ESPN roster data may not contain comprehensive draft info")
            print("   Consider alternative data sources for draft information")
            print("   Options:")
            print("   1. NBA.com draft pages")
            print("   2. Basketball Reference")
            print("   3. Other sports APIs")

def main():
    """Main function"""
    investigator = ESPNDraftInvestigator()
    investigator.investigate_sample_players()

if __name__ == "__main__":
    main()
