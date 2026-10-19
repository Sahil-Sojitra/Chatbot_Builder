"""Pydantic data models for vector database operations."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


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

    chatbot_id: str = Field(..., description="Target chatbot namespace.")
    upserted_count: int = Field(..., description="Number of vector records upserted.")
    success: bool = Field(True, description="Whether the upsert operation succeeded.")
    error_message: Optional[str] = Field(None, description="Error message if the upsert failed.")


class VectorDeleteResult(BaseModel):
    """Execution result for deleting a chatbot's indexed content."""

    chatbot_id: str = Field(..., description="Target chatbot namespace whose content was deleted.")
    deleted_count: Optional[int] = Field(None, description="Number of vectors deleted if reported.")
    success: bool = Field(True, description="Whether the delete operation succeeded.")
    error_message: Optional[str] = Field(None, description="Error message if the deletion failed.")
