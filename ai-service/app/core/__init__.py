"""Core cross-cutting utilities and domain exceptions."""

from app.core.exceptions import (
    AIServiceException,
    EmbeddingError,
    EmbeddingConfigurationError,
    EmbeddingGenerationError,
    VectorStoreError,
    VectorStoreConfigurationError,
    RetrievalError,
    InvalidQueryError,
    GenerationError,
    GenerationTimeoutError,
    GenerationProviderError,
)
from app.core.brand import extract_brand_name
from app.core.url_utils import get_url_priority
from app.core.config import Settings, get_settings
from app.core.internal_auth import verify_internal_api_key

__all__ = [
    "AIServiceException",
    "EmbeddingError",
    "EmbeddingConfigurationError",
    "EmbeddingGenerationError",
    "VectorStoreError",
    "VectorStoreConfigurationError",
    "RetrievalError",
    "InvalidQueryError",
    "GenerationError",
    "GenerationTimeoutError",
    "GenerationProviderError",
    "extract_brand_name",
    "get_url_priority",
    "Settings",
    "get_settings",
    "verify_internal_api_key",
]

