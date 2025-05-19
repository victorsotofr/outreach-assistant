import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env.production")  # Load production first
load_dotenv(PROJECT_ROOT / ".env.development")  # Then development
load_dotenv(PROJECT_ROOT / ".env")  # Finally, any local overrides

# Frontend URLs
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
PRODUCTION_URL = os.getenv("PRODUCTION_URL", "https://uiform-outreach-assistant.vercel.app")

# Project directories
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, "scripts")
LOGS_FOLDER = os.path.join(PROJECT_DIR, "logs")
OUTPUT_FOLDER = os.path.join(PROJECT_DIR, "output")

# Script paths
DOWNLOAD_SCRIPT = os.path.join(SCRIPTS_DIR, "download_contacts.py")
WATCH_SCRIPT = os.path.join(SCRIPTS_DIR, "watch_folder.py") 