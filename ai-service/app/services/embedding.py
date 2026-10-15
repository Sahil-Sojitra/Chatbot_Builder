import os
import time
import logging
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

import voyageai

from app.services.chunker import ContentChunk

logger = logging.getLogger(__name__)


# Standard Voyage AI embedding dimensionalities
VOYAGE_MODEL_DIMENSIONS: Dict[str, int] = {
    "voyage-4": 1024,
    "voyage-4-large": 1024,
    "voyage-4-lite": 1024,
    "voyage-3": 1024,
    "voyage-3-lite": 512,
    "voyage-large-2-instruct": 1024,
    "voyage-finance-2": 1024,
    "voyage-multilingual-2": 1024,
    "voyage-law-2": 1024,
    "voyage-code-2": 1536,
    "voyage-2": 1024,
}


class EmbeddingError(Exception):
    """Base exception for all embedding operations."""
    pass


class EmbeddingConfigurationError(EmbeddingError):
    """Raised when Voyage AI is misconfigured (e.g. missing API key)."""
    pass


class EmbeddingGenerationError(EmbeddingError):
    """Raised when an embedding API request fails."""
    pass


class EmbeddedChunk(BaseModel):
    """Normalized content chunk enriched with dense vector embeddings."""

    chunk_id: str = Field(..., description="Unique deterministic identifier matching the parent chunk.")
    source_url: str = Field(..., description="The original raw website URL.")
    canonical_url: str = Field(..., description="The normalized website URL.")
    title: Optional[str] = Field(None, description="The title of the page.")
    content: str = Field(..., description="Text content that was embedded.")
    chunk_index: int = Field(..., description="Sequential index within the document.")  
    embedding: List[float] = Field(..., description="Dense numerical vector embedding from Voyage AI.")
    dimensions: int = Field(..., description="Vector dimensionality (e.g. 1024 for voyage-3).")
    token_count: int = Field(..., description="Token count of the chunk.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Preserved crawl and chunk metadata.")


class EmbeddingBatchStats(BaseModel):
    """Summary statistics for an embedding batch run."""

    total_chunks: int = Field(0, description="Total chunks processed.")
    total_tokens_used: int = Field(0, description="Total tokens consumed by the embedding model.")
    dimensions: int = Field(0, description="Dimensionality of the generated vectors.")
    model_name: str = Field("", description="Voyage AI model identifier used.")
    duration_ms: float = Field(0.0, description="Total generation time in milliseconds.")


class BatchEmbeddingResult(BaseModel):
    """Complete structured result returned by the embedding service."""

    embedded_chunks: List[EmbeddedChunk] = Field(default_factory=list)
    stats: EmbeddingBatchStats
    success: bool = True
    error_message: Optional[str] = None


class QueryEmbeddingResult(BaseModel):
    """Result of embedding a single search query."""

    query: str = Field(..., description="The input search query text.")
    embedding: List[float] = Field(..., description="Query vector embedding.")
    dimensions: int = Field(..., description="Vector dimensionality.")
    model_name: str = Field(..., description="Model identifier used.")
    token_count: int = Field(0, description="Tokens consumed by the query.")


