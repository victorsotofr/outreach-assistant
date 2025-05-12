import os
import re
import sys
import json
import smtplib
import time
import pandas as pd
import requests
from datetime import datetime
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from openai import OpenAI
import io
from db.config_db import get_user_templates

# === PATH SETUP ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

# === EMAIL CONFIG ===
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
FROM_EMAIL = SMTP_USERNAME

# === DATA PATHS ===
UPDATED_LIST_PATH = os.path.expanduser("~/Downloads/updated_contact_list.xlsx")
SENT_EMAILS_PATH = os.path.expanduser("~/Downloads/sent_emails.json")

# === OpenAI Client ===
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_templates(email):
    """Get templates from the database for the given user."""
    templates = get_user_templates(email)
    if not templates:
        raise ValueError("No templates found for user")
    
    # Find the French and English templates
    template_fr = None
    template_en = None
    
    for template in templates:
        if template.get("name", "").lower() == "template_fr":
            template_fr = template.get("content", "")
        elif template.get("name", "").lower() == "template_en":
            template_en = template.get("content", "")
    
    if not template_fr or not template_en:
        raise ValueError("Both French and English templates must be configured")
    
    return template_fr, template_en

def load_sent_emails():
    if os.path.exists(SENT_EMAILS_PATH):
        try:
            with open(SENT_EMAILS_PATH, 'r') as f:
                return set(json.load(f))
        except:
            return set()
    return set()

def save_sent_email(email):
    sent_emails = load_sent_emails()
    sent_emails.add(email)
    with open(SENT_EMAILS_PATH, 'w') as f:
        json.dump(list(sent_emails), f)

def extract_sheet_id(url):
    pattern = r'/d/([a-zA-Z0-9-_]+)'
    match = re.search(pattern, url)
    if not match:
        raise ValueError("Invalid Google Sheet URL")
    return match.group(1)

def get_sheet_csv_url(sheet_url):
    sheet_id = extract_sheet_id(sheet_url)
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"

def get_sheet_data(sheet_url):
    csv_url = get_sheet_csv_url(sheet_url)
    response = requests.get(csv_url, timeout=10)
    response.raise_for_status()
    return pd.read_csv(io.BytesIO(response.content), encoding="utf-8")

def enrich_contact(contact):
    prompt = f"""
You are helping personalize professional emails for business executives. Here is the contact's information:

First Name: {contact['first_name']}
Last Name: {contact['last_name']}
Role: {contact['role']}
Company: {contact['company']}
Location: {contact['location']}

Tasks:
1. Determine the preferred language ("French" or "English") according to the following logic:
   - If the location mentions France or a French-speaking city (e.g., Paris, Lyon, Marseille, Geneva, Brussels), choose "French".
   - If the location is in an English-speaking country (e.g., UK, USA, Canada except Quebec), choose "English".
   - If you cannot determine from the location, try to guess from the first name (Luc, Pierre, Claire → commonly French; John, James, Emma → commonly English).
   - If still uncertain, default to "English" for safety.

2. Assign an appropriate civility:
   - If French: "Monsieur" or "Madame" (based on first name gender).
   - If English: "Mr" or "Ms".

3. Enrich with company HQ, FTEs, and a short description - in English.
   - HQ: "Paris" for BNP Paribas, "Boston" for BCG, "Paris" for TotalEnergies, etc.
   - FTEs: "~100k" for BNP Paribas, "~600" for Alan, etc.
   - Description: A short description resuming the company's activity - be concise and precise, for example: "Independent Equity & Credit Research", "Corporate & Investment Bank (Equity Research)", "Independent Equity Research", etc.
   Pay attention that those information are the same if the company appears multiple times.
   - If you cannot find the information, return "".

Respond ONLY in JSON format like:
{{
  "language": "...",
  "civility": "...",
  "hq": "...",
  "ftes": "...",
  "description": "..."
}}
"""
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
    )
    raw_text = response.choices[0].message.content
    cleaned = re.sub(r"^```(?:json)?", "", raw_text.strip())
    cleaned = re.sub(r"```$", "", cleaned.strip())
    return json.loads(cleaned)

def get_school(education):
    if pd.isna(education):
        return "École polytechnique"
    return "HEC Paris" if str(education).strip().lower() == "hec paris" else "École polytechnique"

def get_subject(language, school):
    return f"{school} * {'Projet de Structuration de Données' if language == 'French' else 'Structured Data Project'}"

def fill_template(template, placeholders):
    for key, value in placeholders.items():
        template = template.replace(f"[{key.upper()}]", value)
    return template

def send_email(to_email, subject, body):
    msg = MIMEMultipart()
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Bcc"] = FROM_EMAIL
    msg.attach(MIMEText(body, "html"))
    
    # Create a single SMTP connection for all emails
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            return True
    except Exception as e:
        return str(e)

