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

        if response.status_code == 200:
            print(f"✓ Uploaded: {filename}")
            os.remove(file_path)
            print(f"✕ Deleted: {filename}")
            log_event("uploaded", filename)
            notify("Upload Success", f"{filename} sent to UiForm")
        else:
            msg = f"{response.status_code} - {response.text}"
            print(f"❌ Failed to upload {filename}: {msg}")
            log_event("failed", filename, msg)
            notify("Upload Failed", filename)

    except Exception as e:
        print(f"⚠️ Error uploading {file_path}: {e}")
        log_event("error", file_path, str(e))
        notify("Upload Error", os.path.basename(file_path))

class ScreenshotHandler(FileSystemEventHandler):
    def __init__(self, watch_folder, email):
        self.watch_folder = watch_folder
        self.email = email
        self.processing_files = set()  # Track files currently being processed
        self.processed_files = set()   # Track files that have been processed
        self.last_heartbeat = time.time()
        self.temp_files = set()  # Track temporary files
        try:
            self.config = get_user_config(email)
            self.supported_extensions = [f".{ext}" for ext in self.config.get('watched_file_types', ['png'])]
            print(f"Loaded config with supported extensions: {self.supported_extensions}")
        except Exception as e:
            print(f"Error loading user config: {str(e)}")
            self.supported_extensions = [".png"]  # Default to PNG if config fails

    def is_valid_file(self, file_path):
        """Check if the file is valid for processing."""
        print(f"\nChecking file: {file_path}")
        
        # Skip temporary files (starting with .)
        if os.path.basename(file_path).startswith('.'):
            print(f"Skipping temporary file: {file_path}")
            self.temp_files.add(file_path)  # Track this temp file
            return False
            
        # Skip if file extension is not supported
        file_extension = os.path.splitext(file_path)[1].lower()
        if file_extension not in self.supported_extensions:
            print(f"Skipping unsupported extension: {file_extension}")
            return False
            
        # Skip if file is already being processed or has been processed
        if file_path in self.processing_files:
            print(f"File is currently being processed: {file_path}")
            return False
        if file_path in self.processed_files:
            print(f"File has already been processed: {file_path}")
            return False
            
        # Skip if file doesn't exist or isn't readable
        if not os.path.exists(file_path):
            print(f"File does not exist: {file_path}")
            return False
        if not os.access(file_path, os.R_OK):
            print(f"File is not readable: {file_path}")
            return False
            
        print(f"File is valid for processing: {file_path}")
        return True

    def process_file(self, file_path):
        """Process a file if it's valid."""
        if not self.is_valid_file(file_path):
            return

        try:
            print(f"Processing new file: {file_path}")
            self.processing_files.add(file_path)
            
            # Process the new file
            process_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "process_screenshot.py")
            print(f"Running script: {process_script}")
            
            # Change to the scripts directory before running the script
            original_dir = os.getcwd()
            os.chdir(os.path.dirname(process_script))
            
            # Run the script and wait for it to complete
            result = subprocess.run(
                [sys.executable, "process_screenshot.py", file_path],
                capture_output=True,
                text=True
            )
            
            # Print the output
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print(f"Error: {result.stderr}")
            
            os.chdir(original_dir)
            
            # If processing was successful, add to processed files
            if result.returncode == 0:
                self.processed_files.add(file_path)
                print(f"✓ File processed successfully. Waiting for next file...")
            
        except Exception as e:
            print(f"Error processing file {file_path}: {str(e)}")
        finally:
            # Remove from processing set
            self.processing_files.discard(file_path)

    def on_created(self, event):
        if not event.is_directory:
            file_path = event.src_path
            print(f"\nNew file detected: {file_path}")
            self.process_file(file_path)

    def on_moved(self, event):
        if not event.is_directory:
            src_path = event.src_path
            dest_path = event.dest_path
            print(f"\nFile moved: {src_path} -> {dest_path}")
            
            # If this was a temp file being moved to its final location
            if src_path in self.temp_files:
                print(f"Processing moved file: {dest_path}")
                self.temp_files.remove(src_path)
                self.process_file(dest_path)

def start_watching(folder_path, user_email):
    print(f"\nStarting watcher for folder: {folder_path}")
    print(f"Supported extensions: {[ext for ext in ScreenshotHandler(folder_path, user_email).supported_extensions]}")
    print("Watcher is active and waiting for files...")
    
    event_handler = ScreenshotHandler(folder_path, user_email)
    observer = Observer()
    observer.schedule(event_handler, folder_path, recursive=False)
    observer.start()

    try:
        while True:
            # Print heartbeat every 30 seconds
            current_time = time.time()
            if current_time - event_handler.last_heartbeat >= 30:
                print("\nWatcher is still active and waiting for files...")
                print(f"Currently watching: {folder_path}")
                print(f"Supported extensions: {event_handler.supported_extensions}")
                event_handler.last_heartbeat = current_time
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping watcher...")
        observer.stop()
    observer.join()
    print("Watcher stopped.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python watch_folder.py <watch_folder> <email>")
        sys.exit(1)
    
    watch_folder = sys.argv[1]
    email = sys.argv[2]
    start_watching(watch_folder, email)
