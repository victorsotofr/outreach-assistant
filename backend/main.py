import os
import sys
import multiprocessing
import subprocess
from pathlib import Path
from dotenv import load_dotenv
from scripts import send_emails
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from db.config_db import save_user_config, get_user_config, get_user_templates, save_template, delete_template, update_template, init_default_template, get_db, UserConfig
from fastapi.responses import StreamingResponse, JSONResponse
import shutil
from datetime import datetime
import pandas as pd
import json
import requests
from sqlalchemy.orm import Session
from sqlalchemy import select
import logging
import certifi
import ssl

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Load environment variables in order of priority
load_dotenv(PROJECT_ROOT / ".env.production")  # Load production first
load_dotenv(PROJECT_ROOT / ".env.development")  # Then development
load_dotenv(PROJECT_ROOT / ".env")  # Finally, any local overrides

app = FastAPI()

# Get infrastructure config from environment variables
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
PRODUCTION_URL = os.getenv("PRODUCTION_URL", "https://uiform-outreach-assistant.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, PRODUCTION_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    init_default_template()


@app.post("/config")
async def post_config(request: Request):
    data = await request.json()
    email = data.get("email")
    config = data.get("config")
    if not email or not config:
        return {"error": "Missing email or config"}
    save_user_config(email, config)
    return {"status": "ok"}


@app.get("/config")
async def fetch_config(email: str):
    return get_user_config(email)


@app.get("/templates")
async def fetch_templates(email: str):
    return get_user_templates(email)


@app.post("/templates")
async def create_template(request: Request):
    data = await request.json()
    email = data.get("email")
    template = data.get("template")
    if not email or not template:
        return {"error": "Missing email or template"}
    return save_template(email, template)


@app.post("/templates/upload")
async def upload_template(
        email: str = Form(...),
        file: UploadFile = File(...)):
    if not file.filename.endswith('.txt'):
        return {"error": "Only .txt files are allowed"}

    content = await file.read()
    try:
        template = {
            "name": file.filename.replace(".txt", ""),
            "content": content.decode('utf-8')
        }
        return save_template(email, template)
    except UnicodeDecodeError:
        return {"error": "Invalid text file encoding. Please use UTF-8."}


@app.delete("/templates/{template_name}")
async def remove_template(email: str, template_name: str):
    success = delete_template(email, template_name)
    return {"success": success}


@app.put("/templates/{template_name}")
async def update_template_endpoint(template_name: str, request: Request):
    data = await request.json()
    email = data.get("email")
    updated_template = data.get("template")
    if not email or not updated_template:
        return {"error": "Missing email or template"}
    result = update_template(email, template_name, updated_template)
    if result:
        return result
    return {"error": "Template not found or could not be updated"}

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, "scripts")

download_script = os.path.join(SCRIPTS_DIR, "download_contacts.py")
watch_script = os.path.join(SCRIPTS_DIR, "watch_folder.py")

logs_folder = os.path.join(PROJECT_DIR, "logs")
output_folder = os.path.join(PROJECT_DIR, "output")


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


def start_watcher():
    """Start the folder watcher process."""
    process = multiprocessing.Process(
        target=run_script_background, args=(
            watch_script,))
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


def get_folder_paths():
    """Return paths to important folders."""
    return {
        "logs": logs_folder,
        "output": output_folder
    }


active_watcher = None


