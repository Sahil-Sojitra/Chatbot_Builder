"""Backwards-compatible alias for app.services.text_chunker."""

from app.services.text_chunker import (
    ChunkingResult,
    ChunkingStats,
    ContentChunk,
    ContentChunker,
    chunker_service,
    text_chunker_service,
)

__all__ = [
    "ContentChunk",
    "ChunkingStats",
    "ChunkingResult",
    "ContentChunker",
    "chunker_service",
    "text_chunker_service",
]
