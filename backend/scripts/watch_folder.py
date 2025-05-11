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

UIFORM_API_ENDPOINT = os.getenv("UIFORM_API_ENDPOINT")
UIFORM_API_KEY = os.getenv("UIFORM_API_KEY")

# Track processed files to avoid duplicates
processed_files = set()

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

def upload_file(file_path):
    try:
        with open(file_path, "rb") as f:
            files = {"file": f}
            headers = {"Api-Key": UIFORM_API_KEY}
            response = requests.post(UIFORM_API_ENDPOINT, headers=headers, files=files)

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

def watch_folder(folder_path):
    print(f"→ Watching folder: {folder_path}")
    processed_files = set()
    
    while True:
        try:
            files = [
                f for f in os.listdir(folder_path)
                if f.lower().endswith(tuple(SUPPORTED_EXTENSIONS))
            ]
            
            for file_name in files:
                file_path = os.path.join(folder_path, file_name)
                
                if file_path in processed_files or not os.path.exists(file_path):
                    continue
                    
                try:
                    upload_file(file_path)
                    processed_files.add(file_path)
                except Exception as e:
                    print(f"⚠️ Error processing {file_name}: {str(e)}")
                    
        except Exception as e:
            print(f"⚠️ Folder watch error: {e}")

        time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python watch_folder.py <watch_folder> <email>")
        sys.exit(1)
    
    folder_to_watch = sys.argv[1]
    email = sys.argv[2]
    watch_folder(folder_to_watch)
