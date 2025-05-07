from fastapi import APIRouter
from pydantic import BaseModel
from services.vector_search import search_similar_chunks
import openai
import os
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

router = APIRouter()

class FreeChatInput(BaseModel):
    question: str

@router.post("/free-chat")
def free_chat(input: FreeChatInput):
    # 1. Search similar chunks
    context_chunks = search_similar_chunks(input.question, top_k=5)

    # 2. Build prompt
    context = "\n---\n".join([chunk["text"] for chunk in context_chunks])
    prompt = f"""You are a helpful finance tutor. 
Use the following context from a lesson to answer the student's question:

Context:
{context}

Question:
{input.question}

Answer:"""

    # 3. Call OpenAI
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )

    answer = response.choices[0].message.content.strip()
    return {
        "question": input.question,
        "answer": answer,
        "context_used": context_chunks
    }
