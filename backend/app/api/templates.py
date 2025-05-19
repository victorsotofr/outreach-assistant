from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from db.config_db import (
    get_user_templates, save_template, delete_template,
    update_template, init_default_template
)

router = APIRouter()

@router.get("/templates")
async def fetch_templates(email: str):
    return get_user_templates(email)

@router.post("/templates")
async def create_template(request: Request):
    data = await request.json()
    email = data.get("email")
    template = data.get("template")
    if not email or not template:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing email or template",
                "code": "MISSING_PARAMS",
                "action": "Please provide both email and template"
            }
        )
    return save_template(email, template)

@router.post("/templates/upload")
async def upload_template(
        email: str = Form(...),
        file: UploadFile = File(...)):
    if not file.filename.endswith('.txt'):
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid file type",
                "code": "INVALID_FILE_TYPE",
                "action": "Only .txt files are allowed"
            }
        )

    content = await file.read()
    try:
        template = {
            "name": file.filename.replace(".txt", ""),
            "content": content.decode('utf-8')
        }
        return save_template(email, template)
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid text file encoding",
                "code": "INVALID_ENCODING",
                "action": "Please use UTF-8 encoding"
            }
        )

@router.delete("/templates/{template_name}")
async def remove_template(email: str, template_name: str):
    success = delete_template(email, template_name)
    return {"success": success}

@router.put("/templates/{template_name}")
async def update_template_endpoint(template_name: str, request: Request):
    data = await request.json()
    email = data.get("email")
    updated_template = data.get("template")
    if not email or not updated_template:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing email or template",
                "code": "MISSING_PARAMS",
                "action": "Please provide both email and template"
            }
        )
    result = update_template(email, template_name, updated_template)
    if result:
        return result
    raise HTTPException(
        status_code=404,
        detail={
            "message": "Template not found or could not be updated",
            "code": "TEMPLATE_NOT_FOUND",
            "action": "Please check the template name and try again"
        }
    ) 