from fastapi import FastAPI

from app.api.routes.demo import router as demo_router
from app.api.routes.health import router as health_router
from app.api.v1.chat import router as v1_chat_router
from app.api.v1.ingest import router as v1_ingest_router

app = FastAPI(
    title="Chatbot Builder AI Service",
    description="FastAPI service for AI processing, website crawling, semantic retrieval, and RAG answer generation.",
    version="0.1.0",
)

# Register route modules
app.include_router(health_router)
app.include_router(demo_router)
app.include_router(v1_chat_router, prefix="/api/v1")
app.include_router(v1_ingest_router, prefix="/api/v1")


@app.delete("/vector-store/{chatbot_id}")
async def delete_vector_store(chatbot_id: str):
    """Direct alias to clean up chatbot vector store."""
    from app.services.vector_store import vector_store
    clean_bot_id = chatbot_id.strip()
    try:
        return vector_store.delete_chatbot_content(chatbot_id=clean_bot_id)
    except Exception as exc:
        return {"chatbot_id": clean_bot_id, "success": False, "error_message": str(exc)}

