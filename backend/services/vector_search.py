import openai
import os
from dotenv import load_dotenv
from db.mongo import db

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def get_query_embedding(query: str):
    query = query.replace("\n", " ")
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    return response.data[0].embedding

def search_similar_chunks(query: str, top_k: int = 5):
    embedding = get_query_embedding(query)

    pipeline = [
        {
            "$vectorSearch": {
                "index": "default",  # name of your Atlas Vector Search index
                "path": "embedding",
                "queryVector": embedding,
                "numCandidates": 100,
                "limit": top_k
            }
        },
        {
            "$project": {
                "_id": 0,
                "lesson_id": 1,
                "page": 1,
                "text": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]

    results = db["chunks"].aggregate(pipeline)
    return list(results)
