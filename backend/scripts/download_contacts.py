import pandas as pd
import os
import requests
from datetime import datetime
from dotenv import load_dotenv
import sys
import re

# === Load environment and paths ===
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

CONTACT_DIR = os.path.join(ROOT_DIR, "backend", "contact_lists")
OLD_DIR = os.path.join(CONTACT_DIR, "_Old")
DEST_PATH = os.path.join(CONTACT_DIR, "contact_list.csv")
TEMP_PATH = os.path.join(CONTACT_DIR, "temp_download.csv")

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
        user_input = input("⚠️  This will overwrite your current contact_list.csv.\n💡 A backup will be saved in '_Old'.\nType \"yes\" to proceed: ").strip().lower()
        if user_input != "yes":
            print("❌ Aborted by user.")
            return

    os.makedirs(CONTACT_DIR, exist_ok=True)

    if os.path.exists(DEST_PATH):
        os.makedirs(OLD_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        backup_filename = f"contact_list_{timestamp}.csv"
        backup_path = os.path.join(OLD_DIR, backup_filename)
        os.rename(DEST_PATH, backup_path)
        print(f"↩︎ Backed up old contact list to: {backup_path}")

    print("⏏︎ Downloading Google Sheet...")
    csv_url = get_sheet_csv_url(sheet_url)
    response = requests.get(csv_url, timeout=10)
    response.raise_for_status()

    with open(TEMP_PATH, "wb") as f:
        f.write(response.content)

    print("⌁ Cleaning and filtering columns...")
    df = pd.read_csv(TEMP_PATH)

    missing = [col for col in COLUMNS_TO_KEEP if col not in df.columns]
    if missing:
        print(f"❌ Missing columns in sheet: {missing}")
        return

    df = df[COLUMNS_TO_KEEP]
    df.to_csv(DEST_PATH, index=False)
    os.remove(TEMP_PATH)

    print(f"✓ Saved cleaned contact list to: {DEST_PATH}")

def get_sheet_preview(sheet_url, rows=5):
    """Get a preview of the sheet data"""
    try:
        csv_url = get_sheet_csv_url(sheet_url)
        response = requests.get(csv_url, timeout=10)
        response.raise_for_status()
        
        df = pd.read_csv(pd.io.common.StringIO(response.text))
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
