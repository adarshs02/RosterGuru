"""
One-time collection of historical NBA data directly to CSV files
This avoids database issues and creates permanent historical data files
"""

import os
import csv
import logging
from typing import List, Dict
from dotenv import load_dotenv

# Add scripts directory to path
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from nba_api_client import NBAApiClient
from espn_api_client import ESPNFantasyClient
from zscore_calculator import ZScoreCalculator
from config import NBA_API_CONFIG, HISTORICAL_CONFIG

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HistoricalCSVCollector:
    def __init__(self):
        """Initialize API clients"""
        self.nba_client = NBAApiClient()
        self.espn_client = ESPNFantasyClient()
        self.zscore_calc = ZScoreCalculator()
        
        # Create organized directory structure
        self.base_dir = '/Users/adarsh/RosterGuru/historical_stats'
        self.per_game_dir = os.path.join(self.base_dir, 'per_game')
        self.per_36_dir = os.path.join(self.base_dir, 'per_36')
        self.total_dir = os.path.join(self.base_dir, 'total')
        
        # Ensure all directories exist
        for directory in [self.per_game_dir, self.per_36_dir, self.total_dir]:
            os.makedirs(directory, exist_ok=True)
        
        # Get ESPN positions once (current rosters)
        logger.info("Fetching current ESPN player positions...")
        espn_players = self.espn_client.get_players_with_positions()
        # Convert to name -> positions mapping
        self.espn_positions = {}
        for player in espn_players:
            self.espn_positions[player['player_name']] = player['positions']
        logger.info(f"Retrieved positions for {len(self.espn_positions)} players")
    
    def enhance_players_with_positions(self, players_data: List[Dict]) -> List[Dict]:
        """Add ESPN positions to player data"""
        enhanced_players = []
        
        for player in players_data:
            enhanced_player = player.copy()
            player_name = player['player_name']
            
            if player_name in self.espn_positions:
                enhanced_player['position'] = ','.join(self.espn_positions[player_name])
            else:
                enhanced_player['position'] = 'F'  # Default position
            
            enhanced_players.append(enhanced_player)
        
        return enhanced_players
    
    def add_overall_ranking(self, stats_with_zscores: List[Dict]) -> List[Dict]:
        """Add overall ranking based on zscore_total"""
        if not stats_with_zscores:
            return stats_with_zscores
        
        # Sort players by zscore_total in descending order (higher z-score = better rank)
        sorted_stats = sorted(stats_with_zscores, key=lambda x: x.get('zscore_total', 0), reverse=True)
        
        # Add rank (1-based)
        for rank, player_stats in enumerate(sorted_stats, 1):
            player_stats['overall_rank'] = rank
        
        # Return in original order (by nba_player_id for consistency)
        return sorted(sorted_stats, key=lambda x: x.get('nba_player_id', 0))
    
    def add_per_game_ranking_to_total(self, total_stats: List[Dict], per_game_with_ranks: List[Dict]) -> List[Dict]:
        """Copy overall_rank from per-game stats to total stats for matching players"""
        if not total_stats or not per_game_with_ranks:
            return total_stats
        
        # Create a mapping from nba_player_id to overall_rank from per-game stats
        rank_mapping = {}
        for per_game_player in per_game_with_ranks:
            rank_mapping[per_game_player['nba_player_id']] = per_game_player.get('overall_rank', None)
        
        # Add overall_rank to total stats based on per-game ranking
        for total_player in total_stats:
            player_id = total_player['nba_player_id']
            total_player['overall_rank'] = rank_mapping.get(player_id, None)
        
        return total_stats
    
    def collect_season_data(self, season: str) -> Dict:
        """Collect all data for a season"""
        logger.info(f"Collecting data for season {season}")
        
        try:
            # Get players list
            players_data = self.nba_client.get_players_list(season)
            logger.info(f"Retrieved {len(players_data)} players")
            
            # Enhance with ESPN positions
            enhanced_players = self.enhance_players_with_positions(players_data)
            
            # Get stats data
            per_game_stats = self.nba_client.get_player_stats(season)
            per_36_stats = self.nba_client.get_per_36_stats(season, apply_filters=False)
            total_stats = self.nba_client.get_total_stats(season, apply_filters=False)
            
            # Filter stats to only qualified players (based on per-game stats)
            qualified_player_ids = set(p['nba_player_id'] for p in per_game_stats)
            per_36_stats = [s for s in per_36_stats if s['nba_player_id'] in qualified_player_ids]
            total_stats = [s for s in total_stats if s['nba_player_id'] in qualified_player_ids]
            
            logger.info(f"Qualified players - Per Game: {len(per_game_stats)}, Per 36: {len(per_36_stats)}, Total: {len(total_stats)}")
            
            # Calculate z-scores for per-game and per-36 stats
            per_game_with_zscores = self.zscore_calc.calculate_zscores(per_game_stats)
            per_36_with_zscores = self.zscore_calc.calculate_zscores(per_36_stats)
            
            # Add overall ranking based on z-score totals
            per_game_with_ranks = self.add_overall_ranking(per_game_with_zscores)
            per_36_with_ranks = self.add_overall_ranking(per_36_with_zscores)
            
            # For total stats, copy the rank from per-game stats (no z-scores needed)
            total_with_ranks = self.add_per_game_ranking_to_total(total_stats, per_game_with_ranks)
            
            return {
                'players': enhanced_players,
                'per_game_stats': per_game_with_ranks,
                'per_36_stats': per_36_with_ranks,
                'total_stats': total_with_ranks
            }
            
        except Exception as e:
            logger.error(f"Failed to collect data for season {season}: {e}")
            return None
    
    def save_to_csv(self, data: List[Dict], filename: str, target_dir: str):
        """Save data to CSV file in the specified directory"""
        if not data:
            logger.warning(f"No data to save for {filename}")
            return
        
        filepath = os.path.join(target_dir, filename)
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = data[0].keys()
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        
        logger.info(f"Saved {len(data)} records to {filepath}")
    
    def collect_and_save_season(self, season: str):
        """Collect and save all data for a season"""
        logger.info(f"Processing season {season}")
        
        data = self.collect_season_data(season)
        if not data:
            logger.error(f"Failed to collect data for season {season}")
            return
        
        # Save each data type to CSV in organized subdirectories
        season_file = season.replace('-', '_')
        
        # Save players data to all directories (needed for joins)
        self.save_to_csv(data['players'], f'players_{season_file}.csv', self.per_game_dir)
        self.save_to_csv(data['players'], f'players_{season_file}.csv', self.per_36_dir)
        self.save_to_csv(data['players'], f'players_{season_file}.csv', self.total_dir)
        
        # Save stats to appropriate subdirectories
        self.save_to_csv(data['per_game_stats'], f'per_game_stats_{season_file}.csv', self.per_game_dir)
        self.save_to_csv(data['per_36_stats'], f'per_36_stats_{season_file}.csv', self.per_36_dir)
        self.save_to_csv(data['total_stats'], f'total_stats_{season_file}.csv', self.total_dir)
        
        # Also save z-score files to appropriate directories
        if data['per_game_stats']:
            zscore_per_game = [{k: v for k, v in row.items() if k.startswith('zscore_') or k in ['nba_player_id', 'player_name', 'season']} for row in data['per_game_stats']]
            self.save_to_csv(zscore_per_game, f'zscores_per_game_{season_file}.csv', self.per_game_dir)
        
        if data['per_36_stats']:
            zscore_per_36 = [{k: v for k, v in row.items() if k.startswith('zscore_') or k in ['nba_player_id', 'player_name', 'season']} for row in data['per_36_stats']]
            self.save_to_csv(zscore_per_36, f'zscores_per_36_{season_file}.csv', self.per_36_dir)
            
        logger.info(f"Completed processing season {season}")
    
    def collect_all_historical_seasons(self):
        """Collect data for all historical seasons"""
        seasons = HISTORICAL_CONFIG['seasons_to_collect']
        logger.info(f"Collecting data for {len(seasons)} seasons: {seasons}")
        
        for season in seasons:
            try:
                self.collect_and_save_season(season)
            except Exception as e:
                logger.error(f"Failed to process season {season}: {e}")
                continue
        
        logger.info("Historical data collection completed")

def main():
    """Main function"""
    collector = HistoricalCSVCollector()
    
    # Collect all historical seasons
    collector.collect_all_historical_seasons()

if __name__ == "__main__":
    main()
