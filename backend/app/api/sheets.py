import os
import pandas as pd
from fastapi import APIRouter, Request, HTTPException, FileResponse
from fastapi.responses import StreamingResponse
from scripts.download_contacts import download_and_clean_sheet, get_sheet_preview, DOWNLOADS_PATH
from scripts.send_emails import run_from_ui

router = APIRouter()

@router.post("/download-contacts")
async def download_contacts(request: Request):
    try:
        data = await request.json()
        email = data.get("email")
        sheet_url = data.get("sheet_url")
        action = data.get("action")

        if not email or not sheet_url:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Email and sheet URL are required",
                    "code": "MISSING_PARAMS",
                    "action": "Please provide both email and sheet URL"
                }
            )

        if action == "delete":
            from .watcher import delete_processed_files
            delete_processed_files()

        download_and_clean_sheet(sheet_url, confirm=False)

        # Check if the file exists
        if not os.path.exists(DOWNLOADS_PATH):
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Failed to create contact list file",
                    "code": "FILE_CREATION_ERROR",
                    "action": "Please try again or contact support"
                }
            )

        # Return the file directly
        return FileResponse(
            DOWNLOADS_PATH,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename="contact_list.xlsx"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": str(e),
                "code": "DOWNLOAD_ERROR",
                "action": "Please try again or contact support"
            }
        )

@router.get("/sheet-preview")
def sheet_preview(url: str, rows: int = 5):
    """Return the first `rows` rows of the Google Sheet as JSON."""
    try:
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
        raise HTTPException(
            status_code=500,
            detail={
                "message": str(e),
                "code": "PREVIEW_ERROR",
                "action": "Please try again or contact support"
            }
        )

@router.post("/send-emails")
async def send_emails(request: Request):
    try:
        data = await request.json()
        email = data.get("email")
        sheet_url = data.get("sheet_url")
        confirmed = data.get("confirmed", False)
        use_cc = data.get("use_cc", False)
        
        if not email or not sheet_url:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Email and sheet URL are required",
                    "code": "MISSING_PARAMS",
                    "action": "Please provide both email and sheet URL"
                }
            )
        
        if not confirmed:
            # Return preview data
            return StreamingResponse(
                run_from_ui(sheet_url, preview_only=True, email=email),
                media_type="text/event-stream"
            )
        
        # Send emails
        return StreamingResponse(
            run_from_ui(sheet_url, email=email, use_cc=use_cc),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": str(e),
                "code": "EMAIL_ERROR",
                "action": "Please try again or contact support"
            }
        ) 