import pandas as pd
import os
import requests
from datetime import datetime
import sys
import re

# === Load environment and paths ===
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOWNLOADS_PATH = os.path.expanduser("~/Downloads/contact_list.xlsx")

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

    # Read directly from the response content
    df = pd.read_csv(pd.io.common.StringIO(response.text))

    missing = [col for col in COLUMNS_TO_KEEP if col not in df.columns]
    if missing:
        print(f"❌ Missing columns in sheet: {missing}")
        return

    df = df[COLUMNS_TO_KEEP]
    
    # Save to Downloads folder as Excel
    df.to_excel(DOWNLOADS_PATH, index=False, engine='openpyxl')
    print(f"✓ Saved contact list to Downloads: {DOWNLOADS_PATH}")

def get_sheet_preview(sheet_url, rows=5):
    """Get a preview of the sheet data"""
    try:
        csv_url = get_sheet_csv_url(sheet_url)
        response = requests.get(csv_url, timeout=10)
        response.raise_for_status()
        
        # Read CSV with proper encoding
        df = pd.read_csv(pd.io.common.StringIO(response.text), encoding='utf-8')
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
