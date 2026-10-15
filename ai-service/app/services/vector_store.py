import os
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from pinecone import Pinecone
from app.services.embedding import EmbeddedChunk

logger = logging.getLogger(__name__)


class VectorStoreError(Exception):
    """Base exception for vector database operations."""
    pass


class VectorStoreConfigurationError(VectorStoreError):
    """Raised when vector database credentials or index are misconfigured."""
    pass


class VectorSearchResult(BaseModel):
    """Result of querying the vector database for semantically similar content chunks."""

    chunk_id: str = Field(..., description="Unique deterministic identifier of the matched chunk.")
    chatbot_id: str = Field(..., description="Chatbot identifier owning this chunk.")
    score: float = Field(..., description="Similarity score (e.g. cosine similarity).")
    content: str = Field(..., description="Human-readable text content of the chunk.")
    source_url: str = Field(..., description="Original source website URL.")
    canonical_url: str = Field(..., description="Canonicalized URL.")
    title: Optional[str] = Field(None, description="Title of the parent webpage.")
    chunk_index: int = Field(0, description="Sequential position within the page.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Preserved chunk metadata.")


class VectorUpsertResult(BaseModel):
    """Execution result for indexing a batch of chunks into the vector database."""

    chatbot_id: str
    upserted_count: int
    success: bool = True
    error_message: Optional[str] = None


class VectorDeleteResult(BaseModel):
    """Execution result for deleting a chatbot's indexed content."""

    chatbot_id: str
    deleted_count: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None


class VectorStoreAdapter(ABC):
    """Abstract interface defining the contract for all vector database implementations.

    Isolates database-specific logic so the application can support different vector engines
    without affecting upstream crawler or embedding services.
    """

    @abstractmethod
    def health_check(self) -> bool:
        """Verifies active connectivity to the vector database and configured index."""
        pass

    @abstractmethod
    def upsert_chunks(
        self,
        chatbot_id: str,
        chunks: List[EmbeddedChunk],
    ) -> VectorUpsertResult:
        """Idempotently adds or updates vector embeddings for a specific chatbot."""
        pass

    @abstractmethod
    def query_similar(
        self,
        chatbot_id: str,
        query_vector: List[float],
        top_k: int = 5,
        score_threshold: Optional[float] = None,
    ) -> List[VectorSearchResult]:
        """Queries the vector database for the top-k most relevant chunks belonging to a chatbot."""
        pass

    @abstractmethod
    def delete_chatbot_content(self, chatbot_id: str) -> VectorDeleteResult:
        """Deletes all indexed vectors and metadata associated with a specific chatbot."""
        pass


