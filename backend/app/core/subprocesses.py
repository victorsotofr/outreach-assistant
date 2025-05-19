import os
import sys
import subprocess
import multiprocessing
from .settings import DOWNLOAD_SCRIPT, WATCH_SCRIPT

def run_script(script_path):
    """Run a script and return its output."""
    result = subprocess.run(
        [sys.executable, script_path, "--no-confirm"],
        capture_output=True,
        text=True
    )
    return result.stdout + "\n" + result.stderr

def run_script_background(script_path, *args):
    """Run a script in the background with arguments."""
    cmd = [sys.executable, script_path] + list(args)
    os.system(" ".join(cmd))

def start_watcher_process():
    """Start the folder watcher process."""
    process = multiprocessing.Process(
        target=run_script_background, args=(WATCH_SCRIPT,))
    process.start()
    return process

def stop_watcher_process(process):
    """Stop the folder watcher process."""
    if process and process.is_alive():
        process.terminate()
        return None
    return process

def download_contact_list():
    """Download and process the contact list."""
    return run_script(DOWNLOAD_SCRIPT)

def get_folder_paths():
    """Return paths to important folders."""
    from .settings import LOGS_FOLDER, OUTPUT_FOLDER
    return {
        "logs": LOGS_FOLDER,
        "output": OUTPUT_FOLDER
    } 