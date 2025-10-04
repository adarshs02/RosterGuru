#!/usr/bin/env python3
"""
Fetch ESPN Player Headshots

This script fetches player headshots from ESPN using their ESPN IDs and stores
them in Supabase CDN/Storage using player_id as the filename.
"""

import requests
import os
import sys
import time
from typing import Dict, List, Optional, Tuple
import logging
from supabase import create_client, Client
from PIL import Image
import io
import tempfile

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PlayerHeadshotFetcher:
    def __init__(self):
        """Initialize the Supabase client and HTTP session"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.supabase = self._init_supabase()
        self.bucket_name = 'player-headshots'

    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        try:
            # Load environment variables
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_KEY')
            
            if not supabase_url or not supabase_key:
                # Try to load from .env file
                env_path = '/Users/adarsh/RosterGuru/RosterGuru/.env'
                if os.path.exists(env_path):
                    with open(env_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                # Remove quotes from value if present
                                value = value.strip('"').strip("'")
                                if key == 'NEXT_PUBLIC_SUPABASE_URL':
                                    supabase_url = value
                                elif key == 'NEXT_PUBLIC_SUPABASE_SERVICE_KEY':
                                    supabase_key = value
            
            # Remove quotes if still present
            if supabase_url:
                supabase_url = supabase_url.strip('"').strip("'")
            if supabase_key:
                supabase_key = supabase_key.strip('"').strip("'")
            
            if not supabase_url or not supabase_key:
                raise ValueError("Supabase URL and Service Key are required")
            
            client = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabase client initialized successfully")
            return client
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            sys.exit(1)

    def setup_storage_bucket(self):
        """Create storage bucket for player headshots if it doesn't exist"""
        try:
            # Try to get bucket info
            buckets_response = self.supabase.storage.list_buckets()
            
            # Handle different response formats
            bucket_exists = False
            try:
                # Check if buckets_response is a list of dictionaries
                if isinstance(buckets_response, list):
                    bucket_exists = any(bucket.get('name') == self.bucket_name for bucket in buckets_response)
                else:
                    # Check if it's an object with bucket names as attributes
                    bucket_names = [getattr(bucket, 'name', '') for bucket in buckets_response]
                    bucket_exists = self.bucket_name in bucket_names
            except Exception as check_error:
                logger.warning(f"Could not check existing buckets: {check_error}")
                # Assume bucket doesn't exist and try to create it
                bucket_exists = False
            
            if not bucket_exists:
                logger.info(f"Creating storage bucket: {self.bucket_name}")
                try:
                    self.supabase.storage.create_bucket(self.bucket_name, options={"public": True})
                    logger.info(f"✅ Created public storage bucket: {self.bucket_name}")
                except Exception as create_error:
                    if "already exists" in str(create_error).lower():
                        logger.info(f"✅ Storage bucket already exists: {self.bucket_name}")
                    else:
                        raise create_error
            else:
                logger.info(f"✅ Storage bucket already exists: {self.bucket_name}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error setting up storage bucket: {e}")
            return False

    def fetch_espn_headshot(self, espn_id: int, player_name: str = "Unknown") -> Optional[Tuple[bytes, Tuple[int, int]]]:
        """Fetch headshot image from ESPN and return image data with dimensions"""
        try:
            url = f"https://a.espncdn.com/i/headshots/nba/players/full/{espn_id}.png"
            logger.info(f"📥 Fetching headshot for {player_name} (ESPN ID: {espn_id})")
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Check if we got a valid image
            image_data = response.content
            if len(image_data) < 1000:  # Very small file, probably not a real image
                logger.warning(f"⚠️ {player_name}: Image too small ({len(image_data)} bytes)")
                return None
            
            # Get image dimensions using PIL
            try:
                image = Image.open(io.BytesIO(image_data))
                dimensions = image.size  # (width, height)
                logger.info(f"✅ {player_name}: {dimensions[0]}x{dimensions[1]} ({len(image_data)} bytes)")
                return image_data, dimensions
                
            except Exception as e:
                logger.error(f"❌ {player_name}: Invalid image format: {e}")
                return None
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️ {player_name}: Failed to fetch headshot: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ {player_name}: Unexpected error: {e}")
            return None

    def upload_to_supabase_storage(self, player_id: str, image_data: bytes, player_name: str = "Unknown") -> Optional[str]:
        """Upload image to Supabase storage and return public URL"""
        try:
            file_name = f"{player_id}.png"
            
            # Upload to storage - correct Supabase Python client syntax
            try:
                result = self.supabase.storage.from_(self.bucket_name).upload(
                    path=file_name,
                    file=image_data,
                    file_options={"content-type": "image/png", "upsert": True}
                )
                
                # Get public URL
                public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(file_name)
                logger.info(f"✅ {player_name}: Uploaded to storage")
                return public_url
                
            except Exception as upload_error:
                # Try alternative upload method if first fails
                logger.warning(f"⚠️ {player_name}: First upload method failed, trying alternative: {upload_error}")
                
                # Alternative method - some Supabase clients use different syntax
                result = self.supabase.storage.from_(self.bucket_name).upload(
                    file_name, 
                    image_data
                )
                
                # Get public URL
                public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(file_name)
                logger.info(f"✅ {player_name}: Uploaded to storage (alternative method)")
                return public_url
                
        except Exception as e:
            logger.error(f"❌ {player_name}: Storage upload error: {e}")
            return None

    def get_all_current_players(self) -> List[Dict]:
        """Get all current players with their ESPN IDs"""
        try:
            logger.info("📥 Fetching current players from Supabase...")
            result = self.supabase.table('current_players').select(
                'player_id, player_name, espn_player_id'
            ).execute()
            
            if not result.data:
                logger.error("No current players found in Supabase")
                return []
            
            players = result.data
            logger.info(f"Found {len(players)} current players")
            
            # Filter players with ESPN IDs
            players_with_espn_ids = [p for p in players if p.get('espn_player_id')]
            logger.info(f"Players with ESPN IDs: {len(players_with_espn_ids)}")
            
            return players_with_espn_ids
            
        except Exception as e:
            logger.error(f"Error fetching current players: {e}")
            return []

    def update_player_headshot_url(self, player_id: str, headshot_url: str, player_name: str = "Unknown"):
        """Update current_players table with headshot URL"""
        try:
            self.supabase.table('current_players').update({
                'headshot_url': headshot_url
            }).eq('player_id', player_id).execute()
            
            logger.info(f"✅ {player_name}: Updated headshot URL in database")
            
        except Exception as e:
            logger.error(f"❌ {player_name}: Failed to update headshot URL: {e}")

    def add_headshot_column_if_needed(self):
        """Add headshot_url column to current_players table if it doesn't exist"""
        try:
            logger.info("🔧 Checking if headshot_url column exists...")
            
            # Try to select headshot_url to see if column exists
            result = self.supabase.table('current_players').select('headshot_url').limit(1).execute()
            logger.info("✅ headshot_url column already exists")
            return True
            
        except Exception as e:
            if "column" in str(e).lower() and "does not exist" in str(e).lower():
                logger.info("📝 headshot_url column does not exist, needs to be added to schema")
                print("\n⚠️  SCHEMA UPDATE NEEDED:")
                print("The headshot_url column needs to be added to the current_players table.")
                print("Please run this SQL command in your Supabase SQL editor:")
                print("\nALTER TABLE current_players ADD COLUMN headshot_url TEXT;")
                print("\nThen re-run this script.")
                return False
            else:
                logger.error(f"Error checking headshot_url column: {e}")
                return False

    def process_all_headshots(self):
        """Main process to fetch and store all player headshots"""
        print("🖼️  Processing ESPN Player Headshots")
        print("=" * 45)
        
        # Get all current players
        players = self.get_all_current_players()
        if not players:
            print("❌ No players found to process")
            return
        
        # Statistics
        total_players = len(players)
        successful_downloads = 0
        failed_downloads = 0
        successful_uploads = 0
        failed_uploads = 0
        
        image_sizes = []
        
        print(f"\n🚀 Processing {total_players} players...")
        
        for i, player in enumerate(players, 1):
            player_id = player['player_id']
            player_name = player['player_name']
            espn_id = player['espn_player_id']
            
            print(f"\n[{i}/{total_players}] Processing {player_name}")
            print("-" * 50)
            
            # Fetch headshot from ESPN
            headshot_result = self.fetch_espn_headshot(espn_id, player_name)
            
            if headshot_result:
                image_data, dimensions = headshot_result
                successful_downloads += 1
                image_sizes.append(dimensions)
                
                # Upload to Supabase storage
                public_url = self.upload_to_supabase_storage(player_id, image_data, player_name)
                
                if public_url:
                    successful_uploads += 1
                    
                    # Update database with headshot URL
                    self.update_player_headshot_url(player_id, public_url, player_name)
                else:
                    failed_uploads += 1
            else:
                failed_downloads += 1
            
            # Rate limiting
            time.sleep(0.5)
            
            # Progress update every 50 players
            if i % 50 == 0:
                print(f"\n📊 PROGRESS UPDATE ({i}/{total_players}):")
                print(f"Downloaded: {successful_downloads}")
                print(f"Uploaded: {successful_uploads}")
                print(f"Failed: {failed_downloads + failed_uploads}")
        
        # Final summary
        print(f"\n📊 FINAL SUMMARY:")
        print("=" * 25)
        print(f"Total players processed: {total_players}")
        print(f"Successful downloads: {successful_downloads}")
        print(f"Failed downloads: {failed_downloads}")
        print(f"Successful uploads: {successful_uploads}")
        print(f"Failed uploads: {failed_uploads}")
        print(f"Overall success rate: {(successful_uploads/total_players*100):.1f}%")
        
        # Image size analysis
        if image_sizes:
            print(f"\n📏 IMAGE SIZE ANALYSIS:")
            print(f"Total images analyzed: {len(image_sizes)}")
            
            widths = [size[0] for size in image_sizes]
            heights = [size[1] for size in image_sizes]
            
            print(f"Width range: {min(widths)}px - {max(widths)}px")
            print(f"Height range: {min(heights)}px - {max(heights)}px")
            print(f"Most common size: {max(set(image_sizes), key=image_sizes.count)}")
            
            # Show size distribution
            size_counts = {}
            for size in image_sizes:
                size_key = f"{size[0]}x{size[1]}"
                size_counts[size_key] = size_counts.get(size_key, 0) + 1
            
            print(f"\nSize distribution:")
            for size, count in sorted(size_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"  {size}: {count} players")

def main():
    """Main function"""
    fetcher = PlayerHeadshotFetcher()
    
    # Check if headshot_url column exists
    if not fetcher.add_headshot_column_if_needed():
        sys.exit(1)
    
    # Setup storage bucket
    if not fetcher.setup_storage_bucket():
        print("❌ Failed to setup storage bucket")
        sys.exit(1)
    
    # Process all headshots
    fetcher.process_all_headshots()
    
    print(f"\n✅ Player headshot processing completed!")
    print(f"All headshots are now available in Supabase CDN")
    print(f"Bucket: {fetcher.bucket_name}")

if __name__ == "__main__":
    main()
