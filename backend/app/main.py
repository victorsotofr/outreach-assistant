import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.settings import FRONTEND_URL, PRODUCTION_URL
from .api import config, templates, watcher, sheets
from db.config_db import init_default_template

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, PRODUCTION_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize default template on startup
@app.on_event("startup")
async def startup_event():
    init_default_template()

# Include routers
app.include_router(config.router, prefix="/api", tags=["config"])
app.include_router(templates.router, prefix="/api", tags=["templates"])
app.include_router(watcher.router, prefix="/api", tags=["watcher"])
app.include_router(sheets.router, prefix="/api", tags=["sheets"])

@app.get("/")
async def root():
    return {"message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 