@app.post("/watcher/start")
async def start_watcher(request: Request):
    """Start watching the selected folder."""
    global active_watcher

    if active_watcher and active_watcher.is_alive():
        return {"status": "already running"}

    data = await request.json()
    watch_folder = data.get("watchFolder")
    email = data.get("email")

    if not email:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Email is required",
                "code": "MISSING_EMAIL",
                "action": "Please make sure you are logged in"
            }
        )

    if not watch_folder:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Please select a folder first",
                "code": "MISSING_FOLDER",
                "action": "Click the folder icon to select a folder to watch"
            }
        )

    # Verify user configuration before starting
    try:
        config = get_user_config(email)
        if not config.get("uiform_api_key") or not config.get(
                "uiform_api_endpoint"):
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "UiForm API configuration is missing",
                    "code": "MISSING_API_CONFIG",
                    "action": "Please configure your UiForm API settings first"
                }
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to verify configuration",
                "code": "CONFIG_ERROR",
                "action": "Please try again or contact support"
            }
        )

    print(f"Starting watcher for folder: {watch_folder}")

    try:
        active_watcher = multiprocessing.Process(
            target=run_script_background,
            args=(watch_script, watch_folder, email),
            name="watcher"
        )
        active_watcher.start()
        return {"status": "ok", "message": "Watcher started successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to start watcher",
                "code": "WATCHER_START_ERROR",
                "action": "Please try again or contact support"
            }
        )


@app.post("/watcher/stop")
async def stop_watcher():
    """Stop the folder watcher."""
    global active_watcher
    try:
        if active_watcher and active_watcher.is_alive():
            active_watcher.terminate()
            active_watcher.join(timeout=5)
            if active_watcher.is_alive():
                active_watcher.kill()
            active_watcher = None
            return {"status": "ok", "message": "Watcher stopped successfully"}
        return {"status": "not running", "message": "No active watcher found"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to stop watcher",
                "code": "WATCHER_STOP_ERROR",
                "action": "Please try again or contact support"
            }
        )


@app.get("/")
async def root():
    return {"message": "API is running"}


@app.post("/select-folder")
def select_folder():
    """
    Returns a default folder path for the user's system.
    In production, this will be a fixed path that the user can configure.
    """
    # Get the user's home directory
    home_dir = os.path.expanduser("~")
    
    # Create a default watch folder in the user's home directory
    watch_folder = os.path.join(home_dir, "uiform_watch")
    
    # Create the folder if it doesn't exist
    os.makedirs(watch_folder, exist_ok=True)
    
    return {"folder": watch_folder}


@app.get("/watcher/status")
async def get_watcher_status():
    """Get the current status of the watcher."""
    global active_watcher
    return {
        "is_running": active_watcher is not None and active_watcher.is_alive(),
        "processed_files": get_processed_files() if active_watcher and active_watcher.is_alive() else []
    }


@app.post("/download-contacts")
async def download_contacts(request: Request):
    try:
        data = await request.json()
        email = data.get("email")
        sheet_url = data.get("sheet_url")
        action = data.get("action")

        if not email or not sheet_url:
            raise HTTPException(status_code=400,
                                detail="Email and sheet URL are required")

        if action == "delete":
            delete_processed_files()

        from scripts.download_contacts import download_and_clean_sheet
        download_and_clean_sheet(sheet_url, confirm=False)

        return {"message": "Contacts downloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sheet-preview")
def sheet_preview(url: str, rows: int = 5):
    """
    Retourne les `rows` premières lignes de la Google Sheet en JSON.
    """
    try:
        from scripts.download_contacts import get_sheet_preview

        preview_data = get_sheet_preview(url, rows)
        # Convert NaN values to None for JSON serialization
        cleaned_data = []
        for row in preview_data:
            cleaned_row = {}
            for k, v in row.items():
                if pd.isna(v):
                    cleaned_row[k] = None
                elif isinstance(v, str):
                    cleaned_row[k] = v
                else:
                    cleaned_row[k] = v
            cleaned_data.append(cleaned_row)
        return cleaned_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send-emails")
