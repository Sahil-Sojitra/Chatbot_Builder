import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.internal_auth import verify_internal_api_key
from app.services.qa import qa_service, QARequest, QAResponse
from app.services.retrieval import RetrievalError, InvalidQueryError
from app.services.generator import (
    GenerationError,
    GenerationTimeoutError,
    GenerationProviderError,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["Chat & Question Answering (v1)"],
    dependencies=[Depends(verify_internal_api_key)],
)


@router.post(
    "/ask",
    response_model=QAResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit question to chatbot knowledge base",
    description=(
        "Executes RAG pipeline: retrieves semantically relevant website passages "
        "first, then synthesizes a strictly grounded answer with source citations second."
    ),
)
async def ask_chatbot_question(payload: QARequest) -> QAResponse:
    """Thin route handler delegating directly to RAGQuestionAnsweringService."""
    try:
        return await qa_service.aanswer_question(payload)
    except InvalidQueryError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except GenerationTimeoutError as exc:
        logger.error(f"Generation timeout for chatbot '{payload.chatbot_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Answer generation timed out: {exc}",
        )
    except GenerationProviderError as exc:
        logger.error(f"Upstream LLM provider error for chatbot '{payload.chatbot_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream LLM provider failure: {exc}",
        )
    except (RetrievalError, GenerationError) as exc:
        logger.error(f"Internal RAG error for chatbot '{payload.chatbot_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG service error: {exc}",
        )
    except Exception as exc:
        logger.exception(f"Unexpected error processing question for chatbot '{payload.chatbot_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the request.",
        )


@router.post(
    "/message",
    response_model=QAResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit chat message (alias to /ask)",
    include_in_schema=True,
)
async def message_chatbot(payload: QARequest) -> QAResponse:
    """Alias endpoint for /ask to support standard chat message semantics."""
    return await ask_chatbot_question(payload)
