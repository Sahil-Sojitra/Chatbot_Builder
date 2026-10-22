"""Voyage AI dense vector embedding service with rate limit pacing."""

import asyncio
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple, Union

import voyageai

from app.core.exceptions import (
    EmbeddingConfigurationError,
    EmbeddingError,
    EmbeddingGenerationError,
)
from app.models.content import ContentChunk
from app.models.embedding import (
    BatchEmbeddingResult,
    EmbeddedChunk,
    EmbeddingBatchStats,
    QueryEmbeddingResult,
)

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


class VoyageEmbeddingService:
    """Production service for generating dense vector embeddings using Voyage AI.

    Voyage AI is MongoDB Atlas Vector Search's official embedding partner,
    delivering state-of-the-art retrieval performance via models like 'voyage-4'
    (1024 dimensions) and 'voyage-3-lite' (512 dimensions).
    """

    DEFAULT_MODEL: str = "voyage-4"
    MAX_BATCH_SIZE: int = 20  # Safe batch size to stay within Voyage AI free-tier 10K TPM limits

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        batch_size: Optional[int] = None,
    ):
        self.model = model or os.getenv("VOYAGE_MODEL", self.DEFAULT_MODEL)
        self.batch_size = batch_size or int(os.getenv("VOYAGE_BATCH_SIZE", str(self.MAX_BATCH_SIZE)))
        self._api_key = api_key or os.getenv("VOYAGE_API_KEY")

        # Clients are instantiated lazily once per process
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

    def _get_api_key(self) -> str:
        """Validates that a Voyage API key is present."""
        api_key = self._api_key or os.getenv("VOYAGE_API_KEY")
        if not api_key:
            raise EmbeddingConfigurationError(
                "VOYAGE_API_KEY is not configured. Set the VOYAGE_API_KEY environment variable "
                "or pass api_key to VoyageEmbeddingService."
            )
        return api_key.strip()

    def _get_client(self) -> voyageai.Client:
        """Retrieves or creates the synchronous Voyage AI client singleton."""
        if self._client is not None:
            return self._client
        self._client = voyageai.Client(api_key=self._get_api_key())
        return self._client

    def _get_async_client(self) -> voyageai.AsyncClient:
        """Retrieves or creates the asynchronous Voyage AI client singleton."""
        if self._async_client is not None:
            return self._async_client
        self._async_client = voyageai.AsyncClient(api_key=self._get_api_key())
        return self._async_client

    @staticmethod
    def _normalize_input_chunks(
        chunks: List[Union[ContentChunk, Dict[str, Any]]]
    ) -> Tuple[List[ContentChunk], List[str]]:
        """Normalizes input chunks into typed ContentChunk objects and text strings."""
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

        return normalized_chunks, texts

    def _build_batch_result(
        self,
        normalized_chunks: List[ContentChunk],
        all_vectors: List[List[float]],
        total_tokens: int,
        start_time: float,
    ) -> BatchEmbeddingResult:
        """Assembles EmbeddedChunk models and statistical diagnostics."""
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

    def embed_chunks(
        self,
        chunks: List[Union[ContentChunk, Dict[str, Any]]],
        input_type: str = "document",
    ) -> BatchEmbeddingResult:
        """Generates embeddings for a batch of content chunks synchronously."""
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

        client = self._get_client()
        normalized_chunks, texts = self._normalize_input_chunks(chunks)
        all_vectors: List[List[float]] = []
        total_tokens = 0

        for i in range(0, len(texts), self.batch_size):
            batch_texts = texts[i : i + self.batch_size]
            try:
                response = client.embed(texts=batch_texts, model=self.model, input_type=input_type)
                all_vectors.extend(response.embeddings)
                total_tokens += getattr(response, "total_tokens", 0)
            except Exception as exc:
                logger.error(f"Voyage AI embedding error on batch slice {i}: {exc}")
                raise EmbeddingGenerationError(f"Voyage AI API error: {exc}") from exc

        return self._build_batch_result(normalized_chunks, all_vectors, total_tokens, start_time)

    async def aembed_chunks(
        self,
        chunks: List[Union[ContentChunk, Dict[str, Any]]],
        input_type: str = "document",
    ) -> BatchEmbeddingResult:
        """Generates embeddings for a batch of content chunks asynchronously with RPM rate limit pacing."""
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
        normalized_chunks, texts = self._normalize_input_chunks(chunks)
        all_vectors: List[List[float]] = []
        total_tokens = 0

        total_batches = (len(texts) + self.batch_size - 1) // self.batch_size
        pacing_seconds = float(os.getenv("VOYAGE_PACING_SECONDS", "20.5"))

        for idx, i in enumerate(range(0, len(texts), self.batch_size), start=1):
            batch_texts = texts[i : i + self.batch_size]
            max_retries = 3

            for attempt in range(max_retries):
                try:
                    response = await client.embed(texts=batch_texts, model=self.model, input_type=input_type)
                    all_vectors.extend(response.embeddings)
                    total_tokens += getattr(response, "total_tokens", 0)
                    break
                except Exception as exc:
                    err_str = str(exc).lower()
                    if ("rate limit" in err_str or "rpm" in err_str or "tpm" in err_str or "billing" in err_str) and attempt < max_retries - 1:
                        logger.warning(
                            f"Voyage AI rate limit hit on batch {idx}/{total_batches} (slice {i}, attempt {attempt + 1}/{max_retries}). "
                            "Pausing 22s for free-tier window reset..."
                        )
                        await asyncio.sleep(22.0)
                    else:
                        logger.error(f"Voyage AI async embedding error on batch slice {i}: {exc}")
                        raise EmbeddingGenerationError(f"Voyage AI API error: {exc}") from exc

            processed_chunks = min(i + self.batch_size, len(texts))
            pct = int((processed_chunks / len(texts)) * 100)
            logger.info(f"Voyage AI progress: batch {idx}/{total_batches} complete ({processed_chunks}/{len(texts)} chunks, {pct}%)...")

            # Enforce pacing when subsequent batches remain and pacing is configured
            if i + self.batch_size < len(texts) and pacing_seconds > 0:
                await asyncio.sleep(pacing_seconds)
                

        return self._build_batch_result(normalized_chunks, all_vectors, total_tokens, start_time)

    def embed_query(self, query: str) -> QueryEmbeddingResult:
        """Generates an embedding vector for a single user search query (input_type='query')."""
        if not query or not query.strip():
            raise ValueError("Query string cannot be empty.")

        client = self._get_client()
        try:
            response = client.embed(texts=[query.strip()], model=self.model, input_type="query")
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
            response = await client.embed(texts=[query.strip()], model=self.model, input_type="query")
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

__all__ = [
    "VOYAGE_MODEL_DIMENSIONS",
    "EmbeddingError",
    "EmbeddingConfigurationError",
    "EmbeddingGenerationError",
    "EmbeddedChunk",
    "EmbeddingBatchStats",
    "BatchEmbeddingResult",
    "QueryEmbeddingResult",
    "VoyageEmbeddingService",
    "embedding_service",
]
