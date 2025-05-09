import os
import re
import sys
import json
import smtplib
import time
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from openai import OpenAI

# === PATH SETUP ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

# === DATA PATHS ===
CONTACT_LIST_PATH = os.path.join(PROJECT_ROOT, "contact_lists", "contact_list.csv")
TEMPLATE_FR_PATH = os.path.join(PROJECT_ROOT, "templates", "template_fr.txt")
TEMPLATE_EN_PATH = os.path.join(PROJECT_ROOT, "templates", "template_en.txt")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")
OLD_OUTPUT_DIR = os.path.join(OUTPUT_DIR, "_Old")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# === Load Templates Once ===
with open(TEMPLATE_FR_PATH, "r", encoding="utf-8") as f:
    template_fr = f.read()

with open(TEMPLATE_EN_PATH, "r", encoding="utf-8") as f:
    template_en = f.read()


# === Config loading at runtime ===
def load_config():
    return {
        "SMTP_USERNAME": os.getenv("SMTP_USERNAME"),
        "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD"),
        "SMTP_SERVER": os.getenv("SMTP_SERVER"),
        "SMTP_PORT": int(os.getenv("SMTP_PORT", "587")),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY")
    }


def enrich_contact(contact, client):
    prompt = f"""
You are helping personalize professional emails for business executives. Here is the contact's information:

First Name: {contact['first_name']}
Last Name: {contact['last_name']}
Role: {contact['role']}
Company: {contact['company']}
Location: {contact['location']}

Tasks:
1. Determine the preferred language ("French" or "English")...
[truncated here for brevity — same as your original prompt]
"""
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
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


def send_email(to_email, subject, body, config):
    msg = MIMEMultipart()
    msg["From"] = config["SMTP_USERNAME"]
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Bcc"] = config["SMTP_USERNAME"]
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(config["SMTP_SERVER"], config["SMTP_PORT"]) as server:
            server.starttls()
            server.login(config["SMTP_USERNAME"], config["SMTP_PASSWORD"])
            server.send_message(msg)
        return True
    except Exception as e:
        return str(e)


def run_from_ui():
    config = load_config()
    client = OpenAI(api_key=config["OPENAI_API_KEY"])

    df = pd.read_csv(CONTACT_LIST_PATH)
    enriched_rows = []
    today_str = datetime.today().strftime("%B %d, %Y")

    for _, row in df.iterrows():
        msg = f"...preparing email for {row['first_name']} {row['last_name']} ({row['email']})..."
        print(msg)
        yield msg

        enriched = enrich_contact(row, client)
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

        send_email(row["email"], subject, email_body, config)

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
            "email": row["email"],
            "role": row["role"],
            "education": row["education"],
            "location": row["location"],
            "notes": "",
            "added": "",
            "last_contact": today_str
        })

        yield f"✓ Email sent to {row['email']}"
        time.sleep(2)

    # Backup existing output
    old_path = os.path.join(OUTPUT_DIR, "updated_contact_list.csv")
    if os.path.exists(old_path):
        os.makedirs(OLD_OUTPUT_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        backup_name = f"updated_contact_list_{timestamp}.csv"
        os.rename(old_path, os.path.join(OLD_OUTPUT_DIR, backup_name))

    # Aggregate and save output
    final_df = pd.DataFrame(enriched_rows)
    grouped_df = final_df.groupby("company").agg(lambda x: "\n".join(x.dropna().astype(str).unique())).reset_index()
    ordered_cols = [
        "company", "account_owner", "status", "industry", "HQ", "FTEs", "description",
        "first_name", "last_name", "email", "role", "education", "location", "notes", "added", "last_contact"
    ]

    output_path = os.path.join(OUTPUT_DIR, "updated_contact_list.csv")
    grouped_df[ordered_cols].to_csv(output_path, index=False)
    yield f"📋 Contact list updated and saved to: {output_path}"


if __name__ == "__main__":
    if "--no-confirm" not in sys.argv:
        confirm = input("⚠️  Did you check & download your latest contact list? Type \"yes\" to proceed: ").strip().lower()
        if confirm != "yes":
            print("❌ Aborted.")
            sys.exit()

    for message in run_from_ui():
        print(message)
