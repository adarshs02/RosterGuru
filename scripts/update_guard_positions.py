#!/usr/bin/env python3
"""
Update Guard Positions Script

This script reads the players_matched.csv file and changes all players 
with position "G" to "PG|SG" to match the format used for forwards.
"""

import csv
import os
from typing import List, Dict

def update_guard_positions(file_path: str) -> None:
    """Update guard positions from G to PG|SG in the CSV file"""
    
    print(f"🏀 Updating guard positions in {os.path.basename(file_path)}...")
    
    # Read the CSV file
    updated_players = []
    g_count = 0
    total_count = 0
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            
            for row in reader:
                total_count += 1
                
                # Check if position is "G" and update it
                if row.get('position', '').strip() == 'G':
                    row['position'] = 'PG|SG'
                    g_count += 1
                    print(f"  ✅ Updated: {row['player_name']} → G to PG|SG")
                
                updated_players.append(row)
        
        # Write the updated data back to the file
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_players)
        
        # Summary
        print(f"\n📊 UPDATE SUMMARY:")
        print(f"Total players processed: {total_count}")
        print(f"Guard positions updated: {g_count}")
        print(f"Updated file: {file_path}")
        
        if g_count > 0:
            print(f"✅ Successfully updated {g_count} guard positions from 'G' to 'PG|SG'")
        else:
            print("ℹ️  No guard positions needed updating")
            
    except FileNotFoundError:
        print(f"❌ Error: File not found - {file_path}")
    except Exception as e:
        print(f"❌ Error processing file: {e}")

def preview_guard_positions(file_path: str) -> None:
    """Preview players with 'G' position before updating"""
    
    print(f"🔍 Previewing guard positions in {os.path.basename(file_path)}...")
    
    try:
        guard_players = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                if row.get('position', '').strip() == 'G':
                    guard_players.append({
                        'player_name': row['player_name'],
                        'position': row['position'],
                        'nba_player_id': row.get('nba_player_id', 'N/A'),
                        'espn_player_id': row.get('espn_player_id', 'N/A')
                    })
        
        if guard_players:
            print(f"\n📋 Found {len(guard_players)} players with 'G' position:")
            print("-" * 60)
            for player in guard_players[:10]:  # Show first 10
                print(f"  • {player['player_name']} (NBA: {player['nba_player_id']}, ESPN: {player['espn_player_id']})")
            
            if len(guard_players) > 10:
                print(f"  ... and {len(guard_players) - 10} more")
            
            print(f"\nThese will be updated from 'G' to 'PG|SG'")
        else:
            print("ℹ️  No players found with 'G' position")
            
        return len(guard_players)
        
    except FileNotFoundError:
        print(f"❌ Error: File not found - {file_path}")
        return 0
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return 0

def check_position_distribution(file_path: str) -> None:
    """Check the distribution of positions in the file"""
    
    print(f"📊 Position distribution in {os.path.basename(file_path)}:")
    
    try:
        position_counts = {}
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                position = row.get('position', '').strip()
                if position:
                    position_counts[position] = position_counts.get(position, 0) + 1
        
        # Sort by count descending
        sorted_positions = sorted(position_counts.items(), key=lambda x: x[1], reverse=True)
        
        print("-" * 30)
        for position, count in sorted_positions:
            print(f"  {position}: {count}")
        
        print("-" * 30)
        print(f"Total: {sum(position_counts.values())}")
        
    except Exception as e:
        print(f"❌ Error checking positions: {e}")

def main():
    """Main function"""
    print("🏀 Guard Position Updater")
    print("=" * 50)
    
    file_path = "/Users/adarsh/RosterGuru/RosterGuru/data/players_matched.csv"
    
    # Check current position distribution
    check_position_distribution(file_path)
    
    # Preview guard positions that will be updated
    guard_count = preview_guard_positions(file_path)
    
    if guard_count > 0:
        print(f"\n🔄 Proceeding with update...")
        update_guard_positions(file_path)
        
        print(f"\n📊 Post-update position distribution:")
        check_position_distribution(file_path)
    else:
        print(f"\n✅ No updates needed - no 'G' positions found")

if __name__ == "__main__":
    main()
