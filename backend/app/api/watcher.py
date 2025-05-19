import os
import multiprocessing
from fastapi import APIRouter, Request, HTTPException
from db.config_db import get_user_config
from ..core.subprocesses import run_script_background
from ..core.settings import WATCH_SCRIPT

router = APIRouter()

active_watcher = None

@router.post("/watcher/start")
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
        if not config.get("uiform_api_key") or not config.get("uiform_api_endpoint"):
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
            args=(WATCH_SCRIPT, watch_folder, email),
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

@router.post("/watcher/stop")
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

@router.get("/watcher/status")
async def get_watcher_status():
    """Get the current status of the watcher."""
    global active_watcher
    return {
        "is_running": active_watcher is not None and active_watcher.is_alive(),
        "processed_files": get_processed_files() if active_watcher and active_watcher.is_alive() else []
    }

def get_processed_files():
    """Get list of processed files."""
    processed_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "processed")
    if not os.path.exists(processed_dir):
        return []
    return [f for f in os.listdir(processed_dir) if f.endswith('.png')]

def delete_processed_files():
    """Delete all processed files."""
    processed_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "processed")
    if not os.path.exists(processed_dir):
        return

    for file in os.listdir(processed_dir):
        if file.endswith('.png'):
            os.remove(os.path.join(processed_dir, file)) 