from fastapi import FastAPI

from app.api.routes.health import router as health_router

app = FastAPI(
    title="Chatbot Builder AI Service",
    description="FastAPI service for AI processing, website crawling, and knowledge base retrieval.",
    version="0.1.0",
)

# Register route modules
app.include_router(health_router)
