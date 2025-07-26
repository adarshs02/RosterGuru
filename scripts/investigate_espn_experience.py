#!/usr/bin/env python3
"""
Investigate ESPN Experience Data

This script examines the 'experience' and 'debutYear' fields in ESPN roster data
to see if we can extract years in the league information.
"""

import requests
import json
import time
from typing import Dict, List, Optional
from datetime import datetime

class ESPNExperienceInvestigator:
    def __init__(self):
        """Initialize the ESPN API investigator"""
        self.base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

    def get_team_roster(self, team_id: int) -> Optional[Dict]:
        """Get team roster from ESPN API"""
        try:
            url = f"{self.base_url}/teams/{team_id}/roster"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching team {team_id} roster: {e}")
            return None

    def analyze_experience_fields(self, player_data: Dict) -> Dict:
        """Analyze experience-related fields for a player"""
        experience_info = {}
        
        # Check for specific experience fields
        if 'experience' in player_data:
            experience_info['experience'] = player_data['experience']
        
        if 'debutYear' in player_data:
            experience_info['debutYear'] = player_data['debutYear']
        
        # Calculate years in league if we have debut year
        if 'debutYear' in player_data:
            current_year = datetime.now().year
            debut_year = player_data['debutYear']
            years_in_league = current_year - debut_year
            experience_info['calculated_years'] = years_in_league
        
        return experience_info

    def investigate_experience_data(self):
        """Investigate experience data for players across multiple teams"""
        print("🔍 Investigating ESPN Experience/Years in League Data")
        print("=" * 60)
        
        # Get rosters from multiple teams
        sample_teams = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  # First 10 teams
        all_experience_data = []
        
        for team_id in sample_teams:
            print(f"\n📥 Analyzing team {team_id}...")
            roster_data = self.get_team_roster(team_id)
            
            if roster_data and 'athletes' in roster_data:
                for athlete in roster_data['athletes']:
                    player_name = athlete.get('fullName', 'Unknown')
                    experience_data = self.analyze_experience_fields(athlete)
                    
                    if experience_data:  # Only include if we found experience data
                        experience_data['player_name'] = player_name
                        experience_data['team_id'] = team_id
                        all_experience_data.append(experience_data)
                
                print(f"   Found experience data for {len([a for a in roster_data['athletes'] if self.analyze_experience_fields(a)])} players")
            
            time.sleep(0.3)  # Rate limiting
        
        print(f"\n📊 EXPERIENCE DATA ANALYSIS:")
        print("=" * 40)
        print(f"Total players with experience data: {len(all_experience_data)}")
        
        # Analyze the structure of experience field
        experience_structures = {}
        debut_year_count = 0
        
        for data in all_experience_data:
            if 'experience' in data:
                exp_data = data['experience']
                if isinstance(exp_data, dict):
                    structure = list(exp_data.keys())
                    structure_key = str(sorted(structure))
                    experience_structures[structure_key] = experience_structures.get(structure_key, 0) + 1
                else:
                    exp_type = type(exp_data).__name__
                    experience_structures[f"type_{exp_type}"] = experience_structures.get(f"type_{exp_type}", 0) + 1
            
            if 'debutYear' in data:
                debut_year_count += 1
        
        print(f"\nExperience field structures found:")
        for structure, count in experience_structures.items():
            print(f"  - {structure}: {count} players")
        
        print(f"\nPlayers with debutYear: {debut_year_count}")
        
        # Show detailed examples
        print(f"\n📋 DETAILED EXAMPLES:")
        print("=" * 25)
        
        for i, data in enumerate(all_experience_data[:15]):  # Show first 15 examples
            print(f"\n{i+1}. {data['player_name']}")
            print("-" * 30)
            
            if 'experience' in data:
                exp = data['experience']
                print(f"   Experience field: {json.dumps(exp, indent=6)}")
            
            if 'debutYear' in data:
                debut = data['debutYear']
                calculated = data.get('calculated_years', 'N/A')
                print(f"   Debut Year: {debut}")
                print(f"   Calculated Years in League: {calculated}")
            
            if 'experience' not in data and 'debutYear' not in data:
                print("   No experience data found")
        
        # Summary of how to use this data
        print(f"\n💡 RECOMMENDATIONS FOR YEARS IN LEAGUE:")
        print("=" * 50)
        
        if debut_year_count > 0:
            print("✅ debutYear field is available for many players")
            print("   → Can calculate years in league as: current_year - debut_year")
            print("   → This gives accurate years of NBA experience")
        
        if experience_structures:
            print("✅ experience field contains structured data")
            print("   → May contain direct years of experience information")
            print("   → Need to examine structure to extract the right value")
        
        # Test calculation accuracy with known players
        print(f"\n🧪 TESTING CALCULATION ACCURACY:")
        print("=" * 40)
        
        known_veterans = []
        rookies = []
        
        for data in all_experience_data:
            if 'calculated_years' in data:
                years = data['calculated_years']
                if years >= 10:
                    known_veterans.append(data)
                elif years <= 1:
                    rookies.append(data)
        
        print(f"Veteran players (10+ years): {len(known_veterans)}")
        for vet in known_veterans[:5]:
            print(f"  - {vet['player_name']}: {vet['calculated_years']} years (debut: {vet['debutYear']})")
        
        print(f"\nRookie/Young players (0-1 years): {len(rookies)}")
        for rookie in rookies[:5]:
            print(f"  - {rookie['player_name']}: {rookie['calculated_years']} years (debut: {rookie['debutYear']})")
        
        return all_experience_data

def main():
    """Main function"""
    investigator = ESPNExperienceInvestigator()
    experience_data = investigator.investigate_experience_data()
    
    print(f"\n✅ Experience investigation completed!")
    print(f"📊 Found experience data for {len(experience_data)} players")

if __name__ == "__main__":
    main()
