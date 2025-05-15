import pandas as pd
import os
import requests
from datetime import datetime
import sys
import re
import io
import platform

# === Load environment and paths ===
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def get_downloads_path():
    """Get the appropriate downloads path based on the environment."""
    if platform.system() == "Linux" and os.path.exists("/opt/render"):
        # We're in a containerized environment (like Render)
        downloads_dir = os.path.join(ROOT_DIR, "downloads")
        os.makedirs(downloads_dir, exist_ok=True)
        return os.path.join(downloads_dir, "contact_list.xlsx")
    else:
        # We're in a local environment
        return os.path.expanduser("~/Downloads/contact_list.xlsx")

DOWNLOADS_PATH = get_downloads_path()

COLUMNS_TO_KEEP = ["first_name", "last_name", "email", "company", "role", "education", "location"]

def extract_sheet_id(url):
    # Extract sheet ID from Google Sheets URL
    pattern = r'/d/([a-zA-Z0-9-_]+)'
    match = re.search(pattern, url)
    if not match:
        raise ValueError("Invalid Google Sheet URL")
    return match.group(1)

def get_sheet_csv_url(sheet_url):
    sheet_id = extract_sheet_id(sheet_url)
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"

def download_and_clean_sheet(sheet_url=None, confirm=True):
    if not sheet_url:
        raise ValueError("Sheet URL is required")

    if confirm:
        user_input = input("⚠️  This will overwrite your current contact_list.xlsx in Downloads.\nType \"yes\" to proceed: ").strip().lower()
        if user_input != "yes":
            print("❌ Aborted by user.")
            return

    print("⏏︎ Downloading Google Sheet...")
    csv_url = get_sheet_csv_url(sheet_url)
    response = requests.get(csv_url, timeout=10)
    response.raise_for_status()

    df = pd.read_csv(io.BytesIO(response.content), encoding="utf-8")

    missing = [col for col in COLUMNS_TO_KEEP if col not in df.columns]
    if missing:
        print(f"❌ Missing columns in sheet: {missing}")
        return

    # Ensure the directory exists
    os.makedirs(os.path.dirname(DOWNLOADS_PATH), exist_ok=True)
    
    df[COLUMNS_TO_KEEP].to_excel(DOWNLOADS_PATH, index=False, engine='openpyxl')
    print(f"✓ Saved contact list to: {DOWNLOADS_PATH}")

def get_sheet_preview(sheet_url, rows=5):
    """Get a preview of the sheet data"""
    try:
        csv_url = get_sheet_csv_url(sheet_url)
        response = requests.get(csv_url, timeout=10)
        response.raise_for_status()
        df = pd.read_csv(io.StringIO(response.content.decode('utf-8')))
        return df.head(rows).to_dict('records')
    except Exception as e:
        print(f"Error getting sheet preview: {e}")
        return []

if __name__ == "__main__":
    is_interactive = "--no-confirm" not in sys.argv
    if len(sys.argv) > 1 and sys.argv[1] != "--no-confirm":
        sheet_url = sys.argv[1]
        download_and_clean_sheet(sheet_url, confirm=is_interactive)
    else:
        print("❌ Please provide a Google Sheet URL")
