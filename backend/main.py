import os
import sys
import multiprocessing
import subprocess
from scripts import send_emails

# === Setup ===
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, "scripts")

download_script = os.path.join(SCRIPTS_DIR, "download_contacts.py")
watch_script = os.path.join(SCRIPTS_DIR, "watch_folder.py")

logs_folder = os.path.join(PROJECT_DIR, "logs")
output_folder = os.path.join(PROJECT_DIR, "output")
contact_list_folder = os.path.join(PROJECT_DIR, "contact_lists")

# === Core Functions ===
def run_script(script_path):
    """Run a script and return its output."""
    result = subprocess.run(
        [sys.executable, script_path, "--no-confirm"], 
        capture_output=True,
        text=True
    )
    return result.stdout + "\n" + result.stderr

def run_script_background(script_path):
    """Run a script in the background."""
    os.system(f"{sys.executable} {script_path}")

def start_watcher():
    """Start the folder watcher process."""
    process = multiprocessing.Process(target=run_script_background, args=(watch_script,))
    process.start()
    return process

def stop_watcher(process):
    """Stop the folder watcher process."""
    if process and process.is_alive():
        process.terminate()
        return None
    return process

def download_contact_list():
    """Download and process the contact list."""
    return run_script(download_script)

def send_outreach_emails():
    """Send outreach emails and return status updates."""
    return send_emails.run_from_ui()

# === API Endpoints ===
# These functions will be used by the frontend to interact with the backend
def get_folder_paths():
    """Return paths to important folders."""
    return {
        "logs": logs_folder,
        "output": output_folder,
        "contact_list": contact_list_folder
    } 