"""Services package."""

from app.services.crawler import crawler_service, CrawlResult, MultiPageCrawlResult, PageCrawlSummary
from app.services.security import validate_safe_url, SSRFValidationError
from app.services.link_discovery import filter_crawl4ai_internal_links, normalize_url
from app.services.content_normalizer import (
    content_normalizer,
    NormalizedPageRecord,
    NormalizationResult,
    ContentNormalizationStats,
)
from app.services.chunker import (
    chunker_service,
    ContentChunk,
    ChunkingStats,
    ChunkingResult,
)
from app.services.embedding import (
    embedding_service,
    EmbeddedChunk,
    BatchEmbeddingResult,
    EmbeddingBatchStats,
    QueryEmbeddingResult,
    EmbeddingError,
    EmbeddingConfigurationError,
    EmbeddingGenerationError,
)
from app.services.vector_store import (
    vector_store,
    VectorStoreAdapter,
    PineconeVectorStore,
    VectorSearchResult,
    VectorUpsertResult,
    VectorDeleteResult,
    VectorStoreError,
    VectorStoreConfigurationError,
)
from app.services.retrieval import (
    retrieval_service,
    KnowledgeRetrievalService,
    RetrievedChunk,
    RetrievalStats,
    RetrievalResult,
    RetrievalError,
    InvalidQueryError,
    DEFAULT_TOP_K,
)

__all__ = [
    "crawler_service",
    "CrawlResult",
    "MultiPageCrawlResult",
    "PageCrawlSummary",
    "validate_safe_url",
    "SSRFValidationError",
    "filter_crawl4ai_internal_links",
    "normalize_url",
    "content_normalizer",
    "NormalizedPageRecord",
    "NormalizationResult",
    "ContentNormalizationStats",
    "chunker_service",
    "ContentChunk",
    "ChunkingStats",
    "ChunkingResult",
    "embedding_service",
    "EmbeddedChunk",
    "BatchEmbeddingResult",
    "EmbeddingBatchStats",
    "QueryEmbeddingResult",
    "EmbeddingError",
    "EmbeddingConfigurationError",
    "EmbeddingGenerationError",
    "vector_store",
    "VectorStoreAdapter",
    "PineconeVectorStore",
    "VectorSearchResult",
    "VectorUpsertResult",
    "VectorDeleteResult",
    "VectorStoreError",
    "VectorStoreConfigurationError",
    "retrieval_service",
    "KnowledgeRetrievalService",
    "RetrievedChunk",
    "RetrievalStats",
    "RetrievalResult",
    "RetrievalError",
    "InvalidQueryError",
    "DEFAULT_TOP_K",
]
