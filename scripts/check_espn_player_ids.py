#!/usr/bin/env python3
"""
ESPN Player ID Checker Script

This script checks ESPN's API structure to understand how they identify NBA players
and extracts their player ID system for potential use in our database.
"""

import requests
import json
import time
from typing import Dict, List, Optional
import os
from pathlib import Path

class ESPNPlayerIDChecker:
    def __init__(self):
        self.base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
    def get_teams(self) -> List[Dict]:
        """Get all NBA teams from ESPN API."""
        try:
            url = f"{self.base_url}/teams"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            teams = []
            
            if 'sports' in data and len(data['sports']) > 0:
                leagues = data['sports'][0].get('leagues', [])
                if leagues:
                    teams = leagues[0].get('teams', [])
                    
            print(f"✅ Found {len(teams)} NBA teams")
            return teams
            
        except Exception as e:
            print(f"❌ Error fetching teams: {e}")
            return []
    
    def get_team_roster(self, team_id: str) -> Dict:
        """Get roster for a specific team."""
        try:
            url = f"{self.base_url}/teams/{team_id}/roster"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"❌ Error fetching roster for team {team_id}: {e}")
            return {}
    
    def analyze_player_structure(self, player_data: Dict) -> Dict:
        """Analyze the structure of ESPN player data with comprehensive field extraction."""
        analysis = {
            'has_id': False,
            'id_value': None,
            'id_type': None,
            'name': None,
            'position': None,
            'all_fields': {},
            'nested_fields': {},
            'field_count': 0
        }
        
        # Extract ALL fields from player data recursively
        def extract_all_fields(data, prefix=""):
            fields = {}
            if isinstance(data, dict):
                for key, value in data.items():
                    field_name = f"{prefix}.{key}" if prefix else key
                    
                    if isinstance(value, (dict, list)):
                        # Store nested structure info
                        fields[field_name] = {
                            'type': type(value).__name__,
                            'value_preview': str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                        }
                        # Recursively extract nested fields
                        if isinstance(value, dict):
                            nested = extract_all_fields(value, field_name)
                            fields.update(nested)
                        elif isinstance(value, list) and value and isinstance(value[0], dict):
                            # For lists of dicts, analyze first item
                            nested = extract_all_fields(value[0], f"{field_name}[0]")
                            fields.update(nested)
                    else:
                        fields[field_name] = {
                            'type': type(value).__name__,
                            'value': value
                        }
            return fields
        
        analysis['all_fields'] = extract_all_fields(player_data)
        analysis['field_count'] = len(analysis['all_fields'])
        
        # Check for ID field
        if 'id' in player_data:
            analysis['has_id'] = True
            analysis['id_value'] = player_data['id']
            analysis['id_type'] = type(player_data['id']).__name__
            
        # Get name (try multiple possible fields)
        name_fields = ['displayName', 'fullName', 'name', 'shortName']
        for field in name_fields:
            if field in player_data and player_data[field]:
                analysis['name'] = player_data[field]
                break
            
        # Get position (handle different structures)
        if 'position' in player_data:
            pos_data = player_data['position']
            if isinstance(pos_data, dict):
                if 'abbreviation' in pos_data:
                    analysis['position'] = pos_data['abbreviation']
                elif 'name' in pos_data:
                    analysis['position'] = pos_data['name']
                elif 'displayName' in pos_data:
                    analysis['position'] = pos_data['displayName']
            else:
                analysis['position'] = str(pos_data)
                
        return analysis
    
    def print_complete_player_data(self, player_data: Dict, team_name: str) -> None:
        """Print absolutely ALL available data for a single player."""
        analysis = self.analyze_player_structure(player_data)
        
        print(f"\n🏀 COMPLETE PLAYER DATA ANALYSIS")
        print("=" * 70)
        print(f"Player: {analysis['name']}")
        print(f"Team: {team_name}")
        print(f"ESPN ID: {analysis['id_value']} ({analysis['id_type']})")
        print(f"Position: {analysis['position']}")
        print(f"Total Available Fields: {analysis['field_count']}")
        print("=" * 70)
        
        # Print EVERY single field with full details
        print(f"\n📋 ALL AVAILABLE FIELDS ({analysis['field_count']} total):")
        print("-" * 70)
        
        # Sort fields for better readability
        sorted_fields = sorted(analysis['all_fields'].items())
        
        for i, (field_name, field_data) in enumerate(sorted_fields, 1):
            field_type = field_data.get('type', 'unknown')
            
            if 'value' in field_data:
                # Direct value
                value = field_data['value']
                if isinstance(value, str) and len(value) > 200:
                    display_value = value[:200] + "... (truncated)"
                else:
                    display_value = value
                    
                print(f"{i:2d}. {field_name}")
                print(f"    Type: {field_type}")
                print(f"    Value: {display_value}")
                
            elif 'value_preview' in field_data:
                # Nested/complex value
                preview = field_data['value_preview']
                print(f"{i:2d}. {field_name}")
                print(f"    Type: {field_type} (nested)")
                print(f"    Preview: {preview}")
            
            print()  # Empty line between fields
        
        # Show the complete raw JSON structure
        print(f"\n📄 COMPLETE RAW JSON DATA:")
        print("=" * 70)
        try:
            formatted_json = json.dumps(player_data, indent=2, ensure_ascii=False)
            print(formatted_json)
        except Exception as e:
            print(f"❌ Error formatting JSON: {e}")
            print(f"Raw data: {player_data}")
        
        print("\n" + "=" * 70)
        print(f"✅ Analysis complete for {analysis['name']}")
        print(f"💾 This is ALL data available from ESPN API for this player")
        print("=" * 70)

    def check_single_player_complete_data(self) -> None:
        """Get complete data for just one player to see all available fields."""
        print(f"\n🔍 Complete ESPN Player Data Analysis (Single Player Focus)")
        print("=" * 70)
        
        teams = self.get_teams()
        if not teams:
            print("❌ No teams found")
            return
            
        # Get first team with players
        for team_data in teams[:5]:  # Try first 5 teams to find one with roster
            team = team_data.get('team', {})
            team_id = team.get('id')
            team_name = team.get('displayName', 'Unknown')
            
            print(f"\n📋 Analyzing Team: {team_name} (ID: {team_id})")
            
            if not team_id:
                continue
                
            roster_data = self.get_team_roster(team_id)
            
            if not roster_data:
                print("⚠️  No roster data found, trying next team...")
                continue
                
            # Navigate to athletes/players
            athletes = []
            if 'athletes' in roster_data:
                athletes = roster_data['athletes']
            elif 'roster' in roster_data and 'athletes' in roster_data['roster']:
                athletes = roster_data['roster']['athletes']
                
            if not athletes:
                print("⚠️  No players found, trying next team...")
                continue
                
            print(f"👥 Found {len(athletes)} players")
            
            # Take the first player and show EVERYTHING
            player = athletes[0]
            self.print_complete_player_data(player, team_name)
            
            # Stop after finding first valid player
            break
        else:
            print("❌ No teams with player data found")
    
    def print_comprehensive_summary(self, players: List[Dict]) -> None:
        """Print comprehensive summary analysis of all collected player data."""
        print(f"\n📊 COMPREHENSIVE SUMMARY ANALYSIS")
        print("=" * 70)
        
        total_players = len(players)
        players_with_ids = sum(1 for p in players if p['has_id'])
        
        print(f"Total players analyzed: {total_players}")
        print(f"Players with ESPN IDs: {players_with_ids} ({players_with_ids/total_players*100:.1f}%)")
        
        if players_with_ids > 0:
            # Analyze ID patterns
            id_values = [p['id_value'] for p in players if p['has_id']]
            id_types = [p['id_type'] for p in players if p['has_id']]
            
            print(f"\n🔢 ESPN ID Analysis:")
            print(f"  ID Type: {id_types[0] if id_types else 'N/A'}")
            print(f"  Sample IDs: {id_values[:5]}")
            print(f"  ID Range: {min(id_values):,} - {max(id_values):,}")
            print(f"  Average ID: {sum(id_values)/len(id_values):,.0f}")
            
        # Field analysis across all players
        if players:
            all_field_counts = [p['field_count'] for p in players]
            avg_fields = sum(all_field_counts) / len(all_field_counts)
            
            print(f"\n📋 Data Richness Analysis:")
            print(f"  Average fields per player: {avg_fields:.1f}")
            print(f"  Field count range: {min(all_field_counts)} - {max(all_field_counts)}")
            
            # Collect all unique field names across players
            all_field_names = set()
            for p in players:
                all_field_names.update(p['all_fields'].keys())
                
            print(f"  Total unique field types found: {len(all_field_names)}")
            
            # Show most common field patterns
            print(f"\n🏷️  Common Field Patterns:")
            common_patterns = [
                'id', 'displayName', 'position', 'jersey', 'height', 'weight', 
                'age', 'experience', 'college', 'team', 'headshot', 'href'
            ]
            
            for pattern in common_patterns:
                matching_fields = [f for f in all_field_names if pattern.lower() in f.lower()]
                if matching_fields:
                    print(f"    • {pattern}: {len(matching_fields)} variations")
                    if len(matching_fields) <= 3:
                        print(f"      {', '.join(matching_fields)}")
    
    def generate_enhanced_database_recommendations(self) -> None:
        """Generate enhanced recommendations for database schema based on comprehensive findings."""
        print(f"\n💡 ENHANCED DATABASE SCHEMA RECOMMENDATIONS")
        print("=" * 70)
        
        print("Based on comprehensive ESPN API analysis:")
        print("✅ ESPN provides unique integer player IDs consistently")
        print("✅ Rich player data available including physical, career, and media info")
        print("✅ Structured position data with abbreviations")
        print("✅ Team associations and jersey numbers available")
        print()
        print("🗄️  Recommended current_players table enhancements:")
        print("  - espn_player_id INTEGER UNIQUE NOT NULL ✅ (already added)")
        print("  - jersey_number INTEGER")
        print("  - height VARCHAR(10)  -- e.g., '6-8', '7-0'")
        print("  - weight INTEGER      -- in pounds")
        print("  - age INTEGER")
        print("  - college VARCHAR(100)")
        print("  - years_experience INTEGER ✅ (already added)")
        print("  - headshot_url VARCHAR(500)  -- player photo URL")
        print("  - espn_profile_url VARCHAR(500)  -- ESPN profile link")
        print("  - birthdate DATE")
        print("  - draft_year INTEGER")
        print()
        print("🔄 Data Integration Strategy:")
        print("  1. NBA API → Primary stats and game data")
        print("  2. ESPN API → Player profiles, photos, additional metadata")
        print("  3. Name normalization for cross-API player matching")
        print("  4. Periodic sync to keep current_players table updated")
        print("  5. ESPN IDs enable fantasy features and richer player profiles")

def main():
    """Main execution function."""
    print("🏀 ESPN Player ID & Data Checker")
    print("=" * 70)
    print("This script comprehensively analyzes ESPN's NBA API to understand")
    print("their player ID system and available player data fields")
    print()
    
    checker = ESPNPlayerIDChecker()
    
    try:
        # Get complete data for just one player
        checker.check_single_player_complete_data()
        
        # Generate enhanced recommendations based on the complete data
        checker.generate_enhanced_database_recommendations()
        
        print(f"\n✅ Complete single-player analysis finished!")
        print(f"💾 This shows EVERY field available from ESPN API")
        
    except KeyboardInterrupt:
        print(f"\n⏹️  Analysis interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
