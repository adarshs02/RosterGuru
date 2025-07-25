"""
Fix per-36 CSV files to show 36.0 minutes instead of total season minutes
"""

import os
import csv
import logging
from typing import List, Dict

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_per36_csv(filename: str, data_dir: str = '../data'):
    """Fix a single per-36 CSV file to show 36.0 minutes"""
    try:
        filepath = os.path.join(data_dir, filename)
        
        if not os.path.exists(filepath):
            logger.warning(f"File not found: {filepath}")
            return
        
        # Read the CSV data
        rows = []
        with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            fieldnames = reader.fieldnames
            
            for row in reader:
                # Fix the minutes_played column to be 36.0
                if 'minutes_played' in row:
                    row['minutes_played'] = '36.0'
                rows.append(row)
        
        # Write back the fixed data
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        
        logger.info(f"Fixed {len(rows)} records in {filename}")
        
    except Exception as e:
        logger.error(f"Failed to fix {filename}: {e}")

def main():
    """Fix all per-36 CSV files"""
    logger.info("Fixing per-36 CSV files to show 36.0 minutes...")
    
    # Get all per-36 CSV files from the main data directory
    data_dir = '../data'
    if not os.path.exists(data_dir):
        logger.error(f"Data directory {data_dir} not found")
        return
    
    per36_files = [f for f in os.listdir(data_dir) if f.startswith('per_36_stats_') and f.endswith('.csv')]
    
    logger.info(f"Found {len(per36_files)} per-36 CSV files to fix")
    
    for filename in sorted(per36_files):
        fix_per36_csv(filename, data_dir)
    
    logger.info("Completed fixing all per-36 CSV files")

if __name__ == "__main__":
    main()
