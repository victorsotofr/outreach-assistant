import os
import logging
import requests
import certifi
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from db.config_db import get_db, UserConfig

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/process-image")
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
        
        # Decrypt the API endpoint
        from db.config_db import encryption
        try:
            api_url = encryption.decrypt(config.uiform_api_endpoint)
            if not api_url.startswith(('http://', 'https://')):
                raise ValueError("Invalid API endpoint URL")
        except Exception as e:
            logger.error(f"Failed to decrypt API endpoint: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Failed to decrypt API configuration",
                    "code": "DECRYPTION_ERROR",
                    "error": str(e),
                    "action": "Please reconfigure your API settings"
                }
            )
        
        # Log the API endpoint and headers (excluding sensitive data)
        headers = {
            "Authorization": "Bearer [REDACTED]",
            "Content-Type": "multipart/form-data"
        }
        logger.info(f"Making request to {api_url} with headers: {headers}")
        
        # Prepare the file for upload
        files = {
            'file': (file.filename, contents, 'image/png')
        }
        
        # Process with UiForm API
        response = session.post(
            api_url,
            headers={
                "Authorization": f"Bearer {config.uiform_api_key}"
            },
            files=files,
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