class VoyageEmbeddingService:
    """Production service for generating dense vector embeddings using Voyage AI.

    Voyage AI is MongoDB Atlas Vector Search's official embedding partner,
    delivering state-of-the-art retrieval performance via models like 'voyage-3'
    (1024 dimensions) and 'voyage-3-lite' (512 dimensions).
    """

    DEFAULT_MODEL: str = "voyage-4"
    MAX_BATCH_SIZE: int = 128  # Voyage AI maximum recommended batch slice

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        batch_size: Optional[int] = None,
    ):
        self.model = model or os.getenv("VOYAGE_MODEL", self.DEFAULT_MODEL)
        self.batch_size = batch_size or int(os.getenv("VOYAGE_BATCH_SIZE", str(self.MAX_BATCH_SIZE)))
        self._api_key = api_key or os.getenv("VOYAGE_API_KEY")

        # Clients are instantiated once per process
        self._client: Optional[voyageai.Client] = None
        self._async_client: Optional[voyageai.AsyncClient] = None

        masked_key = self._mask_key(self._api_key)
        logger.info(
            f"Initialized VoyageEmbeddingService with model='{self.model}', "
            f"expected_dims={self.get_expected_dimensions()}, api_key='{masked_key}'"
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

    def get_expected_dimensions(self) -> int:
        """Returns the documented dimensionality for the configured model."""
        return VOYAGE_MODEL_DIMENSIONS.get(self.model, 1024)

    def _get_client(self) -> voyageai.Client:
        """Retrieves or creates the synchronous Voyage AI client singleton."""
        if self._client is not None:
            return self._client

        api_key = self._api_key or os.getenv("VOYAGE_API_KEY")
        if not api_key:
            raise EmbeddingConfigurationError(
                "VOYAGE_API_KEY is not configured. Set the VOYAGE_API_KEY environment variable "
                "or pass api_key to VoyageEmbeddingService."
            )

        self._client = voyageai.Client(api_key=api_key)
        return self._client

    def _get_async_client(self) -> voyageai.AsyncClient:
        """Retrieves or creates the asynchronous Voyage AI client singleton."""
        if self._async_client is not None:
            return self._async_client

        api_key = self._api_key or os.getenv("VOYAGE_API_KEY")
        if not api_key:
            raise EmbeddingConfigurationError(
                "VOYAGE_API_KEY is not configured. Set the VOYAGE_API_KEY environment variable "
                "or pass api_key to VoyageEmbeddingService."
            )

        self._async_client = voyageai.AsyncClient(api_key=api_key)
        return self._async_client

    def embed_chunks(
        self,
        chunks: List[Union[ContentChunk, Dict[str, Any]]],
        input_type: str = "document",
    ) -> BatchEmbeddingResult:
        """Generates embeddings for a batch of content chunks synchronously.

        Handles batching, extracts text, preserves chunk metadata, and returns
        predictable List[float] vectors with the model's expected dimensionality.
        """
        start_time = time.perf_counter()

        # Handle empty input gracefully without network calls
        if not chunks:
            return BatchEmbeddingResult(
                embedded_chunks=[],
                stats=EmbeddingBatchStats(
                    total_chunks=0,
                    total_tokens_used=0,
                    dimensions=self.get_expected_dimensions(),
                    model_name=self.model,
                    duration_ms=0.0,
                ),
                success=True,
            )

        client = self._get_client()

        # Prepare normalized chunk objects
        normalized_chunks: List[ContentChunk] = []
        texts: List[str] = []

        for item in chunks:
            if isinstance(item, ContentChunk):
                normalized_chunks.append(item)
                texts.append(item.content)
            elif isinstance(item, dict):
                content = item.get("content") or item.get("markdown") or ""
                chunk = ContentChunk(
                    chunk_id=item.get("chunk_id", f"chk_{hash(content)}"),
                    source_url=item.get("source_url", ""),
                    canonical_url=item.get("canonical_url", ""),
                    title=item.get("title"),
                    content=content,
                    chunk_index=item.get("chunk_index", 0),
                    token_count=item.get("token_count", 0),
                    char_count=len(content),
                    metadata=item.get("metadata", {}),
                )
                normalized_chunks.append(chunk)
                texts.append(content)

        all_vectors: List[List[float]] = []
        total_tokens = 0

        # Process in slices of batch_size (default 128)
        for i in range(0, len(texts), self.batch_size):
            batch_texts = texts[i : i + self.batch_size]
            try:
                response = client.embed(
                    texts=batch_texts,
                    model=self.model,
                    input_type=input_type,
                )
                all_vectors.extend(response.embeddings)
                total_tokens += getattr(response, "total_tokens", 0)
            except Exception as exc:
                logger.error(f"Voyage AI embedding error on batch slice {i}: {exc}")
                raise EmbeddingGenerationError(f"Voyage AI API error: {exc}") from exc

        # Assemble EmbeddedChunk records
        expected_dims = self.get_expected_dimensions()
        embedded_records: List[EmbeddedChunk] = []

        for chunk, vector in zip(normalized_chunks, all_vectors):
            actual_dims = len(vector)
            embedded_records.append(
                EmbeddedChunk(
                    chunk_id=chunk.chunk_id,
                    source_url=chunk.source_url,
                    canonical_url=chunk.canonical_url,
                    title=chunk.title,
                    content=chunk.content,
                    chunk_index=chunk.chunk_index,
                    embedding=vector,
                    dimensions=actual_dims,
                    token_count=chunk.token_count,
                    metadata=chunk.metadata,
                )
            )

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.info(
            f"Generated embeddings for {len(embedded_records)} chunks in {duration_ms}ms "
            f"(model={self.model}, tokens={total_tokens})"
        )

        return BatchEmbeddingResult(
            embedded_chunks=embedded_records,
            stats=EmbeddingBatchStats(
                total_chunks=len(embedded_records),
                total_tokens_used=total_tokens,
                dimensions=expected_dims,
                model_name=self.model,
                duration_ms=duration_ms,
            ),
            success=True,
        )

    async def aembed_chunks(
        self,
        chunks: List[Union[ContentChunk, Dict[str, Any]]],
        input_type: str = "document",
    ) -> BatchEmbeddingResult:
        """Generates embeddings for a batch of content chunks asynchronously."""
        start_time = time.perf_counter()

        if not chunks:
            return BatchEmbeddingResult(
                embedded_chunks=[],
                stats=EmbeddingBatchStats(
                    total_chunks=0,
                    total_tokens_used=0,
                    dimensions=self.get_expected_dimensions(),
                    model_name=self.model,
                    duration_ms=0.0,
                ),
                success=True,
            )

        client = self._get_async_client()

        normalized_chunks: List[ContentChunk] = []
        texts: List[str] = []

        for item in chunks:
            if isinstance(item, ContentChunk):
                normalized_chunks.append(item)
                texts.append(item.content)
            elif isinstance(item, dict):
                content = item.get("content") or item.get("markdown") or ""
                chunk = ContentChunk(
                    chunk_id=item.get("chunk_id", f"chk_{hash(content)}"),
                    source_url=item.get("source_url", ""),
                    canonical_url=item.get("canonical_url", ""),
                    title=item.get("title"),
                    content=content,
                    chunk_index=item.get("chunk_index", 0),
                    token_count=item.get("token_count", 0),
                    char_count=len(content),
                    metadata=item.get("metadata", {}),
                )
                normalized_chunks.append(chunk)
                texts.append(content)

        all_vectors: List[List[float]] = []
        total_tokens = 0

        for i in range(0, len(texts), self.batch_size):
            batch_texts = texts[i : i + self.batch_size]
            try:
                response = await client.embed(
                    texts=batch_texts,
                    model=self.model,
                    input_type=input_type,
                )
                all_vectors.extend(response.embeddings)
                total_tokens += getattr(response, "total_tokens", 0)
            except Exception as exc:
                logger.error(f"Voyage AI async embedding error on batch slice {i}: {exc}")
                raise EmbeddingGenerationError(f"Voyage AI API error: {exc}") from exc

        expected_dims = self.get_expected_dimensions()
        embedded_records: List[EmbeddedChunk] = []

        for chunk, vector in zip(normalized_chunks, all_vectors):
            embedded_records.append(
                EmbeddedChunk(
                    chunk_id=chunk.chunk_id,
                    source_url=chunk.source_url,
                    canonical_url=chunk.canonical_url,
                    title=chunk.title,
                    content=chunk.content,
                    chunk_index=chunk.chunk_index,
                    embedding=vector,
                    dimensions=len(vector),
                    token_count=chunk.token_count,
                    metadata=chunk.metadata,
                )
            )

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.info(
            f"Generated embeddings asynchronously for {len(embedded_records)} chunks in {duration_ms}ms "
            f"(model={self.model}, tokens={total_tokens})"
        )

        return BatchEmbeddingResult(
            embedded_chunks=embedded_records,
            stats=EmbeddingBatchStats(
                total_chunks=len(embedded_records),
                total_tokens_used=total_tokens,
                dimensions=expected_dims,
                model_name=self.model,
                duration_ms=duration_ms,
            ),
            success=True,
        )

    def embed_query(self, query: str) -> QueryEmbeddingResult:
        """Generates an embedding vector for a single user search query (input_type='query')."""
        if not query or not query.strip():
            raise ValueError("Query string cannot be empty.")

        client = self._get_client()
        try:
            response = client.embed(
                texts=[query.strip()],
                model=self.model,
                input_type="query",
            )
            vector = response.embeddings[0]
            tokens = getattr(response, "total_tokens", 0)
            return QueryEmbeddingResult(
                query=query.strip(),
                embedding=vector,
                dimensions=len(vector),
                model_name=self.model,
                token_count=tokens,
            )
        except Exception as exc:
            logger.error(f"Voyage AI query embedding error: {exc}")
            raise EmbeddingGenerationError(f"Voyage AI query embedding error: {exc}") from exc

    async def aembed_query(self, query: str) -> QueryEmbeddingResult:
        """Generates an embedding vector for a single query asynchronously (input_type='query')."""
        if not query or not query.strip():
            raise ValueError("Query string cannot be empty.")

        client = self._get_async_client()
        try:
            response = await client.embed(
                texts=[query.strip()],
                model=self.model,
                input_type="query",
            )
            vector = response.embeddings[0]
            tokens = getattr(response, "total_tokens", 0)
            return QueryEmbeddingResult(
                query=query.strip(),
                embedding=vector,
                dimensions=len(vector),
                model_name=self.model,
                token_count=tokens,
            )
        except Exception as exc:
            logger.error(f"Voyage AI async query embedding error: {exc}")
            raise EmbeddingGenerationError(f"Voyage AI async query embedding error: {exc}") from exc


# Global singleton instance
embedding_service = VoyageEmbeddingService()
