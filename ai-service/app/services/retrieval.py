"""Backwards-compatible alias for app.services.knowledge_retriever."""

from app.services.knowledge_retriever import (
    DEFAULT_TOP_K,
    MAX_TOP_K,
    MIN_TOP_K,
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

__all__ = [
    "DEFAULT_TOP_K",
    "MIN_TOP_K",
    "MAX_TOP_K",
    "boost_chunks_by_keywords",
    "RetrievalError",
    "InvalidQueryError",
    "RetrievedChunk",
    "RetrievalStats",
    "RetrievalResult",
    "KnowledgeRetrievalService",
    "knowledge_retriever_service",
    "retrieval_service",
]
