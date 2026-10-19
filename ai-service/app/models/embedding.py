"""Pydantic data models for embedding operations and results."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EmbeddedChunk(BaseModel):
    """Normalized content chunk enriched with dense vector embeddings."""

    chunk_id: str = Field(..., description="Unique deterministic identifier matching the parent chunk.")
    source_url: str = Field(..., description="The original raw website URL.")
    canonical_url: str = Field(..., description="The normalized website URL.")
    title: Optional[str] = Field(None, description="The title of the page.")
    content: str = Field(..., description="Text content that was embedded.")
    chunk_index: int = Field(..., description="Sequential index within the document.")
    embedding: List[float] = Field(..., description="Dense numerical vector embedding from Voyage AI.")
    dimensions: int = Field(..., description="Vector dimensionality (e.g. 1024 for voyage-4).")
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

    embedded_chunks: List[EmbeddedChunk] = Field(default_factory=list, description="List of embedded chunks.")
    stats: EmbeddingBatchStats = Field(..., description="Diagnostic statistics for the batch run.")
    success: bool = Field(True, description="Whether the embedding generation succeeded.")
    error_message: Optional[str] = Field(None, description="Error message if the batch run failed.")


class QueryEmbeddingResult(BaseModel):
    """Result of embedding a single search query."""

    query: str = Field(..., description="The input search query text.")
    embedding: List[float] = Field(..., description="Query vector embedding.")
    dimensions: int = Field(..., description="Vector dimensionality.")
    model_name: str = Field(..., description="Model identifier used.")
    token_count: int = Field(0, description="Tokens consumed by the query.")
