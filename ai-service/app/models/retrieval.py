"""Pydantic data models for knowledge retrieval operations."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


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
