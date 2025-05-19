from fastapi import APIRouter, Request, HTTPException
from db.config_db import save_user_config, get_user_config

router = APIRouter()

@router.post("/config")
async def post_config(request: Request):
    data = await request.json()
    email = data.get("email")
    config = data.get("config")
    if not email or not config:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing email or config",
                "code": "MISSING_PARAMS",
                "action": "Please provide both email and config"
            }
        )
    save_user_config(email, config)
    return {"status": "ok"}

@router.get("/config")
async def fetch_config(email: str):
    return get_user_config(email) 