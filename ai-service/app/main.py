from fastapi import FastAPI

from app.api.routes.demo import router as demo_router
from app.api.routes.health import router as health_router
from app.api.v1.chat import router as v1_chat_router

app = FastAPI(
    title="Chatbot Builder AI Service",
    description="FastAPI service for AI processing, website crawling, semantic retrieval, and RAG answer generation.",
    version="0.1.0",
)

# Register route modules
app.include_router(health_router)
app.include_router(demo_router)
app.include_router(v1_chat_router, prefix="/api/v1")
