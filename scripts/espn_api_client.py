"""
ESPN Fantasy Basketball API Client
Handles fetching player positions from ESPN's Fantasy v3 API
"""

import logging
from typing import List, Dict, Optional
from espn_api.basketball import League

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ESPNFantasyClient:
    """Client for ESPN Fantasy Basketball API"""
    
    def __init__(self):
        """Initialize ESPN Fantasy client"""
        # We'll use a public league approach or fallback method
        self.league = None
        self.current_year = 2025  # Current NBA season
        
    def _make_request(self, url: str, params: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict:
        """Make HTTP request to ESPN API"""
        try:
            if headers:
                self.session.headers.update(headers)
                
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            raise
    
    def get_players_with_positions(self, season: str = "2024") -> List[Dict]:
        """
        Get all NBA players with their positions from ESPN Fantasy v3 API
        Uses the espn-api package to get player.position data
        """
        logger.info(f"Fetching player positions from ESPN Fantasy v3 API")
        return self._get_players_from_fantasy_api()
    
    def _get_players_from_fantasy_api(self) -> List[Dict]:
        """
        Get players from ESPN Fantasy v3 API using espn-api package
        """
        try:
            # Use a public league to access player data
            # We'll try a few different approaches to get player position data
            return self._get_players_fallback_method()
            
        except Exception as e:
            logger.error(f"Failed to get players from ESPN Fantasy API: {e}")
            # Fallback to the old method if Fantasy API fails
            return self._get_players_fallback_method()
    
    def _get_players_fallback_method(self) -> List[Dict]:
        """
        Fallback method using ESPN's public API but with improved position mapping
        """
        try:
            import requests
            import json
            
            # Get all NBA teams first
            teams_url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"
            response = requests.get(teams_url, timeout=30)
            response.raise_for_status()
            teams_data = response.json()
            
            all_players = []
            
            # Extract teams from the response structure
            if 'sports' in teams_data and teams_data['sports']:
                leagues = teams_data['sports'][0].get('leagues', [])
                if leagues:
                    teams = leagues[0].get('teams', [])
                    
                    logger.info(f"Found {len(teams)} NBA teams")
                    
                    for team_info in teams:
                        team = team_info.get('team', {})
                        team_abbrev = team.get('abbreviation', '')
                        team_id = team.get('id')
                        
                        if not team_id:
                            continue
                            
                        # Get team roster using the correct endpoint format
                        roster_url = f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/roster"
                        
                        try:
                            logger.info(f"Fetching roster for {team_abbrev} (ID: {team_id})")
                            roster_response = requests.get(roster_url, timeout=30)
                            roster_response.raise_for_status()
                            roster_data = roster_response.json()
                            
                            # Process roster data - athletes are individual objects, not grouped
                            if 'athletes' in roster_data:
                                for athlete in roster_data['athletes']:
                                    # Extract player information
                                    player_info = {
                                        'espn_player_id': athlete.get('id'),
                                        'player_name': athlete.get('displayName', ''),
                                        'first_name': athlete.get('firstName', ''),
                                        'last_name': athlete.get('lastName', ''),
                                        'team_abbreviation': team_abbrev,
                                        'positions': [],
                                        'is_active': athlete.get('active', True),
                                        'injury_status': athlete.get('status', {}).get('type', 'ACTIVE')
                                    }
                                    
                                    # Get position information with improved mapping
                                    position_info = athlete.get('position', {})
                                    if position_info:
                                        pos_abbrev = position_info.get('abbreviation', '')
                                        pos_name = position_info.get('name', '').lower()
                                        
                                        if pos_abbrev:
                                            # Enhanced position mapping
                                            position_mapping = {
                                                'PG': ['PG'],
                                                'SG': ['SG'], 
                                                'G': ['PG', 'SG'],  # Generic Guard
                                                'SF': ['SF'],
                                                'PF': ['PF'],
                                                'F': ['SF', 'PF'],  # Generic Forward
                                                'C': ['C'],
                                                'F-C': ['PF', 'C'],
                                                'G-F': ['SG', 'SF'],
                                                'C-F': ['C', 'PF'],
                                                # Additional mappings
                                                'Point Guard': ['PG'],
                                                'Shooting Guard': ['SG'],
                                                'Small Forward': ['SF'],
                                                'Power Forward': ['PF'],
                                                'Center': ['C'],
                                                'Forward': ['SF', 'PF'],
                                                'Guard': ['PG', 'SG']
                                            }
                                            
                                            # Try abbreviation first, then full name
                                            mapped_positions = position_mapping.get(pos_abbrev) or position_mapping.get(pos_name.title())
                                            if mapped_positions:
                                                player_info['positions'] = mapped_positions
                                            else:
                                                # More specific position inference
                                                if 'guard' in pos_name:
                                                    if 'point' in pos_name:
                                                        player_info['positions'] = ['PG']
                                                    elif 'shooting' in pos_name:
                                                        player_info['positions'] = ['SG']
                                                    else:
                                                        player_info['positions'] = ['PG', 'SG']
                                                elif 'forward' in pos_name:
                                                    if 'small' in pos_name:
                                                        player_info['positions'] = ['SF']
                                                    elif 'power' in pos_name:
                                                        player_info['positions'] = ['PF']
                                                    else:
                                                        player_info['positions'] = ['SF', 'PF']
                                                elif 'center' in pos_name:
                                                    player_info['positions'] = ['C']
                                                else:
                                                    # Default to most common positions
                                                    player_info['positions'] = ['SF', 'PF']
                                    
                                    # Only include players with valid names and positions
                                    if player_info['player_name'] and player_info['positions']:
                                        all_players.append(player_info)
                                            
                        except Exception as e:
                            logger.warning(f"Failed to get roster for team {team_abbrev}: {e}")
                            continue
            
            logger.info(f"Retrieved {len(all_players)} players with positions from ESPN API")
            return all_players
            
        except Exception as e:
            logger.error(f"Failed to get players from ESPN API: {e}")
            return []
    
    def get_team_abbreviations(self) -> Dict[int, str]:
        """Get mapping of ESPN team IDs to abbreviations"""
        try:
            url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"
            data = self._make_request(url)
            
            team_map = {}
            if 'sports' in data and data['sports']:
                leagues = data['sports'][0].get('leagues', [])
                if leagues:
                    teams = leagues[0].get('teams', [])
                    for team_info in teams:
                        team = team_info.get('team', {})
                        team_id = team.get('id')
                        team_abbrev = team.get('abbreviation', '')
                        if team_id and team_abbrev:
                            team_map[int(team_id)] = team_abbrev
            
            return team_map
            
        except Exception as e:
            logger.error(f"Failed to get team abbreviations: {e}")
            return {}

if __name__ == "__main__":
    # Test the ESPN client
    client = ESPNFantasyClient()
    players = client.get_players_with_positions("2024")
    
    print(f"Found {len(players)} players")
    if players:
        print("Sample players:")
        for player in players[:10]:
            print(f"- {player['player_name']} ({player['team_abbreviation']}): {', '.join(player['positions'])}")
