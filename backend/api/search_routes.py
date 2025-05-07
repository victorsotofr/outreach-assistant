from fastapi import APIRouter, Query
from services.vector_search import search_similar_chunks

router = APIRouter()

@router.get("/search")
def search(query: str = Query(...), top_k: int = 5):
    results = search_similar_chunks(query, top_k=top_k)
    return {"query": query, "results": results}
