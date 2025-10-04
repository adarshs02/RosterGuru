#!/usr/bin/env python3
"""
Test ESPN API Fields

This script tests the ESPN API to understand the structure and available fields
for NBA player data to properly extract draft_year, jersey_number, college_name,
display_height, display_weight, age, and injury_status.
"""

import requests
import json
from typing import Dict, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ESPNAPITester:
    def __init__(self):
        """Initialize the ESPN API tester"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html, */*',
        })

    def test_player_endpoint(self, espn_player_id: int, player_name: str = "Unknown"):
        """Test a specific player endpoint and show the full response structure"""
        print(f"\n🔍 Testing ESPN Player ID: {espn_player_id} ({player_name})")
        print("=" * 80)
        
        try:
            url = f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/{espn_player_id}"
            print(f"🌐 URL: {url}")
            
            response = self.session.get(url, timeout=15)
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Pretty print the JSON structure
                print(f"📋 Full Response Structure:")
                print(json.dumps(data, indent=2)[:2000] + "..." if len(json.dumps(data, indent=2)) > 2000 else json.dumps(data, indent=2))
                
                # Extract athlete data if present
                athlete = data.get('athlete', {})
                if athlete:
                    print(f"\n🏀 Athlete Data Analysis:")
                    print(f"   Name: {athlete.get('displayName', 'N/A')}")
                    print(f"   Age: {athlete.get('age', 'N/A')}")
                    print(f"   Height: {athlete.get('displayHeight', 'N/A')}")
                    print(f"   Weight: {athlete.get('displayWeight', 'N/A')}")
                    print(f"   Jersey: {athlete.get('jersey', 'N/A')}")
                    
                    # Check for college info
                    college = athlete.get('college', {})
                    print(f"   College: {college.get('name', 'N/A') if college else 'N/A'}")
                    
                    # Check for draft info
                    draft = athlete.get('draft', {})
                    print(f"   Draft Year: {draft.get('year', 'N/A') if draft else 'N/A'}")
                    
                    # Check for injuries
                    injuries = athlete.get('injuries', [])
                    if injuries:
                        print(f"   Injuries: {len(injuries)} found")
                        for i, injury in enumerate(injuries):
                            print(f"     {i+1}. Status: {injury.get('status', 'N/A')}")
                    else:
                        print(f"   Injuries: None")
                    
                    # Show all available keys in athlete object
                    print(f"\n🔑 Available athlete keys:")
                    for key in sorted(athlete.keys()):
                        print(f"     - {key}: {type(athlete[key])}")
                else:
                    print(f"❌ No athlete data found in response")
                    
            else:
                print(f"❌ Request failed with status {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                
        except Exception as e:
            print(f"❌ Error testing player {espn_player_id}: {e}")

    def test_multiple_endpoints(self):
        """Test multiple ESPN API endpoints for different players"""
        
        # Test players with known ESPN IDs from our data
        test_players = [
            (2544, "LeBron James"),  # Well-known player, likely to have full data
            (3975, "Stephen Curry"),  # Another well-known player
            (4066261, "Bam Adebayo"),  # From our data
            (4397018, "Ochai Agbaji"),  # From our data
            (3924, "Kevin Durant"),  # Well-known veteran
        ]
        
        print("🏀 ESPN API Field Testing")
        print("=" * 60)
        
        for espn_id, player_name in test_players:
            self.test_player_endpoint(espn_id, player_name)
            print("\n" + "="*80)

    def test_alternative_endpoints(self):
        """Test alternative ESPN API endpoints that might have more data"""
        
        print(f"\n🔄 Testing Alternative ESPN Endpoints")
        print("=" * 60)
        
        # Test different endpoint structures
        test_endpoints = [
            "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/2544/profile",
            "http://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/2544",
            "http://site.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/2544",
            "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/2544/overview"
        ]
        
        for url in test_endpoints:
            print(f"\n🌐 Testing: {url}")
            try:
                response = self.session.get(url, timeout=15)
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"   Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                    
                    # Look for athlete data
                    if 'athlete' in data:
                        athlete = data['athlete']
                        available_fields = []
                        for field in ['age', 'displayHeight', 'displayWeight', 'jersey', 'college', 'draft']:
                            if field in athlete and athlete[field] is not None:
                                available_fields.append(field)
                        print(f"   Available fields: {available_fields}")
                else:
                    print(f"   Failed: {response.text[:100]}")
                    
            except Exception as e:
                print(f"   Error: {e}")

    def test_team_roster_endpoint(self):
        """Test the team roster endpoint to see if it has more detailed player info"""
        
        print(f"\n🏒 Testing Team Roster Endpoint")
        print("=" * 60)
        
        # Test Lakers roster (team ID 13)
        url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/13/roster"
        
        try:
            print(f"🌐 URL: {url}")
            response = self.session.get(url, timeout=15)
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Look at the first few athletes in the roster
                athletes = data.get('athletes', [])
                if athletes:
                    print(f"📋 Found {len(athletes)} athletes")
                    
                    for i, athlete in enumerate(athletes[:3]):  # First 3 players
                        print(f"\n   Player {i+1}:")
                        print(f"     Name: {athlete.get('displayName', 'N/A')}")
                        print(f"     Age: {athlete.get('age', 'N/A')}")
                        print(f"     Height: {athlete.get('displayHeight', 'N/A')}")
                        print(f"     Weight: {athlete.get('displayWeight', 'N/A')}")
                        print(f"     Jersey: {athlete.get('jersey', 'N/A')}")
                        print(f"     College: {athlete.get('college', {}).get('name', 'N/A')}")
                        print(f"     Draft: {athlete.get('draft', {}).get('year', 'N/A')}")
                        print(f"     All keys: {list(athlete.keys())}")
                else:
                    print(f"❌ No athletes found in roster")
                    
            else:
                print(f"❌ Request failed: {response.text[:200]}")
                
        except Exception as e:
            print(f"❌ Error testing roster endpoint: {e}")

def main():
    """Main function to run all tests"""
    print("🧪 ESPN API Field Structure Testing")
    print("=" * 80)
    
    tester = ESPNAPITester()
    
    # Test individual player endpoints
    tester.test_multiple_endpoints()
    
    # Test alternative endpoints
    tester.test_alternative_endpoints()
    
    # Test team roster endpoint
    tester.test_team_roster_endpoint()
    
    print(f"\n🏁 Testing completed!")

if __name__ == "__main__":
    main()
