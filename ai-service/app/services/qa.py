"""Backwards-compatible alias for app.services.rag_pipeline."""

from app.services.rag_pipeline import (
    GenerationError,
    GenerationProviderError,
    GenerationTimeoutError,
    InvalidQueryError,
    QARequest,
    QAResponse,
    QAStats,
    RAGQuestionAnsweringService,
    RetrievalError,
    SourceReference,
    qa_service,
    rag_pipeline_service,
)

__all__ = [
    "QARequest",
    "QAStats",
    "QAResponse",
    "SourceReference",
    "RAGQuestionAnsweringService",
    "qa_service",
    "rag_pipeline_service",
    "InvalidQueryError",
    "RetrievalError",
    "GenerationError",
    "GenerationTimeoutError",
    "GenerationProviderError",
]
