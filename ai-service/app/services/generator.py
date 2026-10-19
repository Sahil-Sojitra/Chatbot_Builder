"""Backwards-compatible alias for app.services.answer_generator."""

from app.services.answer_generator import (
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

__all__ = [
    "DEFAULT_GEMINI_MODEL",
    "DEFAULT_TIMEOUT_SECONDS",
    "extract_brand_name",
    "GenerationError",
    "GenerationTimeoutError",
    "GenerationProviderError",
    "SourceReference",
    "GenerationStats",
    "GeneratedAnswer",
    "LLMGenerationAdapter",
    "GeminiGenerationAdapter",
    "answer_generator_service",
    "generator_service",
]
