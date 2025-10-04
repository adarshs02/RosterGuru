#!/usr/bin/env python3
"""
Manual NBA ID Enhancement Script

This script enhances the ESPN-only players CSV by adding known NBA IDs
for players who exist on NBA.com but not in the Stats API.
"""

import csv
import uuid
from typing import Dict

# Manual mapping of NBA IDs for ESPN-only players
# These are confirmed NBA IDs from NBA.com that don't appear in Stats API yet
MANUAL_NBA_IDS = {
    'Cooper Flagg': 1642843,
    'Nikola Djurisic': 1642365,
    'Hansen Yang': 1642905,
    'Nigel Hayes': 1628502,
    # Add more as needed when discovered
}

def enhance_espn_only_players():
    """Add known NBA IDs to ESPN-only players and create enhanced matched file"""
    
    enhanced_players = []
    updated_count = 0
    
    print("🔧 Enhancing ESPN-only players with manual NBA IDs...")
    
    # Read ESPN-only file
    with open('/Users/adarsh/RosterGuru/RosterGuru/data/players_espn_only.csv', 'r') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            player_name = row['player_name']
            
            if player_name in MANUAL_NBA_IDS:
                # Convert ESPN-only to matched player
                enhanced_player = {
                    'player_id': row['player_id'],
                    'nba_player_id': MANUAL_NBA_IDS[player_name],
                    'espn_player_id': row['espn_player_id'],
                    'player_name': player_name,
                    'position': row['position']
                }
                enhanced_players.append(enhanced_player)
                updated_count += 1
                print(f"  ✅ Enhanced: {player_name} → NBA ID: {MANUAL_NBA_IDS[player_name]}")
    
    if enhanced_players:
        # Read existing matched players
        existing_matched = []
        with open('/Users/adarsh/RosterGuru/RosterGuru/data/players_matched.csv', 'r') as f:
            reader = csv.DictReader(f)
            existing_matched = list(reader)
        
        # Combine with enhanced players
        all_matched = existing_matched + enhanced_players
        
        # Write enhanced matched file
        enhanced_filename = '/Users/adarsh/RosterGuru/RosterGuru/data/players_matched_enhanced.csv'
        with open(enhanced_filename, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['player_id', 'nba_player_id', 'espn_player_id', 'player_name', 'position']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_matched)
        
        print(f"\n📊 Enhancement Summary:")
        print(f"Original matched players: {len(existing_matched)}")
        print(f"Manually enhanced players: {updated_count}")
        print(f"Total enhanced matched players: {len(all_matched)}")
        print(f"Enhanced file: {enhanced_filename}")
        
        return True
    else:
        print("❌ No players found for enhancement")
        return False

if __name__ == "__main__":
    enhance_espn_only_players()
