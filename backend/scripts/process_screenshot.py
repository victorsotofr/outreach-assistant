import os
import sys
import requests
from dotenv import load_dotenv
import time

# Add the parent directory to Python path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.extend([PROJECT_ROOT, BACKEND_ROOT])

# Load environment variables
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

UIFORM_API_ENDPOINT = os.getenv("UIFORM_API_ENDPOINT")
UIFORM_API_KEY = os.getenv("UIFORM_API_KEY")

def process_file(file_path):
    """Process a file by uploading it to UiForm API."""
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return False

    if not os.access(file_path, os.R_OK):
        print(f"Error: Cannot read file: {file_path}")
        return False

    filename = os.path.basename(file_path)
    print(f"Processing file: {filename}")

    try:
        # Try to open the file to ensure it's not locked
        with open(file_path, "rb") as f:
            files = {"file": f}
            headers = {"Api-Key": UIFORM_API_KEY}
            
            print(f"Uploading to UiForm API...")
            response = requests.post(UIFORM_API_ENDPOINT, headers=headers, files=files)

        if response.status_code == 200:
            print(f"✓ Successfully processed: {filename}")
            try:
                os.remove(file_path)
                print(f"✓ Deleted local file: {filename}")
            except Exception as e:
                print(f"Warning: Could not delete local file: {str(e)}")
            return True
        else:
            print(f"❌ Failed to process {filename}: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error processing {filename}: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python process_screenshot.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    success = process_file(file_path)
    sys.exit(0 if success else 1) 