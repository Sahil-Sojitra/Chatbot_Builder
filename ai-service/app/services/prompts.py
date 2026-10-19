"""Backwards-compatible alias for app.services.prompt_builder."""

from app.services.prompt_builder import (
    build_grounding_prompt,
    build_sources,
    create_soft_fallback,
)

__all__ = [
    "build_sources",
    "build_grounding_prompt",
    "create_soft_fallback",
]