async def send_emails(request: Request):
    """Send outreach emails and return status updates."""
    try:
        data = await request.json()
        email = data.get("email")
        sheet_url = data.get("sheet_url")
        action = data.get("action")
        confirmed = data.get("confirmed", False)
        preview_only = data.get("preview_only", False)

        if not email or not sheet_url:
            raise HTTPException(status_code=400,
                                detail="Email and sheet URL are required")

        if action == "delete":
            delete_processed_files()

        from scripts.send_emails import run_from_ui

        async def generate():
            try:
                for message in run_from_ui(
                        sheet_url, preview_only=preview_only):
                    # Clean any NaN values from the message
                    if isinstance(message, dict):
                        message = {k: (None if pd.isna(v) else v)
                                   for k, v in message.items()}
                    # Ensure we're sending a proper JSON string
                    json_message = json.dumps(message)
                    yield f"data: {json_message}\n\n"
            except Exception as e:
                error_message = {"error": True, "message": str(e)}
                yield f"data: {json.dumps(error_message)}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_processed_files():
    """Get list of processed files."""
    processed_dir = os.path.join(PROJECT_DIR, "processed")
    if not os.path.exists(processed_dir):
        return []
    return [f for f in os.listdir(processed_dir) if f.endswith('.png')]


def delete_processed_files():
    """Delete all processed files."""
    processed_dir = os.path.join(PROJECT_DIR, "processed")
    if not os.path.exists(processed_dir):
        return

    for file in os.listdir(processed_dir):
        if file.endswith('.png'):
            os.remove(os.path.join(processed_dir, file))


@app.post("/process-image")
async def process_image(
    file: UploadFile = File(...),
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Process a single image file and extract data using UiForm API.
    The file is processed in memory without saving to disk.
    """
    if not file.filename.lower().endswith('.png'):
        raise HTTPException(status_code=400, detail="Only PNG files are supported")

    # Get user's API configuration
    config = db.query(UserConfig).filter(UserConfig.email == email).first()
    if not config or not config.uiform_api_key or not config.uiform_api_endpoint:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "UiForm API configuration is missing",
                "code": "MISSING_API_CONFIG",
                "action": "Please configure your UiForm API settings first"
            }
        )

    try:
        # Read file content
        contents = await file.read()
        logger.info(f"Processing image for user {email}, file size: {len(contents)} bytes")
        
        # Create a session with proper SSL configuration
        session = requests.Session()
        session.verify = certifi.where()  # Use certifi's certificate bundle
        
        # Log the API endpoint and headers (excluding sensitive data)
        api_url = config.uiform_api_endpoint
        headers = {
            "Authorization": "Bearer [REDACTED]",
            "Content-Type": "application/octet-stream"
        }
        logger.info(f"Making request to {api_url} with headers: {headers}")
        
        # Process with UiForm API
        response = session.post(
            api_url,
            headers={
                "Authorization": f"Bearer {config.uiform_api_key}",
                "Content-Type": "application/octet-stream"
            },
            data=contents,
            timeout=30  # Add timeout
        )
        
        logger.info(f"API Response status code: {response.status_code}")
        
        if response.status_code != 200:
            error_detail = f"UiForm API error: Status {response.status_code}, Response: {response.text}"
            logger.error(error_detail)
            raise HTTPException(
                status_code=response.status_code,
                detail=error_detail
            )
            
        return {"message": "Image processed successfully"}
        
    except requests.exceptions.SSLError as e:
        error_msg = f"SSL Error: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail={
                "message": "SSL certificate verification failed",
                "code": "SSL_ERROR",
                "error": str(e),
                "action": "Please ensure your system's SSL certificates are up to date"
            }
        )
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Connection Error: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to connect to UiForm API",
                "code": "CONNECTION_ERROR",
                "error": str(e),
                "action": "Please check your internet connection and try again"
            }
        )
    except requests.exceptions.Timeout as e:
        error_msg = f"Timeout Error: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Request to UiForm API timed out",
                "code": "TIMEOUT_ERROR",
                "error": str(e),
                "action": "Please try again later"
            }
        )
    except Exception as e:
        error_msg = f"Error processing image: {str(e)}"
        logger.error(error_msg, exc_info=True)  # Include full traceback
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to process image",
                "code": "PROCESSING_ERROR",
                "error": str(e),
                "action": "Please try again or contact support"
            }
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
