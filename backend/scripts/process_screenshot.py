import os
import sys
import requests
from dotenv import load_dotenv
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.extend([PROJECT_ROOT, BACKEND_ROOT])

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
    profile_name = filename.split(" - Screenshot")[0] if " - Screenshot" in filename else filename
    print(f"Processing file: {filename}")

    try:
        with open(file_path, "rb") as f:
            file_content = f.read()
            
            if len(file_content) == 0:
                print(f"Error: File is empty: {filename}")
                return False
                
            if not file_content.startswith(b'\x89PNG\r\n\x1a\n'):
                print(f"Error: Not a valid PNG file: {filename}")
                return False

            files = {"file": (filename, file_content, "image/png")}
            headers = {"Api-Key": UIFORM_API_KEY}
            
            print(f"Uploading to UiForm API...")
            response = requests.post(UIFORM_API_ENDPOINT, headers=headers, files=files, timeout=30)

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

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python process_screenshot.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    success = process_file(file_path)
    sys.exit(0 if success else 1) 