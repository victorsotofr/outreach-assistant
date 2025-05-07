from fastapi import APIRouter, UploadFile, File
from typing import List
from utils.pdf_parser import extract_pdf_chunks
from services.embedding import get_embedding
from db.mongo import db

router = APIRouter()

@router.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    total_chunks = 0
    for file in files:
        contents = await file.read()
        chunks = extract_pdf_chunks(contents, file.filename)
        for chunk in chunks:
            chunk["embedding"] = get_embedding(chunk["text"])
        db["chunks"].insert_many(chunks)
        total_chunks += len(chunks)

    return {"message": f"{total_chunks} chunks stored across {len(files)} file(s)."}