def run_from_ui(sheet_url, preview_only=False, email=None):
    if not sheet_url:
        yield json.dumps({"type": "error", "message": "Google Sheet URL is required"})
        return
    
    if not email:
        yield json.dumps({"type": "error", "message": "User email is required"})
        return

    try:
        # Get templates from database
        template_fr, template_en = get_templates(email)
        
        # Read from Google Sheet
        df = get_sheet_data(sheet_url)
        if df.empty:
            yield json.dumps({"type": "error", "message": "No data found in the Google Sheet"})
            return

        # Validate required columns
        required_columns = ['first_name', 'last_name', 'email', 'company', 'role', 'education', 'location']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            yield json.dumps({"type": "error", "message": f"Missing required columns: {', '.join(missing_columns)}"})
            return

        # Send all contacts for preview
        preview_data = df.to_dict('records')
        yield json.dumps({"type": "preview", "data": preview_data})
        
        # If this is just a preview request, stop here
        if preview_only:
            return

        enriched_rows = []
        today_str = datetime.today().strftime("%B %d, %Y")
        processed_emails = set()  # Track emails processed in this run

        # Create a single SMTP connection for all emails
        server = None
        try:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            yield json.dumps({"type": "status", "message": "✓ SMTP connection established"})

            for _, row in df.iterrows():
                email = row['email']
                if email in processed_emails:
                    yield json.dumps({"type": "status", "message": f"✕ Skipping duplicate email {email}"})
                    continue

                processed_emails.add(email)
                msg = f"...preparing email for {row['first_name']} {row['last_name']} ({email})..."
                yield json.dumps({"type": "status", "message": msg})

                try:
                    enriched = enrich_contact(row)
                    civility = enriched["civility"]
                    language = enriched["language"]
                    hq = enriched.get("hq", "")
                    ftes = enriched.get("ftes", "")
                    description = enriched.get("description", "")
                    school = get_school(row["education"])
                    subject = get_subject(language, school)

                    placeholders = {
                        "CIVILITÉ": civility,
                        "CIVILITY": civility,
                        "LAST_NAME": row["last_name"],
                        "COMPANY": row["company"],
                        "SCHOOL": school
                    }

                    template = template_fr if language == "French" else template_en
                    email_body = fill_template(template, placeholders)

                    # Create and send email using the existing connection
                    msg = MIMEMultipart()
                    msg["From"] = FROM_EMAIL
                    msg["To"] = email
                    msg["Subject"] = subject
                    msg["Bcc"] = FROM_EMAIL
                    msg.attach(MIMEText(email_body, "html"))

                    try:
                        # Verify SMTP connection is still active
                        if not server.noop()[0] == 250:
                            yield json.dumps({"type": "error", "message": "SMTP connection lost, reconnecting..."})
                            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                            server.starttls()
                            server.login(SMTP_USERNAME, SMTP_PASSWORD)

                        server.send_message(msg)
                        enriched_rows.append({
                            "company": row["company"],
                            "account_owner": "",
                            "status": "Contacted",
                            "industry": "",
                            "HQ": hq,
                            "FTEs": ftes,
                            "description": description,
                            "first_name": row["first_name"],
                            "last_name": row["last_name"],
                            "email": email,
                            "role": row["role"],
                            "education": row["education"],
                            "location": row["location"],
                            "notes": "",
                            "added": "",
                            "last_contact": today_str
                        })

                        yield json.dumps({"type": "status", "message": f"✓ Email sent to {email}"})
                        time.sleep(2)
                    except Exception as e:
                        yield json.dumps({"type": "error", "message": f"Failed to send email to {email}: {str(e)}"})
                        continue

                except Exception as e:
                    yield json.dumps({"type": "error", "message": f"Error processing {email}: {str(e)}"})
                    continue

        except Exception as e:
            yield json.dumps({"type": "error", "message": f"SMTP connection error: {str(e)}"})
            return
        finally:
            if server:
                try:
                    server.quit()
                    yield json.dumps({"type": "status", "message": "✓ SMTP connection closed"})
                except:
                    pass

        if not enriched_rows:
            yield json.dumps({"type": "error", "message": "No emails were sent successfully"})
            return

        # Save updated contact list to Downloads
        final_df = pd.DataFrame(enriched_rows)
        grouped_df = final_df.groupby("company").agg(lambda x: "\n".join(x.dropna().astype(str).unique())).reset_index()
        ordered_cols = [
            "company", "account_owner", "status", "industry", "HQ", "FTEs", "description",
            "first_name", "last_name", "email", "role", "education", "location", "notes", "added", "last_contact"
        ]

        grouped_df[ordered_cols].to_excel(UPDATED_LIST_PATH, index=False, engine='openpyxl')
        yield json.dumps({"type": "status", "message": f"→ Updated contact list saved to: {UPDATED_LIST_PATH}"})

    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)})

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("❌ Please provide the Google Sheet URL and user email")
        sys.exit(1)

    sheet_url = sys.argv[1]
    email = sys.argv[2]
    for message in run_from_ui(sheet_url, email=email):
        print(message)