class PineconeVectorStore(VectorStoreAdapter):
    """Pinecone vector database implementation providing managed, durable vector indexing

    with strict multi-tenant isolation via Pinecone namespaces.
    """

    DEFAULT_INDEX_NAME: str = "chatbot-builder"
    UPSERT_BATCH_SIZE: int = 100  # Safe batch slice for Pinecone upserts

    def __init__(
        self,
        api_key: Optional[str] = None,
        index_name: Optional[str] = None,
    ):
        self._api_key = (
            api_key
            or os.getenv("PINECONE_API_KEY")
            or os.getenv("PINECONE_DB_API_KEY")
        )
        self.index_name = index_name or os.getenv("PINECONE_INDEX_NAME", self.DEFAULT_INDEX_NAME)

        self._client: Optional[Pinecone] = None
        self._index = None

        masked_key = self._mask_key(self._api_key)
        logger.info(
            f"Initialized PineconeVectorStore (index='{self.index_name}', api_key='{masked_key}')"
        )

    @staticmethod
    def _mask_key(key: Optional[str]) -> str:
        """Masks sensitive API key for safe logging."""
        if not key:
            return "<not-set>"
        cleaned = key.strip()
        if len(cleaned) <= 8:
            return "***"
        return f"{cleaned[:4]}...{cleaned[-4:]}"

    def _get_client(self) -> Pinecone:
        """Retrieves or creates the Pinecone client singleton."""
        if self._client is not None:
            return self._client

        if not self._api_key:
            raise VectorStoreConfigurationError(
                "PINECONE_API_KEY is not configured. Set PINECONE_API_KEY or PINECONE_DB_API_KEY "
                "in your environment variables."
            )

        self._client = Pinecone(api_key=self._api_key)
        return self._client

    def _get_index(self):
        """Retrieves or creates the Pinecone Index handle."""
        if self._index is not None:
            return self._index

        client = self._get_client()
        self._index = client.Index(name=self.index_name)
        return self._index

    def health_check(self) -> bool:
        """Checks connectivity to Pinecone and verifies that the index is accessible."""
        try:
            index = self._get_index()
            # Calling describe_index_stats validates credentials and index connectivity
            stats = index.describe_index_stats()
            return stats is not None
        except Exception as exc:
            logger.warning(f"Pinecone health check failed: {exc}")
            return False

    def upsert_chunks(
        self,
        chatbot_id: str,
        chunks: List[EmbeddedChunk],
    ) -> VectorUpsertResult:
        """Indexes vector embeddings into Pinecone with hard namespace isolation per chatbot.

        Uses deterministic chunk IDs so re-indexing existing pages updates records in place
        without creating duplicate chunks.
        """
        if not chatbot_id or not chatbot_id.strip():
            raise ValueError("chatbot_id must be a non-empty string.")

        clean_bot_id = chatbot_id.strip()

        # Handle empty input gracefully
        if not chunks:
            return VectorUpsertResult(
                chatbot_id=clean_bot_id,
                upserted_count=0,
                success=True,
            )

        index = self._get_index()
        total_upserted = 0

        # Transform EmbeddedChunk objects into Pinecone vector records
        pinecone_vectors: List[Dict[str, Any]] = []
        for chunk in chunks:
            vector_record = {
                "id": chunk.chunk_id,
                "values": chunk.embedding,
                "metadata": {
                    "chatbot_id": clean_bot_id,
                    "chunk_id": chunk.chunk_id,
                    "text": chunk.content,
                    "source_url": chunk.source_url,
                    "canonical_url": chunk.canonical_url,
                    "title": chunk.title or "",
                    "chunk_index": chunk.chunk_index,
                    "token_count": chunk.token_count,
                    **{k: v for k, v in chunk.metadata.items() if isinstance(v, (str, int, float, bool, list))},
                },
            }
            pinecone_vectors.append(vector_record)

        # Upsert in slices of UPSERT_BATCH_SIZE (default 100)
        try:
            for i in range(0, len(pinecone_vectors), self.UPSERT_BATCH_SIZE):
                slice_records = pinecone_vectors[i : i + self.UPSERT_BATCH_SIZE]
                index.upsert(
                    vectors=slice_records,
                    namespace=clean_bot_id,  # Strict namespace isolation
                )
                total_upserted += len(slice_records)

            logger.info(
                f"Successfully upserted {total_upserted} chunks into Pinecone "
                f"(index='{self.index_name}', namespace='{clean_bot_id}')"
            )
            return VectorUpsertResult(
                chatbot_id=clean_bot_id,
                upserted_count=total_upserted,
                success=True,
            )
        except Exception as exc:
            logger.error(f"Pinecone upsert error for chatbot '{clean_bot_id}': {exc}")
            raise VectorStoreError(f"Pinecone upsert failed: {exc}") from exc

    def query_similar(
        self,
        chatbot_id: str,
        query_vector: List[float],
        top_k: int = 5,
        score_threshold: Optional[float] = None,
    ) -> List[VectorSearchResult]:
        """Queries Pinecone for the most semantically relevant chunks for a specific chatbot.

        Restricts search strictly to the chatbot's namespace to guarantee tenant isolation.
        """
        if not chatbot_id or not chatbot_id.strip():
            raise ValueError("chatbot_id must be a non-empty string.")
        if not query_vector:
            raise ValueError("query_vector cannot be empty.")

        clean_bot_id = chatbot_id.strip()
        index = self._get_index()

        try:
            response = index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
                namespace=clean_bot_id,  # Hard tenant isolation
            )

            results: List[VectorSearchResult] = []
            matches = getattr(response, "matches", []) or []

            for match in matches:
                score = float(getattr(match, "score", 0.0) or 0.0)
                if score_threshold is not None and score < score_threshold:
                    continue

                raw_meta = getattr(match, "metadata", {}) or {}
                # Extract structured attributes
                text = raw_meta.get("text") or ""
                source_url = raw_meta.get("source_url") or ""
                canonical_url = raw_meta.get("canonical_url") or source_url
                title = raw_meta.get("title") or None
                chunk_index = int(raw_meta.get("chunk_index", 0))

                # Extra metadata
                extra_meta = {
                    k: v
                    for k, v in raw_meta.items()
                    if k not in ("text", "source_url", "canonical_url", "title", "chunk_index", "chatbot_id", "chunk_id")
                }

                results.append(
                    VectorSearchResult(
                        chunk_id=getattr(match, "id", "") or raw_meta.get("chunk_id", ""),
                        chatbot_id=clean_bot_id,
                        score=score,
                        content=text,
                        source_url=source_url,
                        canonical_url=canonical_url,
                        title=title,
                        chunk_index=chunk_index,
                        metadata=extra_meta,
                    )
                )

            logger.info(
                f"Retrieved {len(results)} matches for chatbot '{clean_bot_id}' "
                f"(top_k={top_k}, threshold={score_threshold})"
            )
            return results
        except Exception as exc:
            logger.error(f"Pinecone query error for chatbot '{clean_bot_id}': {exc}")
            raise VectorStoreError(f"Pinecone query failed: {exc}") from exc

    def delete_chatbot_content(self, chatbot_id: str) -> VectorDeleteResult:
        """Deletes all indexed vectors in the chatbot's namespace, cleaning up all stored data."""
        if not chatbot_id or not chatbot_id.strip():
            raise ValueError("chatbot_id must be a non-empty string.")

        clean_bot_id = chatbot_id.strip()
        index = self._get_index()

        try:
            index.delete(delete_all=True, namespace=clean_bot_id)
            logger.info(f"Deleted all vectors for chatbot '{clean_bot_id}' in Pinecone")
            return VectorDeleteResult(
                chatbot_id=clean_bot_id,
                success=True,
            )
        except Exception as exc:
            logger.error(f"Pinecone delete error for chatbot '{clean_bot_id}': {exc}")
            raise VectorStoreError(f"Pinecone deletion failed: {exc}") from exc


# Global singleton vector store instance
vector_store = PineconeVectorStore()
