#!/usr/bin/env python3
"""
Z-Score Rank Update Script

This script updates the overall_rank field in both per_game_stats and per_36_stats tables
based on the calculated z-scores for each season. This ensures that database ranks
reflect the same rankings as the frontend z-score calculations.

Usage:
    python update_zscore_ranks.py [options]
    
Options:
    --season SEASON    Update ranks for specific season (e.g., "2024-25")
    --dry-run         Show what would be updated without making changes
    --verbose         Enable verbose logging
"""

import os
import sys
import argparse
import logging
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

# Add the project root to the path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def setup_logging(verbose: bool = False) -> None:
    """Set up logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

def get_supabase_client() -> Client:
    """Initialize and return Supabase client."""
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
    
    if not url or not key:
        raise ValueError("Missing Supabase credentials. Check your environment variables.")
    
    return create_client(url, key)

def get_available_seasons(supabase: Client, table_name: str) -> List[str]:
    """Get all available seasons from the specified table."""
    try:
        # Use a large limit to ensure we get all records, or use pagination
        all_seasons = set()
        limit = 1000
        offset = 0
        
        while True:
            response = supabase.table(table_name).select("season").limit(limit).offset(offset).execute()
            
            if not response.data:
                break
                
            # Add seasons from this batch
            for row in response.data:
                if row['season']:
                    all_seasons.add(row['season'])
            
            # If we got fewer records than the limit, we've reached the end
            if len(response.data) < limit:
                break
                
            offset += limit
        
        if not all_seasons:
            logging.warning(f"No seasons found in {table_name}")
            return []
        
        # Convert to sorted list
        seasons = sorted(list(all_seasons), reverse=True)  # Most recent first
        
        logging.info(f"Found {len(seasons)} seasons in {table_name}: {seasons}")
        return seasons
        
    except Exception as e:
        logging.error(f"Error fetching seasons from {table_name}: {str(e)}")
        return []

def update_ranks_for_season(supabase: Client, table_name: str, season: str, dry_run: bool = False) -> bool:
    """Update ranks for a specific season in the given table."""
    try:
        logging.info(f"Processing {table_name} for season {season}")
        
        # Fetch all players for this season, ordered by z-score (descending)
        response = supabase.table(table_name).select(
            "id, player_id, zscore_total, overall_rank"
        ).eq("season", season).order("zscore_total", desc=True).execute()
        
        if not response.data:
            logging.warning(f"No data found for {table_name} season {season}")
            return True
        
        players = response.data
        logging.info(f"Found {len(players)} players in {table_name} for season {season}")
        
        # Calculate new ranks and prepare updates
        updates = []
        rank_changes = 0
        
        for rank, player in enumerate(players, 1):
            current_rank = player.get('overall_rank')
            new_rank = rank
            
            # Only update if rank has changed
            if current_rank != new_rank:
                updates.append({
                    'id': player['id'],
                    'overall_rank': new_rank
                })
                rank_changes += 1
                
                if logging.getLogger().isEnabledFor(logging.DEBUG):
                    logging.debug(
                        f"Player {player['player_id']}: "
                        f"Rank {current_rank} → {new_rank} "
                        f"(z-score: {player.get('zscore_total', 'N/A')})"
                    )
        
        if not updates:
            logging.info(f"No rank changes needed for {table_name} season {season}")
            return True
        
        logging.info(
            f"Updating {len(updates)} rank changes for {table_name} season {season} "
            f"({rank_changes} players with changed ranks)"
        )
        
        if dry_run:
            logging.info("DRY RUN: Would update ranks but not making actual changes")
            return True
        
        # Perform batch update
        try:
            # Update in batches to avoid potential size limits
            batch_size = 100
            for i in range(0, len(updates), batch_size):
                batch = updates[i:i + batch_size]
                
                # Supabase Python client doesn't support batch upsert like JS,
                # so we'll update each record individually
                for update in batch:
                    supabase.table(table_name).update({
                        'overall_rank': update['overall_rank']
                    }).eq('id', update['id']).execute()
                
                logging.debug(f"Updated batch {i//batch_size + 1} ({len(batch)} records)")
            
            logging.info(f"Successfully updated ranks for {table_name} season {season}")
            return True
            
        except Exception as e:
            logging.error(f"Error updating ranks for {table_name} season {season}: {str(e)}")
            return False
        
    except Exception as e:
        logging.error(f"Error processing {table_name} season {season}: {str(e)}")
        return False

def main():
    """Main function to update z-score ranks."""
    parser = argparse.ArgumentParser(description='Update z-score ranks in database tables')
    parser.add_argument('--season', help='Update ranks for specific season (e.g., "2024-25")')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be updated without making changes')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    setup_logging(args.verbose)
    logging.info("Starting z-score rank update script")
    
    try:
        # Initialize Supabase client
        supabase = get_supabase_client()
        logging.info("Successfully connected to Supabase")
        
        # Define tables to update
        tables = ['per_game_stats', 'per_36_stats']
        
        # Determine seasons to process
        seasons_to_process = []
        if args.season:
            seasons_to_process = [args.season]
            logging.info(f"Processing specific season: {args.season}")
        else:
            # Get all seasons from both tables
            all_seasons = set()
            for table in tables:
                table_seasons = get_available_seasons(supabase, table)
                all_seasons.update(table_seasons)
            
            seasons_to_process = sorted(list(all_seasons), reverse=True)
            logging.info(f"Processing all seasons: {seasons_to_process}")
        
        if not seasons_to_process:
            logging.error("No seasons found to process")
            sys.exit(1)
        
        # Process each table and season
        total_success = 0
        total_operations = len(tables) * len(seasons_to_process)
        
        for table in tables:
            logging.info(f"Processing table: {table}")
            
            for season in seasons_to_process:
                success = update_ranks_for_season(supabase, table, season, args.dry_run)
                if success:
                    total_success += 1
                    logging.info(f"✓ Completed {table} season {season}")
                else:
                    logging.error(f"✗ Failed {table} season {season}")
        
        # Summary
        logging.info(f"Rank update completed: {total_success}/{total_operations} operations successful")
        
        if total_success == total_operations:
            logging.info("All rank updates completed successfully!")
            sys.exit(0)
        else:
            logging.error(f"Some rank updates failed ({total_operations - total_success} failures)")
            sys.exit(1)
            
    except Exception as e:
        logging.error(f"Script failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
