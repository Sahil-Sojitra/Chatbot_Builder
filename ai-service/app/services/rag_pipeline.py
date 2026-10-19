"""RAG Question Answering (QA) orchestration pipeline service."""

import logging
import time
from typing import Optional

from app.core.brand import extract_brand_name
from app.core.exceptions import (
    GenerationError,
    GenerationProviderError,
    GenerationTimeoutError,
    InvalidQueryError,
    RetrievalError,
)
from app.models.generator import SourceReference
from app.models.qa import (
    QARequest,
    QAResponse,
    QAStats,
)
from app.services.generator import (
    LLMGenerationAdapter,
    generator_service as default_generator_service,
)
from app.services.retrieval import (
    KnowledgeRetrievalService,
    retrieval_service as default_retrieval_service,
)

logger = logging.getLogger(__name__)


class RAGQuestionAnsweringService:
    """Orchestration service combining semantic retrieval and LLM answer generation into a unified RAG pipeline."""

    def __init__(
        self,
        retrieval_service: Optional[KnowledgeRetrievalService] = None,
        generator_service: Optional[LLMGenerationAdapter] = None,
    ):
        self._retrieval_service = retrieval_service or default_retrieval_service
        self._generator_service = generator_service or default_generator_service

    @staticmethod
    def _validate_request(request: QARequest) -> tuple[str, str]:
        """Validates that chatbot_id and question are non-empty strings."""
        clean_bot_id = request.chatbot_id.strip() if request.chatbot_id else ""
        clean_question = request.question.strip() if request.question else ""

        if not clean_bot_id:
            raise InvalidQueryError("chatbot_id cannot be blank or whitespace.")
        if not clean_question:
            raise InvalidQueryError("question cannot be blank or whitespace.")

        return clean_bot_id, clean_question

    def _build_empty_fallback(
        self,
        request: QARequest,
        clean_bot_id: str,
        clean_question: str,
        retrieval_ms: float,
        start_time: float,
    ) -> QAResponse:
        """Constructs a polite, grounded fallback response when 0 knowledge chunks match the query."""
        total_ms = round((time.perf_counter() - start_time) * 1000, 2)
        model_name = getattr(self._generator_service, "model", "gemini-3.5-flash-lite")
        brand = extract_brand_name(request.bot_name, request.website_url)

        logger.info(f"No knowledge chunks found for chatbot '{clean_bot_id}'. Returning grounded fallback.")

        return QAResponse(
            chatbot_id=clean_bot_id,
            question=clean_question,
            answer=(
                f"Welcome to {brand}! We do not have enough information on those specific details on hand right now. "
                "Please feel free to reach out to our team directly through our contact page or support channels, "
                "and we'll be glad to help!"
            ),
            sources=[],
            has_grounded_evidence=False,
            stats=QAStats(
                retrieval_duration_ms=retrieval_ms,
                generation_duration_ms=0.0,
                total_duration_ms=total_ms,
                model_used=model_name,
                chunks_retrieved=0,
            ),
        )

    async def aanswer_question(self, request: QARequest) -> QAResponse:
        """Asynchronously executes retrieval first, then answer generation second."""
        total_start = time.perf_counter()
        clean_bot_id, clean_question = self._validate_request(request)

        # Step 1: Semantic Retrieval
        retrieval_res = await self._retrieval_service.aretrieve(
            chatbot_id=clean_bot_id,
            query=clean_question,
            top_k=request.top_k,
            score_threshold=request.score_threshold,
        )

        retrieval_ms = retrieval_res.stats.duration_ms
        evidence_chunks = retrieval_res.chunks

        # Step 2: Handle empty retrieval cleanly without wasting LLM tokens
        if not evidence_chunks:
            return self._build_empty_fallback(request, clean_bot_id, clean_question, retrieval_ms, total_start)

        # Step 3: Grounded Answer Generation
        gen_start = time.perf_counter()
        gen_result = await self._generator_service.agenerate_answer(
            question=clean_question,
            evidence_chunks=evidence_chunks,
            bot_name=request.bot_name,
            website_url=request.website_url,
            system_prompt=request.system_prompt,
        )
        generation_ms = round((time.perf_counter() - gen_start) * 1000, 2)
        total_ms = round((time.perf_counter() - total_start) * 1000, 2)

        return QAResponse(
            chatbot_id=clean_bot_id,
            question=clean_question,
            answer=gen_result.answer,
            sources=gen_result.sources,
            has_grounded_evidence=gen_result.has_grounded_evidence,
            stats=QAStats(
                retrieval_duration_ms=retrieval_ms,
                generation_duration_ms=generation_ms,
                total_duration_ms=total_ms,
                model_used=gen_result.stats.model_name,
                chunks_retrieved=len(evidence_chunks),
            ),
        )

    def answer_question(self, request: QARequest) -> QAResponse:
        """Synchronously executes retrieval first, then answer generation second."""
        total_start = time.perf_counter()
        clean_bot_id, clean_question = self._validate_request(request)

        # Step 1: Semantic Retrieval
        retrieval_res = self._retrieval_service.retrieve(
            chatbot_id=clean_bot_id,
            query=clean_question,
            top_k=request.top_k,
            score_threshold=request.score_threshold,
        )

        retrieval_ms = retrieval_res.stats.duration_ms
        evidence_chunks = retrieval_res.chunks

        # Step 2: Handle empty retrieval cleanly without wasting LLM tokens
        if not evidence_chunks:
            return self._build_empty_fallback(request, clean_bot_id, clean_question, retrieval_ms, total_start)

        # Step 3: Grounded Answer Generation
        gen_start = time.perf_counter()
        gen_result = self._generator_service.generate_answer(
            question=clean_question,
            evidence_chunks=evidence_chunks,
            bot_name=request.bot_name,
            website_url=request.website_url,
            system_prompt=request.system_prompt,
        )
        generation_ms = round((time.perf_counter() - gen_start) * 1000, 2)
        total_ms = round((time.perf_counter() - total_start) * 1000, 2)

        return QAResponse(
            chatbot_id=clean_bot_id,
            question=clean_question,
            answer=gen_result.answer,
            sources=gen_result.sources,
            has_grounded_evidence=gen_result.has_grounded_evidence,
            stats=QAStats(
                retrieval_duration_ms=retrieval_ms,
                generation_duration_ms=generation_ms,
                total_duration_ms=total_ms,
                model_used=gen_result.stats.model_name,
                chunks_retrieved=len(evidence_chunks),
            ),
        )


# Global singleton instance
qa_service = RAGQuestionAnsweringService()
rag_pipeline_service = qa_service

__all__ = [
    "QARequest",
    "QAStats",
    "QAResponse",
    "SourceReference",
    "RAGQuestionAnsweringService",
    "qa_service",
    "rag_pipeline_service",
    "InvalidQueryError",
    "RetrievalError",
    "GenerationError",
    "GenerationTimeoutError",
    "GenerationProviderError",
]
