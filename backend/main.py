import os
import sys
import multiprocessing
import subprocess
from scripts import send_emails
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.config_db import save_user_config, get_user_config, get_user_templates, save_template, delete_template, update_template

# === Setup ===
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Template endpoints
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
async def upload_template(email: str = Form(...), file: UploadFile = File(...)):
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

# === Core Functions ===
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
        "output": output_folder
    }

# Track active watcher process
active_watcher = None

@app.post("/watcher/start")
async def start_watcher(request: Request):
    """Start watching the selected folder."""
    global active_watcher
    
    # Check if watcher is already running
    if active_watcher and active_watcher.is_alive():
        return {"status": "already running"}
    
    data = await request.json()
    watch_folder = data.get("watchFolder", "/Users/victorsoto/Downloads")
    email = data.get("email")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    print(f"Starting watcher for folder: {watch_folder}")
    
    active_watcher = multiprocessing.Process(
        target=run_script_background,
        args=(watch_script, watch_folder, email),
        name="watcher"
    )
    active_watcher.start()
    return {"status": "ok"}

@app.post("/watcher/stop")
async def stop_watcher():
    """Stop the folder watcher."""
    global active_watcher
    try:
        if active_watcher and active_watcher.is_alive():
            active_watcher.terminate()
            active_watcher = None
            return {"status": "ok"}
        return {"status": "not running"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
async def root():
    return {"message": "API is running"}

@app.post("/select-folder")
async def select_folder():
    """Open a folder selection dialog and return the selected path."""
    print("Select folder endpoint called")  # Debug log
    try:
        # Simpler AppleScript to open folder picker
        script = 'choose folder with prompt "Select a folder to watch for screenshots"'
        print("Executing AppleScript...")
        result = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
        print(f"AppleScript result: {result.stdout}")
        print(f"AppleScript error: {result.stderr}")
        
        if result.returncode == 0 and result.stdout.strip():
            # Convert Mac path to POSIX path
            posix_script = f'return POSIX path of "{result.stdout.strip()}"'
            posix_result = subprocess.run(['osascript', '-e', posix_script], capture_output=True, text=True)
            selected_path = posix_result.stdout.strip()
            print(f"Selected path: {selected_path}")
            return {"folder": selected_path}
        else:
            error_msg = result.stderr or "No folder selected"
            print(f"Error selecting folder: {error_msg}")
            return {"error": error_msg}
    except Exception as e:
        print(f"Exception in select_folder: {str(e)}")
        return {"error": str(e)}

@app.post("/download-contacts")
async def download_contacts(request: Request):
    try:
        data = await request.json()
        email = data.get("email")
        sheet_url = data.get("sheet_url")

        if not email or not sheet_url:
            raise HTTPException(status_code=400, detail="Email and sheet URL are required")

        # Call the download script
        from scripts.download_contacts import download_and_clean_sheet
        download_and_clean_sheet(sheet_url, confirm=False)
        
        return {"message": "Contacts downloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sheet-preview")
async def get_sheet_preview(url: str):
    """Get a preview of the first 5 rows from the Google Sheet."""
    try:
        from scripts.download_contacts import get_sheet_preview
        data = get_sheet_preview(url, rows=5)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 