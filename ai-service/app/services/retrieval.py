import time
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.services.embedding import (
    embedding_service as default_embedding_service,
    VoyageEmbeddingService,
    EmbeddingError,
)
from app.services.vector_store import (
    vector_store as default_vector_store,
    VectorStoreAdapter,
    VectorSearchResult,
    VectorStoreError,
)

logger = logging.getLogger(__name__)


# Standard bounds for retrieval configuration
DEFAULT_TOP_K: int = 4
MIN_TOP_K: int = 1
MAX_TOP_K: int = 20


class RetrievalError(Exception):
    """Base exception for all knowledge retrieval operations."""
    pass


class InvalidQueryError(RetrievalError, ValueError):
    """Raised when a chatbot ID or user query fails validation."""
    pass


class RetrievedChunk(BaseModel):
    """A single relevant knowledge chunk retrieved from the vector store."""

    chunk_id: str = Field(..., description="Unique deterministic identifier of the matched chunk.")
    chatbot_id: str = Field(..., description="Chatbot identifier owning this chunk.")
    score: float = Field(..., description="Cosine similarity score (0.0 to 1.0) indicating semantic proximity.")
    content: str = Field(..., description="Human-readable text content of the chunk.")
    source_url: str = Field(..., description="Original source website URL where content was scraped.")
    canonical_url: str = Field(..., description="Canonicalized website URL.")
    title: Optional[str] = Field(None, description="Title of the source webpage.")
    chunk_index: int = Field(0, description="Sequential position of chunk within the source page.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Preserved crawl and chunk metadata.")


class RetrievalStats(BaseModel):
    """Performance and configuration statistics for a retrieval query execution."""

    total_retrieved: int = Field(0, description="Number of relevant chunks retrieved.")
    top_k_requested: int = Field(..., description="Requested top-k parameter.")
    score_threshold: Optional[float] = Field(None, description="Optional minimum similarity score cutoff applied.")
    duration_ms: float = Field(0.0, description="Total retrieval duration in milliseconds.")
    embedding_model: str = Field(..., description="Model identifier used to embed the query.")


