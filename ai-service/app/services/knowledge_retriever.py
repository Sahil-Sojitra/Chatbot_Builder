"""Knowledge retrieval service with tenant isolation and keyword boosting."""

import logging
import time
from typing import List, Optional, Tuple

from app.core.exceptions import (
    EmbeddingError,
    InvalidQueryError,
    RetrievalError,
)
from app.models.retrieval import (
    RetrievedChunk,
    RetrievalResult,
    RetrievalStats,
)
from app.models.vector_store import VectorSearchResult
from app.services.embedding import (
    VoyageEmbeddingService,
    embedding_service as default_embedding_service,
)
from app.services.keyword_reranker import boost_chunks_by_keywords
from app.services.vector_store import (
    VectorStoreAdapter,
    VectorStoreError,
    vector_store as default_vector_store,
)

logger = logging.getLogger(__name__)

# Standard bounds for retrieval configuration
DEFAULT_TOP_K: int = 8
MIN_TOP_K: int = 1
MAX_TOP_K: int = 100


class KnowledgeRetrievalService:
    """Service dedicated to semantic retrieval of indexed knowledge chunks for a specific chatbot.

    Decoupled from vector-store and embedding provider implementations via dependency injection.
    Enforces strict tenant isolation by querying only the target chatbot's indexed partition.
    """

    def __init__(
        self,
        vector_store: Optional[VectorStoreAdapter] = None,
        embedding_service: Optional[VoyageEmbeddingService] = None,
        default_top_k: int = DEFAULT_TOP_K,
    ) -> None:
        self._vector_store = vector_store or default_vector_store
        self._embedding_service = embedding_service or default_embedding_service
        self.default_top_k = default_top_k

    @property
    def vector_store(self) -> VectorStoreAdapter:
        return self._vector_store

    @property
    def embedding_service(self) -> VoyageEmbeddingService:
        return self._embedding_service

    def _validate_inputs(self, chatbot_id: str, query: str, top_k: int) -> Tuple[str, str, int]:
        """Validates and normalizes retrieval query parameters."""
        if not chatbot_id or not chatbot_id.strip():
            raise InvalidQueryError("Chatbot identifier must be a non-empty string.")

        if not query or not query.strip():
            raise InvalidQueryError("Question query cannot be empty.")

        clean_bot_id = chatbot_id.strip()
        clean_query = query.strip()

        if top_k < MIN_TOP_K or top_k > MAX_TOP_K:
            raise InvalidQueryError(
                f"top_k must be between {MIN_TOP_K} and {MAX_TOP_K} (received {top_k})."
            )

        return clean_bot_id, clean_query, top_k

    def _process_matches(
        self,
        clean_bot_id: str,
        clean_query: str,
        raw_matches: List[VectorSearchResult],
        effective_top_k: int,
        score_threshold: Optional[float],
        model_name: str,
        start_time: float,
    ) -> RetrievalResult:
        """Processes raw vector matches with multi-tenant security verification and keyword boosting."""
        candidate_chunks: List[RetrievedChunk] = []
        for match in raw_matches:
            if match.chatbot_id != clean_bot_id:
                logger.warning(
                    f"Security anomaly: filtered out chunk '{match.chunk_id}' with mismatched "
                    f"chatbot_id '{match.chatbot_id}' during query for '{clean_bot_id}'"
                )
                continue

            candidate_chunks.append(
                RetrievedChunk(
                    chunk_id=match.chunk_id,
                    chatbot_id=clean_bot_id,
                    score=match.score,
                    content=match.content,
                    source_url=match.source_url,
                    canonical_url=match.canonical_url,
                    title=match.title,
                    chunk_index=match.chunk_index,
                    metadata=match.metadata,
                )
            )

        final_chunks = boost_chunks_by_keywords(clean_query, candidate_chunks, top_k=effective_top_k)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        stats = RetrievalStats(
            total_retrieved=len(final_chunks),
            top_k_requested=effective_top_k,
            score_threshold=score_threshold,
            duration_ms=duration_ms,
            embedding_model=model_name,
        )

        logger.info(
            f"Retrieval complete for chatbot '{clean_bot_id}': {len(final_chunks)} chunks "
            f"selected from {len(candidate_chunks)} candidates in {duration_ms}ms"
        )

        return RetrievalResult(
            chatbot_id=clean_bot_id,
            query=clean_query,
            chunks=final_chunks,
            stats=stats,
            success=True,
        )

    def retrieve(
        self,
        chatbot_id: str,
        query: str,
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None,
    ) -> RetrievalResult:
        """Retrieves the top-k most semantically relevant chunks for a specific chatbot synchronously."""
        start_time = time.perf_counter()
        effective_top_k = top_k if top_k is not None else self.default_top_k
        clean_bot_id, clean_query, effective_top_k = self._validate_inputs(chatbot_id, query, effective_top_k)
        model_name = getattr(self._embedding_service, "model", "voyage-4")

        try:
            query_embedding_res = self._embedding_service.embed_query(clean_query)
            query_vector = query_embedding_res.embedding
        except EmbeddingError as exc:
            logger.error(f"Failed query embedding for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Query embedding generation failed: {exc}") from exc
        except Exception as exc:
            logger.error(f"Unexpected error during query embedding for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Query embedding failed: {exc}") from exc

        candidate_k = max(effective_top_k * 2, 12)
        try:
            raw_matches = self._vector_store.query_similar(
                chatbot_id=clean_bot_id,
                query_vector=query_vector,
                top_k=candidate_k,
                score_threshold=score_threshold,
            )
        except VectorStoreError as exc:
            logger.error(f"Vector store search failed for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Knowledge search in vector store failed: {exc}") from exc
        except Exception as exc:
            logger.error(f"Unexpected vector store error for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Vector store query encountered an error: {exc}") from exc

        return self._process_matches(
            clean_bot_id, clean_query, raw_matches, effective_top_k, score_threshold, model_name, start_time
        )

    async def aretrieve(
        self,
        chatbot_id: str,
        query: str,
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None,
    ) -> RetrievalResult:
        """Asynchronously retrieves the top-k most semantically relevant chunks for a specific chatbot."""
        start_time = time.perf_counter()
        effective_top_k = top_k if top_k is not None else self.default_top_k
        clean_bot_id, clean_query, effective_top_k = self._validate_inputs(chatbot_id, query, effective_top_k)
        model_name = getattr(self._embedding_service, "model", "voyage-4")

        try:
            if hasattr(self._embedding_service, "aembed_query"):
                query_embedding_res = await self._embedding_service.aembed_query(clean_query)
            else:
                query_embedding_res = self._embedding_service.embed_query(clean_query)
            query_vector = query_embedding_res.embedding
        except EmbeddingError as exc:
            logger.error(f"Failed async query embedding for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Query embedding generation failed: {exc}") from exc
        except Exception as exc:
            logger.error(f"Unexpected async embedding error for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Query embedding failed: {exc}") from exc

        candidate_k = max(effective_top_k * 2, 12)
        try:
            raw_matches = self._vector_store.query_similar(
                chatbot_id=clean_bot_id,
                query_vector=query_vector,
                top_k=candidate_k,
                score_threshold=score_threshold,
            )
        except VectorStoreError as exc:
            logger.error(f"Vector store search failed for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Knowledge search in vector store failed: {exc}") from exc
        except Exception as exc:
            logger.error(f"Unexpected vector store error for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Vector store query encountered an error: {exc}") from exc

        return self._process_matches(
            clean_bot_id, clean_query, raw_matches, effective_top_k, score_threshold, model_name, start_time
        )


# Global singleton instance
knowledge_retriever_service = KnowledgeRetrievalService()
retrieval_service = knowledge_retriever_service

__all__ = [
    "DEFAULT_TOP_K",
    "MIN_TOP_K",
    "MAX_TOP_K",
    "boost_chunks_by_keywords",
    "RetrievalError",
    "InvalidQueryError",
    "RetrievedChunk",
    "RetrievalStats",
    "RetrievalResult",
    "KnowledgeRetrievalService",
    "knowledge_retriever_service",
    "retrieval_service",
]
