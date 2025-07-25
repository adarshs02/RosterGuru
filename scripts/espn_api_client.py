"""
ESPN Fantasy Basketball API Client
Fetches player positions and other fantasy-relevant data from ESPN's Fantasy Basketball API
"""

import requests
import json
import logging
from typing import List, Dict, Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ESPNFantasyClient:
    """Client for ESPN Fantasy Basketball API"""
    
    def __init__(self):
        """Initialize ESPN Fantasy client"""
        self.base_url = "https://fantasy.espn.com/apis/v3/games/fba"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
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
        Get all NBA players with their positions from ESPN's public NBA API
        Uses team rosters to get the most accurate position data
        """
        logger.info(f"Fetching player positions from ESPN NBA API")
        return self._get_players_from_rosters()
    
    def _get_players_from_rosters(self) -> List[Dict]:
        """
        Get players from ESPN's public NBA API using team rosters
        """
        try:
            # Get all NBA teams first
            teams_url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"
            teams_data = self._make_request(teams_url)
            
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
                            roster_data = self._make_request(roster_url)
                            
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
                                    
                                    # Get position information
                                    position_info = athlete.get('position', {})
                                    if position_info:
                                        pos_abbrev = position_info.get('abbreviation', '')
                                        if pos_abbrev:
                                            # Map ESPN positions to standard fantasy positions
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
                                                'C-F': ['C', 'PF']
                                            }
                                            
                                            player_info['positions'] = position_mapping.get(pos_abbrev, [pos_abbrev])
                                    
                                    # Only include players with valid names and positions
                                    if player_info['player_name'] and player_info['positions']:
                                        all_players.append(player_info)
                                            
                        except Exception as e:
                            logger.warning(f"Failed to get roster for team {team_abbrev}: {e}")
                            continue
            
            logger.info(f"Retrieved {len(all_players)} players with positions from ESPN NBA API")
            return all_players
            
        except Exception as e:
            logger.error(f"Failed to get players from ESPN NBA API: {e}")
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
