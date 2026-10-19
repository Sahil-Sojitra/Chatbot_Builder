"""Pydantic data models for answer generation operations."""

from typing import List, Optional
from pydantic import BaseModel, Field


class SourceReference(BaseModel):
    """Structured reference linking generated answer statements back to source chunks."""

    chunk_id: str = Field(..., description="Unique deterministic identifier of the source chunk.")
    source_url: str = Field(..., description="Original webpage URL.")
    canonical_url: str = Field(..., description="Canonicalized webpage URL.")
    title: Optional[str] = Field(None, description="Title of the source webpage.")
    score: float = Field(..., description="Cosine similarity score indicating relevance.")
    snippet: str = Field(..., description="Short text snippet excerpt from the source chunk.")


class GenerationStats(BaseModel):
    """Diagnostics and performance metrics for an answer generation call."""

    model_name: str = Field(..., description="LLM model identifier used for generation.")
    duration_ms: float = Field(..., description="Time taken to generate the answer in milliseconds.")
    total_evidence_chunks: int = Field(0, description="Number of evidence chunks passed to the prompt.")
    tokens_used: Optional[int] = Field(None, description="Tokens consumed during generation, if reported.")


class GeneratedAnswer(BaseModel):
    """Comprehensive result of answering a question using grounded RAG evidence."""

    answer: str = Field(..., description="Synthesized natural language answer grounded in evidence.")
    sources: List[SourceReference] = Field(default_factory=list, description="Preserved source citations.")
    has_grounded_evidence: bool = Field(True, description="Whether answer is backed by relevant retrieved chunks.")
    stats: GenerationStats = Field(..., description="Diagnostics and generation metrics.")
