"""
CSV output module for NBA stats data
"""

import os
import csv
import pandas as pd
import logging
from typing import Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)

class CSVOutputManager:
    """Handles CSV file output for NBA stats data"""
    
    def __init__(self, base_dir: str = "/Users/adarsh/RosterGuru/data"):
        self.base_dir = base_dir
        self.ensure_directory_exists()
    
    def ensure_directory_exists(self):
        """Create the data directory if it doesn't exist"""
        os.makedirs(self.base_dir, exist_ok=True)
        logger.info(f"Data directory ensured: {self.base_dir}")
    
    def save_players_csv(self, players_data: List[Dict], season: str):
        """Save players data to CSV"""
        if not players_data:
            logger.warning("No players data to save")
            return
        
        filename = f"players_{season}.csv"
        filepath = os.path.join(self.base_dir, filename)
        
        try:
            df = pd.DataFrame(players_data)
            df.to_csv(filepath, index=False)
            logger.info(f"Saved {len(players_data)} players to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save players CSV: {e}")
            raise
    
    def save_per_game_stats_csv(self, stats_data: List[Dict], season: str):
        """Save per-game stats to CSV"""
        if not stats_data:
            logger.warning("No per-game stats data to save")
            return
        
        filename = f"per_game_stats_{season}.csv"
        filepath = os.path.join(self.base_dir, filename)
        
        try:
            df = pd.DataFrame(stats_data)
            # Add season column
            df['season'] = season
            df.to_csv(filepath, index=False)
            logger.info(f"Saved {len(stats_data)} per-game stats to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save per-game stats CSV: {e}")
            raise
    
    def save_per_36_stats_csv(self, stats_data: List[Dict], season: str):
        """Save per-36 stats to CSV"""
        if not stats_data:
            logger.warning("No per-36 stats data to save")
            return
        
        filename = f"per_36_stats_{season}.csv"
        filepath = os.path.join(self.base_dir, filename)
        
        try:
            df = pd.DataFrame(stats_data)
            # Add season column
            df['season'] = season
            df.to_csv(filepath, index=False)
            logger.info(f"Saved {len(stats_data)} per-36 stats to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save per-36 stats CSV: {e}")
            raise
    
    def save_total_stats_csv(self, stats_data: List[Dict], season: str):
        """Save total stats to CSV"""
        if not stats_data:
            logger.warning("No total stats data to save")
            return
        
        filename = f"total_stats_{season}.csv"
        filepath = os.path.join(self.base_dir, filename)
        
        try:
            df = pd.DataFrame(stats_data)
            # Add season column
            df['season'] = season
            df.to_csv(filepath, index=False)
            logger.info(f"Saved {len(stats_data)} total stats to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save total stats CSV: {e}")
            raise
    
    def save_zscores_csv(self, zscores_data: List[Dict], season: str, stat_type: str):
        """Save z-scores data to CSV"""
        if not zscores_data:
            logger.warning(f"No z-scores data to save for {stat_type}")
            return
        
        filename = f"zscores_{stat_type}_{season}.csv"
        filepath = os.path.join(self.base_dir, filename)
        
        try:
            df = pd.DataFrame(zscores_data)
            df.to_csv(filepath, index=False)
            logger.info(f"Saved {len(zscores_data)} z-scores ({stat_type}) to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save z-scores CSV: {e}")
            raise
    
    def save_summary_report(self, season: str, stats_summary: Dict):
        """Save a summary report of the data collection"""
        filename = f"collection_summary_{season}.txt"
        filepath = os.path.join(self.base_dir, filename)
        
        try:
            with open(filepath, 'w') as f:
                f.write(f"NBA Data Collection Summary - Season {season}\n")
                f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("=" * 50 + "\n\n")
                
                for key, value in stats_summary.items():
                    f.write(f"{key}: {value}\n")
                
                f.write(f"\nFiles created in: {self.base_dir}\n")
            
            logger.info(f"Saved collection summary to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save summary report: {e}")
            raise
    
    def list_output_files(self) -> List[str]:
        """List all CSV files in the output directory"""
        try:
            files = [f for f in os.listdir(self.base_dir) if f.endswith('.csv')]
            return sorted(files)
        except Exception as e:
            logger.error(f"Failed to list output files: {e}")
            return []