class RetrievalResult(BaseModel):
    """Comprehensive response payload for a knowledge retrieval query."""

    chatbot_id: str = Field(..., description="Chatbot identifier for which retrieval was executed.")
    query: str = Field(..., description="Cleaned user search query.")
    chunks: List[RetrievedChunk] = Field(default_factory=list, description="Top relevant retrieved content chunks.")
    stats: RetrievalStats = Field(..., description="Performance and diagnostic stats.")
    success: bool = Field(True, description="Whether the retrieval operation succeeded.")
    error_message: Optional[str] = Field(None, description="Error details if the operation failed.")


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

    def _validate_inputs(self, chatbot_id: str, query: str, top_k: int) -> tuple[str, str, int]:
        """Validates and normalizes retrieval query parameters.

        Raises:
            InvalidQueryError: If chatbot_id or query is blank/empty, or top_k is invalid.
        """
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

    def retrieve(
        self,
        chatbot_id: str,
        query: str,
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None,
    ) -> RetrievalResult:
        """Retrieves the top-k most semantically relevant chunks for a specific chatbot synchronously.

        Args:
            chatbot_id: Identifier of the chatbot whose knowledge base to query.
            query: The user's question or search query.
            top_k: Number of chunks to retrieve (defaults to conservative default of 4).
            score_threshold: Optional minimum cosine similarity score cutoff (e.g. 0.65).

        Returns:
            RetrievalResult containing matched chunks, metadata, and performance stats.

        Raises:
            InvalidQueryError: If inputs are invalid.
            RetrievalError: If embedding generation or vector store search fails.
        """
        start_time = time.perf_counter()
        effective_top_k = top_k if top_k is not None else self.default_top_k
        clean_bot_id, clean_query, effective_top_k = self._validate_inputs(
            chatbot_id=chatbot_id,
            query=query,
            top_k=effective_top_k,
        )

        model_name = getattr(self._embedding_service, "model", "voyage-4")

        # 1. Generate query embedding using the same model as indexing (input_type='query')
        try:
            query_embedding_res = self._embedding_service.embed_query(clean_query)
            query_vector = query_embedding_res.embedding
        except EmbeddingError as exc:
            logger.error(f"Failed to generate query embedding for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Query embedding generation failed: {exc}") from exc
        except Exception as exc:
            logger.error(f"Unexpected error during query embedding for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Query embedding failed: {exc}") from exc

        # 2. Search only the specified chatbot's indexed content in the vector store
        try:
            raw_matches: List[VectorSearchResult] = self._vector_store.query_similar(
                chatbot_id=clean_bot_id,
                query_vector=query_vector,
                top_k=effective_top_k,
                score_threshold=score_threshold,
            )
        except VectorStoreError as exc:
            logger.error(f"Vector store search failed for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Knowledge search in vector store failed: {exc}") from exc
        except Exception as exc:
            logger.error(f"Unexpected vector store error for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Vector store query encountered an error: {exc}") from exc

        # 3. Post-search multi-tenant verification and formatting
        # Defense-in-depth: Ensure NO cross-chatbot leakage occurred
        retrieved_chunks: List[RetrievedChunk] = []
        for match in raw_matches:
            if match.chatbot_id != clean_bot_id:
                logger.warning(
                    f"Security anomaly: filtered out chunk '{match.chunk_id}' with mismatched "
                    f"chatbot_id '{match.chatbot_id}' during query for '{clean_bot_id}'"
                )
                continue

            retrieved_chunks.append(
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

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        stats = RetrievalStats(
            total_retrieved=len(retrieved_chunks),
            top_k_requested=effective_top_k,
            score_threshold=score_threshold,
            duration_ms=duration_ms,
            embedding_model=model_name,
        )

        logger.info(
            f"Retrieval complete for chatbot '{clean_bot_id}': {len(retrieved_chunks)} chunks "
            f"found in {duration_ms}ms (model='{model_name}', top_k={effective_top_k})"
        )

        return RetrievalResult(
            chatbot_id=clean_bot_id,
            query=clean_query,
            chunks=retrieved_chunks,
            stats=stats,
            success=True,
        )

    async def aretrieve(
        self,
        chatbot_id: str,
        query: str,
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None,
    ) -> RetrievalResult:
        """Asynchronously retrieves the top-k most semantically relevant chunks for a specific chatbot.

        Args:
            chatbot_id: Identifier of the chatbot whose knowledge base to query.
            query: The user's question or search query.
            top_k: Number of chunks to retrieve (defaults to conservative default of 4).
            score_threshold: Optional minimum cosine similarity score cutoff.

        Returns:
            RetrievalResult containing matched chunks, metadata, and performance stats.
        """
        start_time = time.perf_counter()
        effective_top_k = top_k if top_k is not None else self.default_top_k
        clean_bot_id, clean_query, effective_top_k = self._validate_inputs(
            chatbot_id=chatbot_id,
            query=query,
            top_k=effective_top_k,
        )

        model_name = getattr(self._embedding_service, "model", "voyage-4")

        # 1. Generate query embedding asynchronously
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

        # 2. Search only the specified chatbot's indexed partition
        try:
            raw_matches: List[VectorSearchResult] = self._vector_store.query_similar(
                chatbot_id=clean_bot_id,
                query_vector=query_vector,
                top_k=effective_top_k,
                score_threshold=score_threshold,
            )
        except VectorStoreError as exc:
            logger.error(f"Vector store search failed for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Knowledge search in vector store failed: {exc}") from exc
        except Exception as exc:
            logger.error(f"Unexpected vector store error for chatbot '{clean_bot_id}': {exc}")
            raise RetrievalError(f"Vector store query encountered an error: {exc}") from exc

        # 3. Post-search multi-tenant verification and formatting
        retrieved_chunks: List[RetrievedChunk] = []
        for match in raw_matches:
            if match.chatbot_id != clean_bot_id:
                logger.warning(
                    f"Security anomaly: filtered out chunk '{match.chunk_id}' with mismatched "
                    f"chatbot_id '{match.chatbot_id}' during query for '{clean_bot_id}'"
                )
                continue

            retrieved_chunks.append(
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

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        stats = RetrievalStats(
            total_retrieved=len(retrieved_chunks),
            top_k_requested=effective_top_k,
            score_threshold=score_threshold,
            duration_ms=duration_ms,
            embedding_model=model_name,
        )

        return RetrievalResult(
            chatbot_id=clean_bot_id,
            query=clean_query,
            chunks=retrieved_chunks,
            stats=stats,
            success=True,
        )


# Global singleton instance
retrieval_service = KnowledgeRetrievalService()
