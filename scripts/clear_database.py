"""
Clear all existing data from Supabase database tables
This prepares the database for a fresh import of historical CSV data
"""

import os
import logging
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseCleaner:
    def __init__(self):
        """Initialize Supabase client"""
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
        self.client = create_client(self.supabase_url, self.supabase_key)
    
    def get_table_count(self, table_name: str) -> int:
        """Get the current record count for a table"""
        try:
            result = self.client.table(table_name).select('*', count='exact').execute()
            return result.count
        except Exception as e:
            logger.error(f"Failed to get count for {table_name}: {e}")
            return 0
    
    def clear_table(self, table_name: str):
        """Clear all data from a specific table"""
        try:
            # Get current count
            current_count = self.get_table_count(table_name)
            logger.info(f"Current {table_name} records: {current_count}")
            
            if current_count == 0:
                logger.info(f"Table {table_name} is already empty")
                return
            
            # Delete all records
            # Note: Supabase requires a filter, so we use a condition that matches all records
            # Since we're using UUID primary keys, we need to use a proper UUID format
            if table_name == 'players':
                result = self.client.table(table_name).delete().neq('player_id', '00000000-0000-0000-0000-000000000000').execute()
            else:
                result = self.client.table(table_name).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            
            # Verify deletion
            new_count = self.get_table_count(table_name)
            deleted_count = current_count - new_count
            
            logger.info(f"Deleted {deleted_count} records from {table_name} (remaining: {new_count})")
            
        except Exception as e:
            logger.error(f"Failed to clear table {table_name}: {e}")
    
    def clear_all_stats_tables(self):
        """Clear all stats tables (but preserve players table structure)"""
        stats_tables = [
            'per_game_stats',
            'per_36_stats', 
            'total_stats'
        ]
        
        logger.info("Clearing all stats tables...")
        
        for table in stats_tables:
            self.clear_table(table)
        
        logger.info("Completed clearing stats tables")
    
    def clear_players_table(self):
        """Clear players table"""
        logger.info("Clearing players table...")
        self.clear_table('players')
        logger.info("Completed clearing players table")
    
    def clear_all_tables(self):
        """Clear all data tables"""
        logger.info("Starting complete database cleanup...")
        
        # Clear stats tables first (due to foreign key constraints)
        self.clear_all_stats_tables()
        
        # Then clear players table
        self.clear_players_table()
        
        logger.info("Database cleanup completed successfully")
    
    def show_database_status(self):
        """Show current status of all tables"""
        tables = ['players', 'per_game_stats', 'per_36_stats', 'total_stats']
        
        logger.info("Current database status:")
        for table in tables:
            count = self.get_table_count(table)
            logger.info(f"  {table}: {count} records")

def main():
    """Main function"""
    cleaner = DatabaseCleaner()
    
    # Show current status
    logger.info("=== BEFORE CLEANUP ===")
    cleaner.show_database_status()
    
    # Ask for confirmation (in production, you might want to add input confirmation)
    logger.warning("This will DELETE ALL DATA from the database!")
    logger.warning("Make sure you have CSV backups before proceeding.")
    
    # Clear all tables
    cleaner.clear_all_tables()
    
    # Show final status
    logger.info("=== AFTER CLEANUP ===")
    cleaner.show_database_status()
    
    logger.info("Database is now ready for fresh CSV import")

if __name__ == "__main__":
    main()
