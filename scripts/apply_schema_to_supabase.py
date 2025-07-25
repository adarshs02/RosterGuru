#!/usr/bin/env python3
"""
Connect to Supabase and test the NBA stats database setup
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

def print_schema_instructions():
    """
    Print instructions for applying the schema to Supabase
    """
    print("📋 SCHEMA APPLICATION INSTRUCTIONS")
    print("=" * 50)
    print("\n1. 🌐 Go to your Supabase Dashboard:")
    print("   https://app.supabase.com/project/[your-project-id]/sql")
    
    print("\n2. 📝 Copy the SQL schema:")
    schema_path = os.path.join(os.path.dirname(__file__), 'database_schema.sql')
    print(f"   File: {schema_path}")
    
    print("\n3. ▶️ Execute in Supabase SQL Editor:")
    print("   - Paste the entire schema content")
    print("   - Click 'Run' to execute")
    print("   - Ignore 'already exists' errors (they're normal)")
    
    print("\n4. ✅ Verify tables were created:")
    print("   - Check Table Editor for: players, per_game_stats, per_36_stats, total_stats")
    print("   - Verify RLS is enabled on all tables")
    
    print("\n" + "=" * 50)

def test_supabase_connection():
    """
    Test connection to Supabase and verify table access
    """
    print("🔍 TESTING SUPABASE CONNECTION")
    print("=" * 50)
    
    # Initialize Supabase client
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY")
    
    if not url or not service_key:
        print("❌ Error: Missing Supabase credentials")
        print("   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_KEY are set in .env")
        return False
    
    try:
        supabase: Client = create_client(url, service_key)
        print("✅ Connected to Supabase successfully")
        print(f"   URL: {url}")
        
        return test_tables(supabase)
        
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        return False

def test_tables(supabase: Client):
    """
    Test access to all required tables
    """
    print(f"\n📏 Testing table access...")
    
    test_tables = [
        ('players', ['player_id', 'player_name', 'position']),
        ('per_game_stats', ['player_id', 'season', 'points', 'zscore_total', 'overall_rank']),
        ('per_36_stats', ['player_id', 'season', 'points', 'zscore_total', 'overall_rank']),
        ('total_stats', ['player_id', 'season', 'total_points', 'overall_rank'])
    ]
    
    all_success = True
    
    for table_name, expected_columns in test_tables:
        try:
            # Test basic table access
            result = supabase.table(table_name).select("*").limit(1).execute()
            
            # Check if we got data structure back (even if empty)
            if hasattr(result, 'data'):
                print(f"   ✅ {table_name}: Accessible (contains {len(result.data)} records)")
                
                # Test specific column access if table has data
                if result.data:
                    available_columns = list(result.data[0].keys())
                    missing_columns = [col for col in expected_columns if col not in available_columns]
                    
                    if missing_columns:
                        print(f"      ⚠️  Missing columns: {missing_columns}")
                    else:
                        print(f"      ✅ All expected columns present")
                else:
                    print(f"      📄 Table is empty (will test columns after data import)")
            else:
                print(f"   ❌ {table_name}: Unexpected response structure")
                all_success = False
                
        except Exception as e:
            print(f"   ❌ {table_name}: Error - {e}")
            all_success = False
    
    return all_success

def main():
    print("🏀 NBA Stats Database - Supabase Integration")
    print("=" * 60)
    
    # Print schema application instructions
    print_schema_instructions()
    
    # Test the connection
    connection_success = test_supabase_connection()
    
    if connection_success:
        print(f"\n🎉 Supabase integration test completed successfully!")
        print(f"\n📚 Next steps:")
        print(f"   1. Apply the schema using the instructions above")
        print(f"   2. Run the data import pipeline to populate tables")
        print(f"   3. Test frontend integration")
    else:
        print(f"\n❌ Supabase integration test failed")
        print(f"   Please check your credentials and table setup")

if __name__ == "__main__":
    main()
