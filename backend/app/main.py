import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Other settings imports can be added here as needed
from .api import config, templates, watcher, sheets, images
from db.config_db import init_default_template

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS for NextAuth compatibility
origins = [
    "http://localhost:3000",
    "https://outreach-assistant.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize default template on startup
@app.on_event("startup")
async def startup_event():
    init_default_template()

# Include routers (no prefix to maintain compatibility with frontend)
app.include_router(config.router, tags=["config"])
app.include_router(templates.router, tags=["templates"])
app.include_router(watcher.router, tags=["watcher"])
app.include_router(sheets.router, tags=["sheets"])
app.include_router(images.router, tags=["images"])

@app.get("/")
async def root():
    return {"message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 