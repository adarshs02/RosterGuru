"""
NBA API client for fetching player statistics
"""

import requests
import time
import logging
from typing import Dict, List, Optional
from config import NBA_API_CONFIG, PLAYER_FILTERS

logger = logging.getLogger(__name__)

class NBAApiClient:
    """Client for interacting with NBA stats API"""
    
    BASE_URL = "https://stats.nba.com/stats"
    
    def __init__(self, config: Dict = None):
        self.config = config or NBA_API_CONFIG
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.nba.com/',
            'x-nba-stats-origin': 'stats',
            'x-nba-stats-token': 'true'
        })
    
    def _make_request(self, endpoint: str, params: Dict) -> Dict:
        """Make API request with rate limiting and error handling"""
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            # Rate limiting
            time.sleep(self.config['rate_limit_delay'])
            
            response = self.session.get(
                url, 
                params=params, 
                timeout=self.config['timeout']
            )
            response.raise_for_status()
            
            data = response.json()
            logger.debug(f"Successfully fetched data from {endpoint}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed for {endpoint}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for {endpoint}: {e}")
            raise
    
    def get_players_list(self, season: str) -> List[Dict]:
        """Get list of all players for a season"""
        endpoint = "commonallplayers"
        params = {
            'LeagueID': '00',
            'Season': season,
            'IsOnlyCurrentSeason': '0'  # Get all players who played in this season, not just currently active
        }
        
        try:
            data = self._make_request(endpoint, params)
            
            # Parse the response
            headers = data['resultSets'][0]['headers']
            rows = data['resultSets'][0]['rowSet']
            
            players = []
            for row in rows:
                player_dict = dict(zip(headers, row))
                players.append({
                    'nba_player_id': player_dict['PERSON_ID'],
                    'player_name': player_dict['DISPLAY_FIRST_LAST'],
                    'team_abbreviation': player_dict.get('TEAM_ABBREVIATION', ''),
                    'is_active': player_dict.get('IS_ACTIVE', True)
                })
            
            logger.info(f"Retrieved {len(players)} players for season {season}")
            return players
            
        except Exception as e:
            logger.error(f"Failed to get players list: {e}")
            raise
    
    def get_advanced_stats(self, season: str, per_mode: str = 'PerGame', season_type: str = "Regular Season") -> Dict[int, Dict]:
        """Get advanced statistics (TS%, US%, etc.) for all players in a season"""
        endpoint = "leaguedashplayerstats"
        params = {
            'College': '',
            'Conference': '',
            'Country': '',
            'DateFrom': '',
            'DateTo': '',
            'Division': '',
            'DraftPick': '',
            'DraftYear': '',
            'GameScope': '',
            'GameSegment': '',
            'Height': '',
            'LastNGames': '0',
            'LeagueID': '00',
            'Location': '',
            'MeasureType': 'Advanced',  # Key difference - Advanced stats
            'Month': '0',
            'OpponentTeamID': '0',
            'Outcome': '',
            'PORound': '0',
            'PaceAdjust': 'N',
            'PerMode': per_mode,
            'Period': '0',
            'PlayerExperience': '',
            'PlayerPosition': '',
            'PlusMinus': 'N',
            'Rank': 'N',
            'Season': season,
            'SeasonSegment': '',
            'SeasonType': season_type,
            'ShotClockRange': '',
            'StarterBench': '',
            'TeamID': '0',
            'TwoWay': '0',
            'VsConference': '',
            'VsDivision': '',
            'Weight': ''
        }
        
        try:
            data = self._make_request(endpoint, params)
            
            # Parse the response
            headers = data['resultSets'][0]['headers']
            rows = data['resultSets'][0]['rowSet']
            
            # Create a mapping of player_id -> advanced stats
            advanced_stats_map = {}
            for row in rows:
                stat_dict = dict(zip(headers, row))
                player_id = stat_dict.get('PLAYER_ID')
                
                advanced_stats_map[player_id] = {
                    'true_shooting_percentage': stat_dict.get('TS_PCT', 0.0),
                    'usage_percentage': stat_dict.get('USG_PCT', 0.0)
                }
            
            logger.info(f"Retrieved advanced stats for {len(advanced_stats_map)} players for season {season}")
            return advanced_stats_map
            
        except Exception as e:
            logger.error(f"Failed to get advanced stats: {e}")
            return {}
    
    def get_player_stats(self, season: str, season_type: str = "Regular Season") -> List[Dict]:
        """Get player statistics for a season with advanced stats merged"""
        # First, get advanced stats
        advanced_stats_map = self.get_advanced_stats(season, 'PerGame', season_type)
        
        endpoint = "leaguedashplayerstats"
        params = {
            'College': '',
            'Conference': '',
            'Country': '',
            'DateFrom': '',
            'DateTo': '',
            'Division': '',
            'DraftPick': '',
            'DraftYear': '',
            'GameScope': '',
            'GameSegment': '',
            'Height': '',
            'LastNGames': '0',
            'LeagueID': '00',
            'Location': '',
            'MeasureType': 'Base',
            'Month': '0',
            'OpponentTeamID': '0',
            'Outcome': '',
            'PORound': '0',
            'PaceAdjust': 'N',
            'PerMode': 'PerGame',
            'Period': '0',
            'PlayerExperience': '',
            'PlayerPosition': '',
            'PlusMinus': 'N',
            'Rank': 'N',
            'Season': season,
            'SeasonSegment': '',
            'SeasonType': season_type,
            'ShotClockRange': '',
            'StarterBench': '',
            'TeamID': '0',
            'TwoWay': '0',
            'VsConference': '',
            'VsDivision': '',
            'Weight': ''
        }
        
        try:
            data = self._make_request(endpoint, params)
            
            # Parse the response
            headers = data['resultSets'][0]['headers']
            rows = data['resultSets'][0]['rowSet']
            
            stats = []
            for row in rows:
                stat_dict = dict(zip(headers, row))
                
                # Apply filters
                if (stat_dict.get('GP', 0) < PLAYER_FILTERS['min_games_played'] or 
                    stat_dict.get('MIN', 0.0) < PLAYER_FILTERS['min_minutes_per_game']):
                    continue
                
                player_id = stat_dict.get('PLAYER_ID')
                advanced_stats = advanced_stats_map.get(player_id, {})
                
                stats.append({
                    'nba_player_id': player_id,
                    'player_name': stat_dict.get('PLAYER_NAME', ''),
                    'team_abbreviation': stat_dict.get('TEAM_ABBREVIATION', ''),
                    'games_played': stat_dict.get('GP', 0),
                    'games_started': stat_dict.get('GS', 0),
                    'minutes_per_game': round(stat_dict.get('MIN', 0.0), 2),
                    'points': stat_dict.get('PTS', 0.0),
                    'field_goals_made': stat_dict.get('FGM', 0.0),
                    'field_goals_attempted': stat_dict.get('FGA', 0.0),
                    'field_goal_percentage': stat_dict.get('FG_PCT', 0.0),
                    'three_pointers_made': stat_dict.get('FG3M', 0.0),
                    'three_pointers_attempted': stat_dict.get('FG3A', 0.0),
                    'three_point_percentage': stat_dict.get('FG3_PCT', 0.0),
                    'free_throws_made': stat_dict.get('FTM', 0.0),
                    'free_throws_attempted': stat_dict.get('FTA', 0.0),
                    'free_throw_percentage': stat_dict.get('FT_PCT', 0.0),
                    'true_shooting_percentage': advanced_stats.get('true_shooting_percentage', 0.0),
                    'usage_percentage': advanced_stats.get('usage_percentage', 0.0),
                    'offensive_rebounds': stat_dict.get('OREB', 0.0),
                    'defensive_rebounds': stat_dict.get('DREB', 0.0),
                    'total_rebounds': stat_dict.get('REB', 0.0),
                    'assists': stat_dict.get('AST', 0.0),
                    'steals': stat_dict.get('STL', 0.0),
                    'blocks': stat_dict.get('BLK', 0.0),
                    'turnovers': stat_dict.get('TOV', 0.0),
                    'personal_fouls': stat_dict.get('PF', 0.0),
                    'plus_minus': stat_dict.get('PLUS_MINUS', 0.0)
                })
            
            logger.info(f"Retrieved stats for {len(stats)} players for season {season}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get player stats: {e}")
            raise
    
    def get_per_36_stats(self, season: str, season_type: str = "Regular Season", apply_filters: bool = True) -> List[Dict]:
        """Get per-36 minute statistics with advanced stats merged"""
        # First, get advanced stats
        advanced_stats_map = self.get_advanced_stats(season, 'Per36', season_type)
        
        endpoint = "leaguedashplayerstats"
        params = {
            'College': '',
            'Conference': '',
            'Country': '',
            'DateFrom': '',
            'DateTo': '',
            'Division': '',
            'DraftPick': '',
            'DraftYear': '',
            'GameScope': '',
            'GameSegment': '',
            'Height': '',
            'LastNGames': '0',
            'LeagueID': '00',
            'Location': '',
            'MeasureType': 'Base',
            'Month': '0',
            'OpponentTeamID': '0',
            'Outcome': '',
            'PORound': '0',
            'PaceAdjust': 'N',
            'PerMode': 'Per36',  # Changed to Per36
            'Period': '0',
            'PlayerExperience': '',
            'PlayerPosition': '',
            'PlusMinus': 'N',
            'Rank': 'N',
            'Season': season,
            'SeasonSegment': '',
            'SeasonType': season_type,
            'ShotClockRange': '',
            'StarterBench': '',
            'TeamID': '0',
            'TwoWay': '0',
            'VsConference': '',
            'VsDivision': '',
            'Weight': ''
        }
        
        try:
            data = self._make_request(endpoint, params)
            
            # Parse similar to get_player_stats but for per-36 data
            headers = data['resultSets'][0]['headers']
            rows = data['resultSets'][0]['rowSet']
            
            stats = []
            for row in rows:
                stat_dict = dict(zip(headers, row))
                
                # Apply filters only if requested
                if apply_filters and (stat_dict.get('GP', 0) < PLAYER_FILTERS['min_games_played'] or 
                    stat_dict.get('MIN', 0.0) < PLAYER_FILTERS['min_minutes_per_game']):
                    continue
                
                gp = stat_dict.get('GP', 0)
                min_per_game = stat_dict.get('MIN', 0.0)
                player_id = stat_dict.get('PLAYER_ID')
                advanced_stats = advanced_stats_map.get(player_id, {})
                
                stats.append({
                    'nba_player_id': player_id,
                    'player_name': stat_dict.get('PLAYER_NAME', ''),
                    'team_abbreviation': stat_dict.get('TEAM_ABBREVIATION', ''),
                    'games_played': gp,
                    'minutes_played': int(round(min_per_game * gp)) if gp > 0 else 0,  # Total minutes as integer
                    'points': stat_dict.get('PTS', 0.0),
                    'field_goals_made': stat_dict.get('FGM', 0.0),
                    'field_goals_attempted': stat_dict.get('FGA', 0.0),
                    'field_goal_percentage': stat_dict.get('FG_PCT', 0.0),
                    'three_pointers_made': stat_dict.get('FG3M', 0.0),
                    'three_pointers_attempted': stat_dict.get('FG3A', 0.0),
                    'three_point_percentage': stat_dict.get('FG3_PCT', 0.0),
                    'free_throws_made': stat_dict.get('FTM', 0.0),
                    'free_throws_attempted': stat_dict.get('FTA', 0.0),
                    'free_throw_percentage': stat_dict.get('FT_PCT', 0.0),
                    'true_shooting_percentage': advanced_stats.get('true_shooting_percentage', 0.0),
                    'usage_percentage': advanced_stats.get('usage_percentage', 0.0),
                    'offensive_rebounds': stat_dict.get('OREB', 0.0),
                    'defensive_rebounds': stat_dict.get('DREB', 0.0),
                    'total_rebounds': stat_dict.get('REB', 0.0),
                    'assists': stat_dict.get('AST', 0.0),
                    'steals': stat_dict.get('STL', 0.0),
                    'blocks': stat_dict.get('BLK', 0.0),
                    'turnovers': stat_dict.get('TOV', 0.0),
                    'personal_fouls': stat_dict.get('PF', 0.0)
                })
            
            logger.info(f"Retrieved per-36 stats for {len(stats)} players for season {season}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get per-36 stats: {e}")
            raise
    
    def get_total_stats(self, season: str, season_type: str = "Regular Season", apply_filters: bool = True) -> List[Dict]:
        """Get total season statistics with advanced stats merged"""
        # First, get advanced stats
        advanced_stats_map = self.get_advanced_stats(season, 'Totals', season_type)
        
        endpoint = "leaguedashplayerstats"
        params = {
            'College': '',
            'Conference': '',
            'Country': '',
            'DateFrom': '',
            'DateTo': '',
            'Division': '',
            'DraftPick': '',
            'DraftYear': '',
            'GameScope': '',
            'GameSegment': '',
            'Height': '',
            'LastNGames': '0',
            'LeagueID': '00',
            'Location': '',
            'MeasureType': 'Base',
            'Month': '0',
            'OpponentTeamID': '0',
            'Outcome': '',
            'PORound': '0',
            'PaceAdjust': 'N',
            'PerMode': 'Totals',  # Changed to Totals
            'Period': '0',
            'PlayerExperience': '',
            'PlayerPosition': '',
            'PlusMinus': 'N',
            'Rank': 'N',
            'Season': season,
            'SeasonSegment': '',
            'SeasonType': season_type,
            'ShotClockRange': '',
            'StarterBench': '',
            'TeamID': '0',
            'TwoWay': '0',
            'VsConference': '',
            'VsDivision': '',
            'Weight': ''
        }
        
        try:
            data = self._make_request(endpoint, params)
            
            # Parse similar to other methods but for totals
            headers = data['resultSets'][0]['headers']
            rows = data['resultSets'][0]['rowSet']
            
            stats = []
            for row in rows:
                stat_dict = dict(zip(headers, row))
                
                # Apply filters only if requested
                gp = stat_dict.get('GP', 10)
                total_min = stat_dict.get('MIN', 100.0)
                min_per_game = (total_min / gp) if gp > 0 else 0.0
            
                if apply_filters and (gp < PLAYER_FILTERS['min_games_played'] or 
                    min_per_game < PLAYER_FILTERS['min_minutes_per_game']):
                    continue
            
                player_id = stat_dict.get('PLAYER_ID')
                advanced_stats = advanced_stats_map.get(player_id, {})
            
                stats.append({
                    'nba_player_id': player_id,
                    'player_name': stat_dict.get('PLAYER_NAME', ''),
                    'team_abbreviation': stat_dict.get('TEAM_ABBREVIATION', ''),
                    'games_played': gp,
                    'games_started': stat_dict.get('GS', 0),
                    'total_minutes': int(round(total_min)),  # Integer for total minutes
                    'total_points': int(stat_dict.get('PTS', 0)),  # Integer for counts
                    'total_field_goals_made': int(stat_dict.get('FGM', 0)),
                    'total_field_goals_attempted': int(stat_dict.get('FGA', 0)),
                    'field_goal_percentage': stat_dict.get('FG_PCT', 0.0),  # Decimal for percentages
                    'total_three_pointers_made': int(stat_dict.get('FG3M', 0)),
                    'total_three_pointers_attempted': int(stat_dict.get('FG3A', 0)),
                    'three_point_percentage': stat_dict.get('FG3_PCT', 0.0),  # Decimal for percentages
                    'total_free_throws_made': int(stat_dict.get('FTM', 0)),
                    'total_free_throws_attempted': int(stat_dict.get('FTA', 0)),
                    'free_throw_percentage': stat_dict.get('FT_PCT', 0.0),  # Decimal for percentages
                    'true_shooting_percentage': advanced_stats.get('true_shooting_percentage', 0.0),
                    'usage_percentage': advanced_stats.get('usage_percentage', 0.0),
                    'total_offensive_rebounds': int(stat_dict.get('OREB', 0)),
                    'total_defensive_rebounds': int(stat_dict.get('DREB', 0)),
                    'total_rebounds': int(stat_dict.get('REB', 0)),
                    'total_assists': int(stat_dict.get('AST', 0)),
                    'total_steals': int(stat_dict.get('STL', 0)),
                    'total_blocks': int(stat_dict.get('BLK', 0)),
                    'total_turnovers': int(stat_dict.get('TOV', 0)),
                    'total_personal_fouls': int(stat_dict.get('PF', 0)),
                    'total_plus_minus': int(stat_dict.get('PLUS_MINUS', 0))
                })
            
            logger.info(f"Retrieved total stats for {len(stats)} players for season {season}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get total stats: {e}")
            raise
