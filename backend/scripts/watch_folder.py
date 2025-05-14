import os
import sys
import time
import requests
from datetime import datetime
from subprocess import run
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import json
from dotenv import load_dotenv
import shutil

# Add the parent directory to Python path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.extend([PROJECT_ROOT, BACKEND_ROOT])

# Load environment variables
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

# Import after path setup
from db.config_db import get_user_config

# === CONFIGURATION ===
# Get watch folder from command line argument or use default
WATCH_FOLDER = sys.argv[1] if len(sys.argv) > 1 else "/Users/victorsoto/Downloads"

SUPPORTED_EXTENSIONS = [".png"]
POLL_INTERVAL_SECONDS = 5

LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "upload_logs.txt")

# Track processed files to avoid duplicates
processed_files = set()

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

def notify(title, message):
    try:
        run([
            "osascript", "-e",
            f'display notification \"{message}\" with title \"{title}\"'
        ])
    except Exception as e:
        print(f"⚠️ Notification failed: {e}")

def log_event(status, filename, detail=""):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}] {status.upper()}: {filename} {detail}\n")

def upload_file(file_path, api_key, api_endpoint):
    try:
        with open(file_path, "rb") as f:
            files = {"file": f}
            headers = {"Api-Key": api_key}
            response = requests.post(api_endpoint, headers=headers, files=files)

        filename = os.path.basename(file_path)
        profile_name = filename.split(" - Screenshot")[0] if " - Screenshot" in filename else filename

        if response.status_code == 200:
            print(f"✓ Uploaded: {filename}")
            log_event("uploaded", filename)
            notify("Profile Processed", f"Profile of {profile_name} well processed")
        else:
            msg = f"{response.status_code} - {response.text}"
            print(f"❌ Failed to upload {filename}: {msg}")
            log_event("failed", filename, msg)
            notify("Processing Failed", f"Failed to process profile of {profile_name}")

    except Exception as e:
        print(f"⚠️ Error uploading {file_path}: {e}")
        log_event("error", file_path, str(e))
        notify("Upload Error", os.path.basename(file_path))

class ImageHandler(FileSystemEventHandler):
    def __init__(self, folder_path, email):
        self.folder_path = folder_path
        self.email = email
        self.processed_files = set()  # Keep track of processed files
        self.last_processed_time = {}  # Keep track of last processed time for each file
        self.api_key, self.api_endpoint = get_api_config(email)

    def on_created(self, event):
        if event.is_directory:
            return

        if not event.src_path.lower().endswith('.png'):
            return

        # Get file name and current time
        file_name = os.path.basename(event.src_path)
        # Remove any leading dots from the filename
        file_name = file_name.lstrip('.')
        current_time = time.time()

        # Check if we've processed this file recently (within last 5 seconds)
        if file_name in self.last_processed_time:
            if current_time - self.last_processed_time[file_name] < 5:
                return

        # Check if we've already processed this file
        if file_name in self.processed_files:
            return

        try:
            # Process the file
            file_path = os.path.join(self.folder_path, file_name)
            if not os.path.exists(file_path):
                print(f"File not found: {file_path}")
                return

            with open(file_path, 'rb') as f:
                files = {'file': (file_name, f, 'image/png')}
                headers = {"Api-Key": self.api_key}
                response = requests.post(
                    self.api_endpoint,
                    headers=headers,
                    files=files
                )
                response.raise_for_status()
                print(f"✓ Uploaded: {file_name}")
                
                # Mark file as processed and update last processed time
                self.processed_files.add(file_name)
                self.last_processed_time[file_name] = current_time

        except Exception as e:
            print(f"Error processing {file_name}: {e}")

def watch_folder(folder_path, email):
    try:
        # Verify API configuration before starting
        get_api_config(email)
        
    event_handler = ImageHandler(folder_path, email)
    observer = Observer()
    observer.schedule(event_handler, folder_path, recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python watch_folder.py <folder_path> <email>")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    email = sys.argv[2]
    watch_folder(folder_path, email)
