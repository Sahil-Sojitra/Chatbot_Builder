"""Unified domain exceptions hierarchy for the AI service."""


class AIServiceException(Exception):
    """Base exception for all internal AI service errors."""
    pass


# --- Embedding Exceptions ---
class EmbeddingError(AIServiceException):
    """Base exception for all embedding operations."""
    pass


class EmbeddingConfigurationError(EmbeddingError):
    """Raised when an embedding provider is misconfigured (e.g., missing API key)."""
    pass


class EmbeddingGenerationError(EmbeddingError):
    """Raised when an embedding provider API request fails."""
    pass


# --- Vector Store Exceptions ---
class VectorStoreError(AIServiceException):
    """Base exception for vector database operations."""
    pass


class VectorStoreConfigurationError(VectorStoreError):
    """Raised when vector database credentials or index are misconfigured."""
    pass


# --- Retrieval Exceptions ---
class RetrievalError(AIServiceException):
    """Base exception for all knowledge retrieval operations."""
    pass


class InvalidQueryError(RetrievalError, ValueError):
    """Raised when a chatbot ID or user query fails validation."""
    pass


# --- Generation Exceptions ---
class GenerationError(AIServiceException):
    """Base exception for all answer generation errors."""
    pass


class GenerationTimeoutError(GenerationError):
    """Raised when an LLM provider request times out."""
    pass


class GenerationProviderError(GenerationError):
    """Raised when an upstream LLM provider API returns an error or fails."""
    pass
