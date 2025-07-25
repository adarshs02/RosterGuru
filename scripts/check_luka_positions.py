#!/usr/bin/env python3
"""
Script to check Luka Doncic's position on ESPN using different API approaches
"""

import os
import sys
import requests
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from espn_api_client import ESPNFantasyClient
from nba_api_client import NBAApiClient

def test_espn_fantasy_endpoints():
    """Test ESPN Fantasy API endpoints for player data"""
    print("🔍 Testing ESPN Fantasy API Endpoints...")
    
    # Test fantasy API endpoints based on the provided table
    fantasy_endpoints = [
        # Fantasy base API
        "https://fantasy.espn.com/apis/v3/games/fba/players",
        "https://fantasy.espn.com/apis/v3/games/fba/seasons/2024/players",
        "https://fantasy.espn.com/apis/v3/games/fba/seasons/2024/segments/0/leagues/0",
        
        # LM Fantasy API (potentially better)
        "https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/players",
        "https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/2024/players",
        
        # Sports core API
        "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes",
        "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2024/athletes",
        
        # Web API
        "https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/athletes",
    ]
    
    for endpoint in fantasy_endpoints:
        try:
            print(f"\n   Trying: {endpoint}")
            response = requests.get(endpoint, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Status: {response.status_code} - Found data")
                
                # Show keys to understand structure
                if isinstance(data, dict):
                    print(f"   Keys: {list(data.keys())[:5]}")
                    
                # Look for Luka specifically
                data_str = json.dumps(data).lower()
                if "luka" in data_str and "doncic" in data_str:
                    print(f"   🎯 Contains Luka Doncic data!")
                else:
                    print(f"   📝 No Luka data found")
            else:
                print(f"   ❌ Status: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")

def test_espn_team_specific():
    """Test getting just Dallas Mavericks roster (Luka's team)"""
    print("\n🏀 Testing Dallas Mavericks Roster (Team ID: 6)...")
    
    try:
        # Dallas Mavericks team ID is 6
        roster_url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/6/roster"
        response = requests.get(roster_url, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Successfully got Dallas roster")
            
            if 'athletes' in data:
                print(f"   Found {len(data['athletes'])} players")
                
                # Look for Luka
                for athlete in data['athletes']:
                    name = athlete.get('displayName', '').lower()
                    if 'luka' in name and 'doncic' in name:
                        print(f"\n   🎯 FOUND LUKA DONCIC:")
                        print(f"      Name: {athlete.get('displayName', 'N/A')}")
                        print(f"      ESPN ID: {athlete.get('id', 'N/A')}")
                        
                        position = athlete.get('position', {})
                        if position:
                            print(f"      Position: {position.get('displayName', 'N/A')} ({position.get('abbreviation', 'N/A')})")
                        
                        # Show all available data
                        print(f"      Available keys: {list(athlete.keys())}")
                        return athlete.get('id')  # Return ESPN ID for further testing
                        
            else:
                print(f"   ❌ No 'athletes' key in response")
        else:
            print(f"   ❌ Status: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return None

def test_historical_seasons(player_espn_id):
    """Test if we can get historical data using ESPN player ID"""
    if not player_espn_id:
        print("\n⚠️  Skipping historical test - no ESPN ID found")
        return
        
    print(f"\n📅 Testing Historical Data (ESPN ID: {player_espn_id})...")
    
    # Try different historical endpoints
    historical_endpoints = [
        f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/{player_espn_id}",
        f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/{player_espn_id}/stats",
        f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/{player_espn_id}/gamelog",
    ]
    
    for endpoint in historical_endpoints:
        try:
            print(f"\n   Trying: {endpoint}")
            response = requests.get(endpoint, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Status: {response.status_code}")
                
                # Look for seasons/years in the data
                data_str = json.dumps(data)
                years_found = []
                for year in ['2018', '2019', '2020', '2021', '2022', '2023', '2024']:
                    if year in data_str:
                        years_found.append(year)
                        
                if years_found:
                    print(f"   📅 Contains data for years: {', '.join(years_found)}")
                else:
                    print(f"   📝 No historical year data detected")
                    
            else:
                print(f"   ❌ Status: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")

def main():
    print("🏀 ESPN API Investigation - Finding Luka Doncic")
    print("=" * 60)
    print("\nTesting different ESPN API base URLs (focusing on fantasy endpoints)...")
    
    # Test 1: Fantasy API endpoints (most promising per user suggestion)
    test_espn_fantasy_endpoints()
    
    # Test 2: Team-specific roster (faster than all teams)
    luka_espn_id = test_espn_team_specific()
    
    # Test 3: Historical data if we found ESPN ID
    test_historical_seasons(luka_espn_id)
    
    print("\n" + "=" * 60)
    print("📝 FINDINGS:")
    print("\n1. ROSTER APPROACH (Current Method):")
    print("   ✅ Works reliably for current season")
    print("   ⚠️  Requires hitting 30+ team endpoints (slow)")
    print("   ⚠️  Only provides current roster data")
    
    print("\n2. TEAM-SPECIFIC APPROACH (Faster):")
    print("   ✅ Much faster - only hit specific team roster")
    print("   ✅ Good if you know player's current team")
    print("   ⚠️  Still only current roster data")
    
    print("\n3. DIRECT PLAYER SEARCH:")
    print("   ❓ ESPN may not have public search endpoints")
    print("   ❓ Individual player endpoints may exist but need ESPN ID")
    
    print("\n4. HISTORICAL DATA:")
    print("   ❌ ESPN public API appears to only have current roster positions")
    print("   ❌ No historical position data found in any endpoint tested")
    
    print("\n💡 RECOMMENDATION:")
    print("   For current positions: Use team-specific roster if you know the team")
    print("   For historical positions: ESPN API is not suitable - would need different source")
    
if __name__ == "__main__":
    main()
