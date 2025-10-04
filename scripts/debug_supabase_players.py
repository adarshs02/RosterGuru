#!/usr/bin/env python3
"""
Debug Supabase Players Table

This script investigates the structure and data in the Supabase players table
to understand why our matching is failing.
"""

import os
import sys
from typing import Dict, List
import logging
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SupabasePlayersDebugger:
    def __init__(self):
        """Initialize the Supabase client"""
        self.supabase = self._init_supabase()

    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        try:
            # Load environment variables
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
            
            if not supabase_url or not supabase_key:
                # Try to load from .env file
                env_path = '/Users/adarsh/RosterGuru/RosterGuru/.env'
                if os.path.exists(env_path):
                    with open(env_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                # Remove quotes from value if present
                                value = value.strip('"').strip("'")
                                if key == 'NEXT_PUBLIC_SUPABASE_URL':
                                    supabase_url = value
                                elif key == 'NEXT_PUBLIC_SUPABASE_SERVICE_KEY':
                                    supabase_key = value
            
            # Remove quotes if still present
            if supabase_url:
                supabase_url = supabase_url.strip('"').strip("'")
            if supabase_key:
                supabase_key = supabase_key.strip('"').strip("'")
            
            if not supabase_url or not supabase_key:
                raise ValueError("Supabase URL and Service Key are required")
            
            client = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabase client initialized successfully")
            return client
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            sys.exit(1)

    def check_players_table_structure(self):
        """Check the structure and content of the players table"""
        print("🔍 Investigating Supabase Players Table")
        print("=" * 50)
        
        try:
            # Try to get basic count
            result = self.supabase.table('players').select('*', count='exact').limit(5).execute()
            
            print(f"📊 Total players in table: {result.count if hasattr(result, 'count') else 'Unknown'}")
            print(f"📊 Sample data returned: {len(result.data) if result.data else 0} records")
            
            if result.data:
                print(f"\n📋 SAMPLE RECORDS (first 5):")
                print("=" * 80)
                
                for i, player in enumerate(result.data):
                    print(f"\n{i+1}. {player.get('player_name', 'Unknown')}")
                    print(f"   player_id: {player.get('player_id')}")
                    print(f"   nba_player_id: {player.get('nba_player_id')} (type: {type(player.get('nba_player_id'))})")
                    print(f"   espn_player_id: {player.get('espn_player_id')} (type: {type(player.get('espn_player_id'))})")
                    print(f"   position: {player.get('position')}")
                    print(f"   All fields: {list(player.keys())}")
            else:
                print("❌ No data returned from players table")
                
        except Exception as e:
            print(f"❌ Error querying players table: {e}")

    def test_specific_nba_ids(self):
        """Test querying for specific NBA IDs from our CSV"""
        print(f"\n🔍 Testing Specific NBA ID Queries")
        print("=" * 40)
        
        # Test some specific NBA IDs that should exist
        test_nba_ids = [203500, 1630173, 1628389, 201939, 201566]  # Steven Adams, Precious Achiuwa, Bam Adebayo, Stephen Curry, Russell Westbrook
        
        for nba_id in test_nba_ids:
            try:
                result = self.supabase.table('players').select('*').eq('nba_player_id', nba_id).execute()
                
                if result.data:
                    player = result.data[0]
                    print(f"✅ Found NBA ID {nba_id}: {player.get('player_name')}")
                else:
                    print(f"❌ NBA ID {nba_id} not found")
                    
            except Exception as e:
                print(f"❌ Error querying NBA ID {nba_id}: {e}")

    def check_data_types(self):
        """Check data types and potential conversion issues"""
        print(f"\n🔍 Checking Data Types and Conversions")
        print("=" * 40)
        
        try:
            # Get a few players to check data types
            result = self.supabase.table('players').select('nba_player_id, player_name').limit(10).execute()
            
            if result.data:
                print(f"NBA ID data types from Supabase:")
                for player in result.data[:5]:
                    nba_id = player.get('nba_player_id')
                    print(f"  {player.get('player_name')}: {nba_id} (type: {type(nba_id)})")
                
                # Test if the IDs are stored as strings instead of integers
                print(f"\nTesting string vs integer matching:")
                test_id = result.data[0].get('nba_player_id')
                
                # Try querying as integer
                int_result = self.supabase.table('players').select('*').eq('nba_player_id', int(test_id)).execute()
                print(f"Query as integer {int(test_id)}: {'✅ Success' if int_result.data else '❌ Failed'}")
                
                # Try querying as string
                str_result = self.supabase.table('players').select('*').eq('nba_player_id', str(test_id)).execute()
                print(f"Query as string '{str(test_id)}': {'✅ Success' if str_result.data else '❌ Failed'}")
                
            else:
                print("❌ No data to check types")
                
        except Exception as e:
            print(f"❌ Error checking data types: {e}")

    def check_table_exists(self):
        """Check if the players table actually exists and is accessible"""
        print(f"\n🔍 Checking Table Existence and Accessibility")
        print("=" * 50)
        
        try:
            # Try a simple count query
            result = self.supabase.table('players').select('player_id', count='exact').execute()
            print(f"✅ Players table exists and is accessible")
            print(f"📊 Total record count: {result.count if hasattr(result, 'count') else len(result.data) if result.data else 0}")
            
        except Exception as e:
            print(f"❌ Error accessing players table: {e}")
            print("This might indicate a table name or permissions issue")

    def run_full_debug(self):
        """Run all debugging checks"""
        self.check_table_exists()
        self.check_players_table_structure()
        self.test_specific_nba_ids()
        self.check_data_types()
        
        print(f"\n🏁 Debug Analysis Complete!")
        print("If the table exists and has data, but specific NBA IDs aren't found,")
        print("there might be a data type mismatch or the NBA IDs are stored differently.")

def main():
    """Main function"""
    debugger = SupabasePlayersDebugger()
    debugger.run_full_debug()

if __name__ == "__main__":
    main()
