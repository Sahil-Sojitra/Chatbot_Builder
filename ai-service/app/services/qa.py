import time
import logging
from typing import List, Optional
from pydantic import BaseModel, Field

from app.services.retrieval import (
    retrieval_service as default_retrieval_service,
    KnowledgeRetrievalService,
    RetrievalError,
    InvalidQueryError,
)
from app.services.generator import (
    generator_service as default_generator_service,
    LLMGenerationAdapter,
    SourceReference,
    GenerationError,
    GenerationTimeoutError,
    GenerationProviderError,
)

logger = logging.getLogger(__name__)


class QARequest(BaseModel):
    """Input payload for asking a question against a chatbot's indexed knowledge base."""

    chatbot_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique identifier for the chatbot whose knowledge base to query.",
        examples=["bot_ecommerce_123"],
    )
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="The user's natural language question.",
        examples=["What is your return policy?"],
    )
    top_k: int = Field(
        default=4,
        ge=1,
        le=20,
        description="Maximum number of relevant knowledge chunks to retrieve as evidence.",
    )
    score_threshold: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional minimum cosine similarity score cutoff.",
    )


class QAStats(BaseModel):
    """Performance metrics and diagnostic information for a complete RAG request."""

    retrieval_duration_ms: float = Field(0.0, description="Time spent searching and retrieving knowledge chunks.")
    generation_duration_ms: float = Field(0.0, description="Time spent synthesizing the answer with the LLM.")
    total_duration_ms: float = Field(0.0, description="Total end-to-end request latency in milliseconds.")
    model_used: str = Field(..., description="LLM model identifier used to generate the answer.")
    chunks_retrieved: int = Field(0, description="Number of evidence chunks retrieved from the knowledge base.")


class QAResponse(BaseModel):
    """Consistent output payload containing the grounded answer and cited sources."""

    chatbot_id: str = Field(..., description="Chatbot identifier for which the question was answered.")
    question: str = Field(..., description="The original user question.")
    answer: str = Field(..., description="Grounded, natural language response.")
    sources: List[SourceReference] = Field(
        default_factory=list,
        description="List of verified source references cited in the answer.",
    )
    has_grounded_evidence: bool = Field(
        True,
        description="Whether the response is backed by relevant retrieved website passages.",
    )
    stats: QAStats = Field(..., description="Performance and latency diagnostics.")


class RAGQuestionAnsweringService:
    """Orchestration service combining semantic retrieval and LLM answer generation into a unified RAG pipeline."""

    def __init__(
        self,
        retrieval_service: Optional[KnowledgeRetrievalService] = None,
        generator_service: Optional[LLMGenerationAdapter] = None,
    ):
        self._retrieval_service = retrieval_service or default_retrieval_service
        self._generator_service = generator_service or default_generator_service

    async def aanswer_question(self, request: QARequest) -> QAResponse:
        """Asynchronously executes retrieval first, then answer generation second."""
        total_start = time.perf_counter()

        clean_bot_id = request.chatbot_id.strip()
        clean_question = request.question.strip()

        if not clean_bot_id:
            raise InvalidQueryError("chatbot_id cannot be blank or whitespace.")
        if not clean_question:
            raise InvalidQueryError("question cannot be blank or whitespace.")

        # Step 1: Retrieval
        retrieval_res = await self._retrieval_service.aretrieve(
            chatbot_id=clean_bot_id,
            query=clean_question,
            top_k=request.top_k,
            score_threshold=request.score_threshold,
        )

        retrieval_ms = retrieval_res.stats.duration_ms
        evidence_chunks = retrieval_res.chunks

        # Step 2: Handle empty retrieval results cleanly
        if not evidence_chunks:
            total_ms = round((time.perf_counter() - total_start) * 1000, 2)
            model_name = getattr(self._generator_service, "model", "gemini-3.5-flash-lite")
            logger.info(
                f"No knowledge chunks found for chatbot '{clean_bot_id}'. Returning grounded fallback."
            )
            return QAResponse(
                chatbot_id=clean_bot_id,
                question=clean_question,
                answer="I do not have enough information in the indexed website knowledge base to answer this question.",
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

        # Step 3: Answer Generation
        gen_start = time.perf_counter()
        gen_result = await self._generator_service.agenerate_answer(
            question=clean_question,
            evidence_chunks=evidence_chunks,
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

        clean_bot_id = request.chatbot_id.strip()
        clean_question = request.question.strip()

        if not clean_bot_id:
            raise InvalidQueryError("chatbot_id cannot be blank or whitespace.")
        if not clean_question:
            raise InvalidQueryError("question cannot be blank or whitespace.")

        # Step 1: Retrieval
        retrieval_res = self._retrieval_service.retrieve(
            chatbot_id=clean_bot_id,
            query=clean_question,
            top_k=request.top_k,
            score_threshold=request.score_threshold,
        )

        retrieval_ms = retrieval_res.stats.duration_ms
        evidence_chunks = retrieval_res.chunks

        # Step 2: Handle empty retrieval results cleanly
        if not evidence_chunks:
            total_ms = round((time.perf_counter() - total_start) * 1000, 2)
            model_name = getattr(self._generator_service, "model", "gemini-3.5-flash-lite")
            return QAResponse(
                chatbot_id=clean_bot_id,
                question=clean_question,
                answer="I do not have enough information in the indexed website knowledge base to answer this question.",
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

        # Step 3: Answer Generation
        gen_start = time.perf_counter()
        gen_result = self._generator_service.generate_answer(
            question=clean_question,
            evidence_chunks=evidence_chunks,
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
