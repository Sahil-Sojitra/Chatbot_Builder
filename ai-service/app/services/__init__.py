"""Services package exposing all pipeline services, adapters, and data contracts."""

from app.services.crawler import (
    Crawl4AICrawler,
    CrawlResult,
    LinkDiscoveryResult,
    MultiPageCrawlResult,
    PageCrawlSummary,
    crawler_service,
    web_crawler_service,
)
from app.services.sitemap import (
    SitemapService,
    sitemap_service,
)
from app.services.security import (
    FORBIDDEN_HOSTNAMES,
    SSRFValidationError,
    is_ip_allowed,
    validate_safe_url,
)
from app.services.link_discovery import (
    filter_crawl4ai_internal_links,
    is_eligible_internal_link,
    normalize_url,
)
from app.services.content_normalizer import (
    ContentNormalizationStats,
    ContentNormalizer,
    NormalizationResult,
    NormalizedPageRecord,
    content_normalizer,
)
from app.services.chunker import (
    ChunkingResult,
    ChunkingStats,
    ContentChunk,
    ContentChunker,
    chunker_service,
    text_chunker_service,
)
from app.services.embedding import (
    BatchEmbeddingResult,
    EmbeddedChunk,
    EmbeddingBatchStats,
    EmbeddingConfigurationError,
    EmbeddingError,
    EmbeddingGenerationError,
    QueryEmbeddingResult,
    VoyageEmbeddingService,
    embedding_service,
)
from app.services.vector_store import (
    PineconeVectorStore,
    VectorDeleteResult,
    VectorSearchResult,
    VectorStoreAdapter,
    VectorStoreConfigurationError,
    VectorStoreError,
    VectorUpsertResult,
    vector_store,
)
from app.services.retrieval import (
    DEFAULT_TOP_K,
    InvalidQueryError,
    KnowledgeRetrievalService,
    RetrievalError,
    RetrievalResult,
    RetrievalStats,
    RetrievedChunk,
    boost_chunks_by_keywords,
    knowledge_retriever_service,
    retrieval_service,
)
from app.services.generator import (
    DEFAULT_GEMINI_MODEL,
    DEFAULT_TIMEOUT_SECONDS,
    GeminiGenerationAdapter,
    GeneratedAnswer,
    GenerationError,
    GenerationProviderError,
    GenerationStats,
    GenerationTimeoutError,
    LLMGenerationAdapter,
    SourceReference,
    answer_generator_service,
    extract_brand_name,
    generator_service,
)
from app.services.qa import (
    QARequest,
    QAResponse,
    QAStats,
    RAGQuestionAnsweringService,
    qa_service,
    rag_pipeline_service,
)
from app.services.prompt_builder import (
    build_grounding_prompt,
    build_sources,
    create_soft_fallback,
)
from app.services.keyword_reranker import boost_chunks_by_keywords

__all__ = [
    # Crawler
    "crawler_service",
    "web_crawler_service",
    "Crawl4AICrawler",
    "CrawlResult",
    "MultiPageCrawlResult",
    "PageCrawlSummary",
    "LinkDiscoveryResult",
    # Security
    "validate_safe_url",
    "SSRFValidationError",
    "FORBIDDEN_HOSTNAMES",
    "is_ip_allowed",
    # Link Discovery
    "filter_crawl4ai_internal_links",
    "is_eligible_internal_link",
    "normalize_url",
    # Normalizer
    "content_normalizer",
    "ContentNormalizer",
    "NormalizedPageRecord",
    "NormalizationResult",
    "ContentNormalizationStats",
    # Chunker
    "chunker_service",
    "text_chunker_service",
    "ContentChunker",
    "ContentChunk",
    "ChunkingStats",
    "ChunkingResult",
    # Embedding
    "embedding_service",
    "VoyageEmbeddingService",
    "EmbeddedChunk",
    "BatchEmbeddingResult",
    "EmbeddingBatchStats",
    "QueryEmbeddingResult",
    "EmbeddingError",
    "EmbeddingConfigurationError",
    "EmbeddingGenerationError",
    # Vector Store
    "vector_store",
    "VectorStoreAdapter",
    "PineconeVectorStore",
    "VectorSearchResult",
    "VectorUpsertResult",
    "VectorDeleteResult",
    "VectorStoreError",
    "VectorStoreConfigurationError",
    # Retrieval
    "retrieval_service",
    "knowledge_retriever_service",
    "KnowledgeRetrievalService",
    "RetrievedChunk",
    "RetrievalStats",
    "RetrievalResult",
    "RetrievalError",
    "InvalidQueryError",
    "DEFAULT_TOP_K",
    "boost_chunks_by_keywords",
    # Generator & Prompts
    "generator_service",
    "answer_generator_service",
    "LLMGenerationAdapter",
    "GeminiGenerationAdapter",
    "SourceReference",
    "GeneratedAnswer",
    "GenerationStats",
    "GenerationError",
    "GenerationTimeoutError",
    "GenerationProviderError",
    "DEFAULT_GEMINI_MODEL",
    "DEFAULT_TIMEOUT_SECONDS",
    "extract_brand_name",
    "build_grounding_prompt",
    "build_sources",
    "create_soft_fallback",
    # QA & RAG Pipeline
    "qa_service",
    "rag_pipeline_service",
    "RAGQuestionAnsweringService",
    "QARequest",
    "QAResponse",
    "QAStats",
]
