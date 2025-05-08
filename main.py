import streamlit as st
import subprocess
import os
import sys
import multiprocessing
import time
import backend.scripts.send_emails as send_emails_module
from PIL import Image

# === Setup ===
st.set_page_config(page_title="UiForm - Outreach Assitant", page_icon="uiform_logo.png", layout="centered")
st.title("UiForm - Outreach Assistant")


PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_DIR, "backend")
SCRIPTS_DIR = os.path.join(BACKEND_DIR, "scripts")

download_script = os.path.join(SCRIPTS_DIR, "download_contacts.py")
watch_script = os.path.join(SCRIPTS_DIR, "watch_folder.py")

logs_folder = os.path.join(BACKEND_DIR, "logs")
output_folder = os.path.join(BACKEND_DIR, "output")
contact_list_folder = os.path.join(BACKEND_DIR, "contact_lists")

# === Watcher Process
if "watcher_process" not in st.session_state:
    st.session_state.watcher_process = None

def start_watcher():
    if st.session_state.watcher_process is None or not st.session_state.watcher_process.is_alive():
        st.session_state.watcher_process = multiprocessing.Process(target=run_script_background, args=(watch_script,))
        st.session_state.watcher_process.start()

def stop_watcher():
    if st.session_state.watcher_process and st.session_state.watcher_process.is_alive():
        st.session_state.watcher_process.terminate()
        st.session_state.watcher_process = None

def run_script(script_path):
    result = subprocess.run(
        [sys.executable, script_path, "--no-confirm"], 
        capture_output=True,
        text=True
    )
    return result.stdout + "\n" + result.stderr


def run_script_background(script_path):
    """Helper to run scripts in background (used by watcher)."""
    os.system(f"{sys.executable} {script_path}")

def open_folder_message(path, label):
    st.markdown(f"**{label}**: `{path}`\n\n> Open manually from your Finder/Explorer.")

# === UI ===
with st.container():
    st.info("""
**How It Works:**
1. START & STOP
> Automatically processes your screenshots from the 'Downloads' folder to enrich the contact list.
2. DOWNLOAD 
> Takes and filters the enriched contact list from Google Sheets.
3. SEND 
> Triggers the sending of personalized outreach emails, and returns an updated contact list.
            
🔥 You are now ready to accelerate outreach with UiForm.
""")

# === Step 1: Watch Folder
with st.expander("➤ START & STOP"):
    if st.button("▶️ Start Watching Screenshots"):
        start_watcher()
        st.success("🟢 Watcher started.")
    if st.button("⏹️ Stop Watching Screenshots"):
        stop_watcher()
        st.warning("🛑 Watcher stopped.")

# === Step 2: Download & Clean Contact List
with st.expander("➤ DOWNLOAD"):
    st.warning("⚠️ This will overwrite your current `contact_list.csv`.\nA backup will be stored in `_Old` folder.")
    if st.button("📩 Download Latest Contact List"):
        with st.spinner("Downloading from Google Sheets and filtering..."):
            output = run_script(download_script)
            st.success("✅ Done! Your list is ready.")
            st.code(output, language="bash")
            open_folder_message(contact_list_folder, "Contact List Folder")
            open_folder_message(logs_folder, "📂 Logs Folder")

# === Step 3: Send Emails
with st.expander("➤ SEND"):
    confirmed = st.checkbox("⚠️ I confirm that I reviewed the contact list.")
    if st.button("📨 Send Emails", disabled=not confirmed):
        with st.spinner("Sending emails..."):
            status_placeholder = st.empty()
            for msg in send_emails_module.run_from_ui():
                status_placeholder.text(msg)
            st.success("✅ All emails have been sent.")
            open_folder_message(output_folder, "📋 See Updated Contact List")

# === Bottom
st.markdown("---")
st.caption("Built by with 🤍 by Victor Soto for UiForm.")