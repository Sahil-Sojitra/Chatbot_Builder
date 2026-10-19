"""Pydantic data models for content normalization and chunking pipelines."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NormalizedPageRecord(BaseModel):
    """Cleaned and normalized page content record ready for chunking and vector storage."""

    source_url: str = Field(..., description="The original raw URL visited by the crawler.")
    canonical_url: str = Field(..., description="Normalized and canonicalized page URL.")
    title: Optional[str] = Field(None, description="Extracted or inferred page title.")
    content: str = Field(..., description="Cleaned Markdown or text content with headings preserved.")
    extracted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when the content record was extracted and normalized.",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Crawl metadata including character count, word count, status code, and content hash.",
    )


class ContentNormalizationStats(BaseModel):
    """Detailed statistics summarizing the content normalization batch operation."""

    total_input_pages: int = Field(0, description="Total number of page records received for processing.")
    usable_pages: int = Field(0, description="Number of valid, non-empty, unique pages retained.")
    empty_pages_discarded: int = Field(0, description="Pages discarded because they contained no meaningful text.")
    duplicate_pages_discarded: int = Field(0, description="Pages discarded due to duplicate URLs or identical content.")
    malformed_pages_discarded: int = Field(0, description="Pages discarded due to invalid structure or missing URL.")


class NormalizationResult(BaseModel):
    """Structured batch result returned by the content normalization service."""

    records: List[NormalizedPageRecord] = Field(default_factory=list, description="Cleaned page records.")
    stats: ContentNormalizationStats = Field(..., description="Normalization diagnostic statistics.")
    success: bool = Field(True, description="Whether the batch normalization operation succeeded.")


class ContentChunk(BaseModel):
    """Represents a bounded, coherent segment of a web page ready for embedding."""

    chunk_id: str = Field(
        ...,
        description="Deterministic stable unique identifier derived from canonical URL, chunk index, and content.",
    )
    source_url: str = Field(..., description="The original source URL of the page.")
    canonical_url: str = Field(..., description="The canonicalized URL of the page.")
    title: Optional[str] = Field(None, description="The title of the page.")
    content: str = Field(..., description="The text/markdown chunk content.")
    chunk_index: int = Field(..., description="Zero-based sequence index of this chunk within its parent page.")
    token_count: int = Field(..., description="Exact token count of this chunk based on the tokenizer.")
    char_count: int = Field(..., description="Character length of this chunk.")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Inherited page metadata and chunk-level indicators.",
    )


class ChunkingStats(BaseModel):
    """Statistical summary of a chunking operation."""

    total_pages_processed: int = Field(0, description="Total input pages provided for chunking.")
    total_chunks_created: int = Field(0, description="Total number of chunks produced.")
    avg_tokens_per_chunk: float = Field(0.0, description="Average token count across all created chunks.")
    min_tokens: int = Field(0, description="Smallest chunk size in tokens (0 if no chunks).")
    max_tokens: int = Field(0, description="Largest chunk size in tokens (0 if no chunks).")
    empty_pages_skipped: int = Field(0, description="Number of empty or sub-threshold pages skipped.")


class ChunkingResult(BaseModel):
    """Result of batch chunking containing all chunks and summary statistics."""

    chunks: List[ContentChunk] = Field(default_factory=list, description="List of generated content chunks.")
    stats: ChunkingStats = Field(..., description="Chunking execution statistics.")
    success: bool = Field(True, description="Whether chunking completed successfully.")
