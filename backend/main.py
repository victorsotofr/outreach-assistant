from api import chat_routes
from fastapi import FastAPI
from api import pdf_routes, search_routes

app = FastAPI(title="Finance Interviewer API")

app.include_router(pdf_routes.router, prefix="/api/pdf", tags=["PDF"])
app.include_router(chat_routes.router, prefix="/api", tags=["Free Chat"])
app.include_router(search_routes.router, prefix="/api", tags=["Search"])
