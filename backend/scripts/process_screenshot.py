import os
import sys
import requests
from datetime import datetime
import json
from dotenv import load_dotenv
import time
import subprocess

# Add the parent directory to Python path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.extend([PROJECT_ROOT, BACKEND_ROOT])

# Load environment variables
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

# Import after path setup
from db.config_db import get_user_config

def notify(title, message):
    """Send a macOS notification."""
    print(f"Attempting to send notification - Title: {title}, Message: {message}")
    try:
        # Escape double quotes in the message and title
        escaped_title = title.replace('"', '\\"')
        escaped_message = message.replace('"', '\\"')
        
        # Create the AppleScript command
        script = f'display notification "{escaped_message}" with title "{escaped_title}"'
        print(f"Executing AppleScript: {script}")
        
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Notification failed with error: {result.stderr}")
        else:
            print("Notification sent successfully")
            
    except Exception as e:
        print(f"Warning: Could not send notification: {str(e)}")
        print(f"Error type: {type(e).__name__}")

def get_api_config(email):
    """Get API configuration from user's settings."""
    config = get_user_config(email)
    if not config:
        raise ValueError("No configuration found for user")
    
    api_key = config.get("uiform_api_key")
    api_endpoint = config.get("uiform_api_endpoint")
    
    if not api_key or not api_endpoint:
        raise ValueError("Missing UiForm API configuration")
    
    return api_key, api_endpoint

def process_file(file_path, email):
    """Process a file by uploading it to UiForm API."""
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return False

    if not os.access(file_path, os.R_OK):
        print(f"Error: Cannot read file: {file_path}")
        return False

    filename = os.path.basename(file_path)
    profile_name = filename.split(" - Screenshot")[0] if " - Screenshot" in filename else filename
    print(f"Processing file: {filename}")

    try:
        api_key, api_endpoint = get_api_config(email)
        
        with open(file_path, "rb") as f:
            file_content = f.read()
            
            if len(file_content) == 0:
                print(f"Error: File is empty: {filename}")
                return False
                
            if not file_content.startswith(b'\x89PNG\r\n\x1a\n'):
                print(f"Error: Not a valid PNG file: {filename}")
                return False

            files = {"file": (filename, file_content, "image/png")}
            headers = {"Api-Key": api_key}
            
            print(f"Uploading to UiForm API...")
            response = requests.post(api_endpoint, headers=headers, files=files, timeout=30)

        if response.status_code == 200:
            print(f"✓ Successfully processed: {filename}")
            try:
                os.remove(file_path)
                print(f"✓ Deleted local file: {filename}")
                # Send notification about successful processing and deletion
                notify("Profile Processed", f"Profile of {profile_name} well processed")
                notify("File Deleted", f"File {filename} deleted after processing")
            except Exception as e:
                print(f"Warning: Could not delete local file: {str(e)}")
                notify("Warning", f"Could not delete file {filename}")
            return True
        else:
            print(f"❌ Failed to process {filename}: {response.status_code} - {response.text}")
            notify("Processing Failed", f"Failed to process profile of {profile_name}")
            return False

    except requests.exceptions.Timeout:
        print(f"❌ Timeout while uploading {filename}")
        notify("Processing Failed", f"Timeout while processing profile of {profile_name}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error while uploading {filename}: {str(e)}")
        notify("Processing Failed", f"Network error while processing profile of {profile_name}")
        return False
    except Exception as e:
        print(f"❌ Error processing {filename}: {str(e)}")
        notify("Processing Failed", f"Error processing profile of {profile_name}")
        return False

def process_screenshot(file_path, email):
    try:
        api_key, api_endpoint = get_api_config(email)
        
        with open(file_path, "rb") as f:
            files = {"file": f}
            headers = {"Api-Key": api_key}
            response = requests.post(api_endpoint, headers=headers, files=files)
            
        if response.status_code == 200:
            print(f"✓ Successfully processed: {os.path.basename(file_path)}")
            return True
        else:
            print(f"❌ Failed to process {os.path.basename(file_path)}: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"⚠️ Error processing {file_path}: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_screenshot.py <file_path> <email>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    email = sys.argv[2]
    process_screenshot(file_path, email) 