"""Package containing all domain data models and schemas for the AI service."""

from app.models.crawler import (
    CrawlResult,
    LinkDiscoveryResult,
    PageCrawlSummary,
    MultiPageCrawlResult,
)
from app.models.content import (
    NormalizedPageRecord,
    ContentNormalizationStats,
    NormalizationResult,
    ContentChunk,
    ChunkingStats,
    ChunkingResult,
)
from app.models.embedding import (
    EmbeddedChunk,
    EmbeddingBatchStats,
    BatchEmbeddingResult,
    QueryEmbeddingResult,
)
from app.models.vector_store import (
    VectorSearchResult,
    VectorUpsertResult,
    VectorDeleteResult,
)
from app.models.retrieval import (
    RetrievedChunk,
    RetrievalStats,
    RetrievalResult,
)
from app.models.generator import (
    SourceReference,
    GenerationStats,
    GeneratedAnswer,
)
from app.models.qa import (
    QARequest,
    QAStats,
    QAResponse,
)

__all__ = [
    # Crawler
    "CrawlResult",
    "LinkDiscoveryResult",
    "PageCrawlSummary",
    "MultiPageCrawlResult",
    # Content & Chunks
    "NormalizedPageRecord",
    "ContentNormalizationStats",
    "NormalizationResult",
    "ContentChunk",
    "ChunkingStats",
    "ChunkingResult",
    # Embedding
    "EmbeddedChunk",
    "EmbeddingBatchStats",
    "BatchEmbeddingResult",
    "QueryEmbeddingResult",
    # Vector Store
    "VectorSearchResult",
    "VectorUpsertResult",
    "VectorDeleteResult",
    # Retrieval
    "RetrievedChunk",
    "RetrievalStats",
    "RetrievalResult",
    # Generator
    "SourceReference",
    "GenerationStats",
    "GeneratedAnswer",
    # QA
    "QARequest",
    "QAStats",
    "QAResponse",
]
