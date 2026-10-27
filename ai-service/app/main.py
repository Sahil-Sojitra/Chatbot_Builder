import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status

from app.api.routes.health import router as health_router
from app.api.v1.chat import router as v1_chat_router
from app.api.v1.ingest import router as v1_ingest_router
from app.core.config import Settings, get_settings
from app.core.internal_auth import verify_internal_api_key
from app.core.logging_config import RequestLoggingMiddleware, setup_logging

# Initialize high-visibility ANSI colored logging
setup_logging()
logger = logging.getLogger("ai_service.main")


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    """Application factory for Chatbot Builder FastAPI AI Service.

    Configures environment-based route mounting and startup security validations.
    """
    current_settings = settings or get_settings()

    # Pre-startup validation: In production, immediately enforce INTERNAL_API_KEY presence
    current_settings.validate_internal_api_key()

    @asynccontextmanager
    async def lifespan(app_instance: FastAPI):
        # ASGI lifespan check ensuring settings remain valid when workers start
        current_settings.validate_internal_api_key()
        yield

    app_instance = FastAPI(
        title="Chatbot Builder AI Service",
        description="FastAPI service for AI processing, website crawling, semantic retrieval, and RAG answer generation.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Intercept and log all inbound HTTP requests and latencies (never logs headers/secrets)
    app_instance.add_middleware(RequestLoggingMiddleware)

    # 1. Health check route (Always registered, lightweight, unauthenticated)
    app_instance.include_router(health_router)

    # 2. Demo testing routes (ONLY registered in development or testing environments)
    if current_settings.should_register_demo_routes():
        from app.api.routes.demo import router as demo_router
        app_instance.include_router(demo_router)
        logger.info(
            f"Mounted /demo routes for environment '{current_settings.normalized_environment}'."
        )
    else:
        logger.info(
            f"Production mode active ('{current_settings.normalized_environment}'): /demo routes omitted."
        )

    # 3. Customer-facing & internal v1 routes (Protected via internal API key)
    app_instance.include_router(v1_chat_router, prefix="/api/v1")
    app_instance.include_router(v1_ingest_router, prefix="/api/v1")

    # 4. Direct vector-store cleanup endpoint (Protected via internal API key)
    @app_instance.delete(
        "/vector-store/{chatbot_id}",
        dependencies=[Depends(verify_internal_api_key)],
        tags=["Vector Store"],
        summary="Delete all vector embeddings for a chatbot",
    )
    async def delete_vector_store(chatbot_id: str):
        """Direct alias to clean up chatbot vector store."""
        from app.services.vector_store import vector_store
        clean_bot_id = chatbot_id.strip()
        if not clean_bot_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chatbot ID must not be empty.",
            )

        try:
            result = vector_store.delete_chatbot_content(chatbot_id=clean_bot_id)
            if hasattr(result, "success") and not result.success:
                logger.error(f"Vector store deletion returned unsuccessful for chatbot '{clean_bot_id}'")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to delete vector store content.",
                )
            return result
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Failed to delete vector store for chatbot '{clean_bot_id}': {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete vector store content.",
            )

    return app_instance


# Default application instance for ASGI servers (e.g. Uvicorn)
app = create_app()
