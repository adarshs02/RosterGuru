"""
Z-Score calculation module for NBA player statistics
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Optional
from config import ZSCORE_CONFIG

logger = logging.getLogger(__name__)

class ZScoreCalculator:
    """Calculate Z-scores for NBA player statistics"""
    
    def __init__(self, config: Dict = None):
        self.config = config or ZSCORE_CONFIG
        self.categories = self.config['categories']
        self.negative_categories = self.config['negative_categories']
        self.weights = self.config['weights']
        self.min_sample_size = 20  # Default minimum sample size
    
    def calculate_zscores(self, player_stats: List[Dict]) -> List[Dict]:
        """Calculate Z-scores for all players in the dataset"""
        if len(player_stats) < self.min_sample_size:
            logger.warning(f"Sample size {len(player_stats)} is below minimum {self.min_sample_size}")
            return player_stats
        
        # Convert to DataFrame for easier calculations
        df = pd.DataFrame(player_stats)
        
        # Calculate Z-scores for each category
        for category in self.categories:
            if category not in df.columns:
                logger.warning(f"Category {category} not found in data")
                continue
            
            # Handle null values
            values = df[category].fillna(0)
            
            # Calculate mean and standard deviation from top 30%
            if category in self.negative_categories:
                # For negative categories, lower is better. "Top" is the bottom 30%.
                cutoff = values.quantile(0.3)
                top_performers = values[values <= cutoff]
                if len(top_performers) > 1:  # Need at least 2 for std dev
                    mean_val = top_performers.mean()
                    std_val = top_performers.std()
                else:
                    mean_val = values.mean()  # Fallback to overall mean
                    std_val = values.std()    # Fallback to overall std dev
            else:
                # For positive categories, higher is better. "Top" is the top 30%.
                cutoff = values.quantile(0.7)
                top_performers = values[values >= cutoff]
                if len(top_performers) > 1:  # Need at least 2 for std dev
                    mean_val = top_performers.mean()
                    std_val = top_performers.std()
                else:
                    mean_val = values.mean()  # Fallback to overall mean
                    std_val = values.std()    # Fallback to overall std dev
            
            if std_val == 0:
                logger.warning(f"Standard deviation is 0 for {category}, setting Z-scores to 0")
                df[f'zscore_{category}'] = 0
            else:
                # Calculate Z-score
                z_scores = (values - mean_val) / std_val
                
                # Invert Z-scores for negative categories (like turnovers)
                if category in self.negative_categories:
                    z_scores = -z_scores
                
                df[f'zscore_{category}'] = z_scores
        
        # Calculate composite Z-score
        df['zscore_total'] = self._calculate_composite_zscore(df)
        
        # Convert back to list of dictionaries
        result = df.to_dict('records')
        
        logger.info(f"Calculated Z-scores for {len(result)} players")
        return result
    
    def _calculate_composite_zscore(self, df: pd.DataFrame) -> pd.Series:
        """Calculate weighted composite Z-score"""
        composite_scores = pd.Series(0.0, index=df.index)
        total_weight = 0
        
        for category in self.categories:
            zscore_col = f'zscore_{category}'
            if zscore_col in df.columns and category in self.weights:
                weight = abs(self.weights[category])  # Use absolute weight for calculation
                composite_scores += df[zscore_col] * weight
                total_weight += weight
        
        if total_weight > 0:
            composite_scores = composite_scores / total_weight
        
        return composite_scores
    
    def get_category_rankings(self, player_stats: List[Dict], category: str) -> List[Dict]:
        """Get player rankings for a specific category"""
        if not player_stats:
            return []
        
        zscore_col = f'zscore_{category}'
        
        # Sort by Z-score (descending)
        sorted_stats = sorted(
            player_stats, 
            key=lambda x: x.get(zscore_col, 0), 
            reverse=True
        )
        
        # Add rankings
        for i, player in enumerate(sorted_stats):
            player[f'{category}_rank'] = i + 1
        
        return sorted_stats
    
    def get_overall_rankings(self, player_stats: List[Dict]) -> List[Dict]:
        """Get overall player rankings based on composite Z-score"""
        if not player_stats:
            return []
        
        # Sort by total Z-score (descending)
        sorted_stats = sorted(
            player_stats, 
            key=lambda x: x.get('zscore_total', 0), 
            reverse=True
        )
        
        # Add overall rankings
        for i, player in enumerate(sorted_stats):
            player['overall_rank'] = i + 1
        
        return sorted_stats
    
    def get_position_rankings(self, player_stats: List[Dict], position: str) -> List[Dict]:
        """Get rankings within a specific position"""
        if not player_stats:
            return []
        
        # Filter by position
        position_players = [
            player for player in player_stats 
            if player.get('position', '').upper() == position.upper()
        ]
        
        if not position_players:
            return []
        
        # Sort by total Z-score (descending)
        sorted_stats = sorted(
            position_players, 
            key=lambda x: x.get('zscore_total', 0), 
            reverse=True
        )
        
        # Add position rankings
        for i, player in enumerate(sorted_stats):
            player[f'{position.lower()}_rank'] = i + 1
        
        return sorted_stats
    
    def calculate_percentiles(self, player_stats: List[Dict]) -> List[Dict]:
        """Calculate percentiles for each Z-score category"""
        if not player_stats:
            return []
        
        df = pd.DataFrame(player_stats)
        
        for category in self.categories:
            zscore_col = f'zscore_{category}'
            if zscore_col in df.columns:
                percentiles = df[zscore_col].rank(pct=True) * 100
                df[f'{category}_percentile'] = percentiles.round(1)
        
        # Overall percentile
        if 'zscore_total' in df.columns:
            df['overall_percentile'] = (df['zscore_total'].rank(pct=True) * 100).round(1)
        
        return df.to_dict('records')
    
    def get_statistical_summary(self, player_stats: List[Dict]) -> Dict:
        """Get statistical summary of the dataset"""
        if not player_stats:
            return {}
        
        df = pd.DataFrame(player_stats)
        summary = {
            'total_players': len(df),
            'categories': {}
        }
        
        for category in self.categories:
            if category in df.columns:
                values = df[category].fillna(0)
                summary['categories'][category] = {
                    'mean': float(values.mean()),
                    'std': float(values.std()),
                    'min': float(values.min()),
                    'max': float(values.max()),
                    'median': float(values.median())
                }
        
        # Z-score summary
        if 'zscore_total' in df.columns:
            zscore_values = df['zscore_total'].fillna(0)
            summary['zscore_summary'] = {
                'mean': float(zscore_values.mean()),
                'std': float(zscore_values.std()),
                'min': float(zscore_values.min()),
                'max': float(zscore_values.max()),
                'top_10_threshold': float(zscore_values.quantile(0.9))
            }
        
        return summary
