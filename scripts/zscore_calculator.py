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
            
            # Use impact-weighted calculation for shooting percentages
            if category in ['field_goal_percentage', 'free_throw_percentage']:
                df[f'zscore_{category}'] = self._calculate_impact_weighted_zscore(df, category)
            else:
                # Standard z-score calculation for other stats
                # Handle null values
                values = df[category].fillna(0)
                
                # Calculate mean and standard deviation from top 40%
                if category in self.negative_categories:
                    # For negative categories, lower is better. "Top" is the bottom 30%.
                    cutoff = values.quantile(0.4)
                    top_performers = values[values <= cutoff]
                    if len(top_performers) > 1:  # Need at least 2 for std dev
                        mean_val = top_performers.mean()
                        std_val = top_performers.std()
                    else:
                        mean_val = values.mean()  # Fallback to overall mean
                        std_val = values.std()    # Fallback to overall std dev
                else:
                    # For positive categories, higher is better. "Top" is the top 40%.
                    cutoff = values.quantile(0.60) # gets top 45% of values
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
                    
                    df[f'zscore_{category}'] = z_scores
        
        # Manual inversion for turnovers (after standard calculation)
        if 'zscore_turnovers' in df.columns:
            df['zscore_turnovers'] = df['zscore_turnovers'] * -1
        
        # Calculate composite Z-score
        df['zscore_total'] = self._calculate_composite_zscore(df)
        
        # Convert back to list of dictionaries
        result = df.to_dict('records')
        
        logger.info(f"Calculated Z-scores for {len(result)} players")
        return result
    
    def _calculate_impact_weighted_zscore(self, df: pd.DataFrame, category: str) -> pd.Series:
        """Calculate impact-weighted z-score for shooting percentages
        Formula: impact = (player% - mean%) × attempts_per_game
        Then z-score = impact / σ_impact
        """
        # Map category to attempts column
        attempts_column = {
            'field_goal_percentage': 'field_goals_attempted',
            'free_throw_percentage': 'free_throws_attempted'
        }.get(category)
        
        if not attempts_column or attempts_column not in df.columns:
            logger.warning(f"Attempts column {attempts_column} not found for {category}, using standard z-score")
            # Fallback to standard calculation
            values = df[category].fillna(0)
            if values.std() == 0:
                return pd.Series(0, index=df.index)
            return (values - values.mean()) / values.std()
        
        # Filter valid players (with attempts and valid percentages)
        valid_mask = (df[attempts_column] > 0) & (df[category] > 0) & df[category].notna() & df[attempts_column].notna()
        valid_df = df[valid_mask]
        
        if len(valid_df) == 0:
            logger.warning(f"No valid players found for {category}")
            return pd.Series(0, index=df.index)
        
        # Calculate league mean percentage
        mean_percentage = valid_df[category].mean()
        
        # Calculate impact for all valid players
        impacts = (valid_df[category] - mean_percentage) * valid_df[attempts_column]
        
        # Calculate standard deviation of impacts
        if impacts.std() == 0:
            logger.warning(f"Standard deviation of impacts is 0 for {category}")
            return pd.Series(0, index=df.index)
        
        mean_impact = impacts.mean()
        std_impact = impacts.std()
        
        # Calculate z-scores for all players
        result = pd.Series(0.0, index=df.index)
        
        for idx in df.index:
            if idx in valid_df.index:
                player_percentage = df.loc[idx, category]
                player_attempts = df.loc[idx, attempts_column]
                player_impact = (player_percentage - mean_percentage) * player_attempts
                result.loc[idx] = (player_impact - mean_impact) / std_impact
            else:
                # Players with no attempts get 0 z-score
                result.loc[idx] = 0.0
        
        logger.info(f"Calculated impact-weighted z-scores for {category}: {len(valid_df)} valid players")
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
