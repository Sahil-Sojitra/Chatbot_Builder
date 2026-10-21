"""Google Gemini grounded answer generation service."""

import logging
import os
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.brand import extract_brand_name
from app.core.exceptions import (
    GenerationError,
    GenerationProviderError,
    GenerationTimeoutError,
)
from app.models.generator import (
    GeneratedAnswer,
    GenerationStats,
    SourceReference,
)
from app.models.retrieval import RetrievedChunk
from app.services.prompt_builder import (
    build_grounding_prompt,
    build_sources,
    create_soft_fallback,
)

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL: str = "gemini-3-flash-preview"
DEFAULT_TIMEOUT_SECONDS: float = 30.0


class LLMGenerationAdapter(ABC):
    """Abstract interface defining the contract for LLM generation adapters.

    Decouples LLM provider implementations (Gemini, Claude, OpenAI) from business logic.
    """

    @abstractmethod
    def generate_answer(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
        bot_name: Optional[str] = None,
        website_url: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> GeneratedAnswer:
        """Synchronously generates a grounded answer given a question and evidence chunks."""
        pass

    @abstractmethod
    async def agenerate_answer(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
        bot_name: Optional[str] = None,
        website_url: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> GeneratedAnswer:
        """Asynchronously generates a grounded answer given a question and evidence chunks."""
        pass


class GeminiGenerationAdapter(LLMGenerationAdapter):
    """Google Gemini generation adapter using direct REST API communication.

    Provides low-latency, streaming-ready grounded answer generation with strict
    anti-hallucination prompting and automatic rate-limit / provider error handling.
    """

    BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ):
        self._api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
        self.timeout_seconds = timeout_seconds

    def _get_api_key(self) -> str:
        """Retrieves and validates the configured Gemini API key."""
        key = self._api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            raise GenerationProviderError(
                "GEMINI_API_KEY is not configured. Set the GEMINI_API_KEY environment variable "
                "or pass api_key to GeminiGenerationAdapter."
            )
        return key.strip()

    def _prepare_call(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
        bot_name: Optional[str],
        website_url: Optional[str],
        system_prompt: Optional[str],
    ) -> Tuple[str, Dict[str, Any]]:
        """Prepares API endpoint URL and generation payload."""
        api_key = self._get_api_key()
        prompt = build_grounding_prompt(
            question=question,
            evidence_chunks=evidence_chunks,
            bot_name=bot_name,
            website_url=website_url,
            system_prompt=system_prompt,
        )
        url = f"{self.BASE_URL}/{self.model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,  # Low temperature for strict factual grounding
                "maxOutputTokens": 2048,
            },
        }
        return url, payload

    def _process_response(
        self,
        response: httpx.Response,
        evidence_chunks: List[RetrievedChunk],
        sources: List[SourceReference],
        start_time: float,
        bot_name: Optional[str],
        website_url: Optional[str],
    ) -> GeneratedAnswer:
        """Processes Gemini HTTP response, gracefully handling errors via soft fallback."""
        if response.status_code == 429:
            logger.warning("Gemini API rate limit exceeded (HTTP 429). Activating soft fallback.")
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="experiencing high traffic demand",
                bot_name=bot_name, website_url=website_url,
            )
        if response.status_code >= 500:
            logger.warning(f"Gemini API server error (HTTP {response.status_code}). Activating soft fallback.")
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="experiencing a temporary service interruption",
                bot_name=bot_name, website_url=website_url,
            )
        if response.status_code != 200:
            logger.warning(f"Gemini API error (HTTP {response.status_code}). Activating soft fallback.")
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="temporarily unavailable",
                bot_name=bot_name, website_url=website_url,
            )

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            logger.warning("Gemini API returned no candidates. Activating soft fallback.")
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="unable to formulate an answer",
                bot_name=bot_name, website_url=website_url,
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        answer_text = "".join(part.get("text", "") for part in parts).strip()
        if not answer_text:
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="unable to formulate an answer",
                bot_name=bot_name, website_url=website_url,
            )

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return GeneratedAnswer(
            answer=answer_text,
            sources=sources,
            has_grounded_evidence=True,
            stats=GenerationStats(
                model_name=self.model,
                duration_ms=duration_ms,
                total_evidence_chunks=len(evidence_chunks),
            ),
        )

    def generate_answer(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
        bot_name: Optional[str] = None,
        website_url: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> GeneratedAnswer:
        """Synchronously generates a grounded answer using Google Gemini with soft fallback."""
        start_time = time.perf_counter()
        sources = build_sources(evidence_chunks)

        if not evidence_chunks:
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                bot_name=bot_name, website_url=website_url,
            )

        url, payload = self._prepare_call(question, evidence_chunks, bot_name, website_url, system_prompt)

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(url, json=payload)
        except httpx.TimeoutException as exc:
            logger.warning(f"Gemini API request timed out after {self.timeout_seconds}s: {exc}.")
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="experiencing momentary delays",
                bot_name=bot_name, website_url=website_url,
            )
        except Exception as exc:
            logger.warning(f"Gemini API connection error: {exc}.")
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="experiencing temporary connection delays",
                bot_name=bot_name, website_url=website_url,
            )

        return self._process_response(response, evidence_chunks, sources, start_time, bot_name, website_url)

    async def agenerate_answer(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
        bot_name: Optional[str] = None,
        website_url: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> GeneratedAnswer:
        """Asynchronously generates a grounded answer using Google Gemini with soft fallback."""
        start_time = time.perf_counter()
        sources = build_sources(evidence_chunks)

        if not evidence_chunks:
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                bot_name=bot_name, website_url=website_url,
            )

        url, payload = self._prepare_call(question, evidence_chunks, bot_name, website_url, system_prompt)

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(url, json=payload)
        except httpx.TimeoutException as exc:
            logger.warning(f"Gemini async API request timed out after {self.timeout_seconds}s: {exc}.")
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="experiencing momentary delays",
                bot_name=bot_name, website_url=website_url,
            )
        except Exception as exc:
            logger.warning(f"Gemini async API connection error: {exc}.")
            return create_soft_fallback(
                self.model, evidence_chunks, sources, start_time,
                note="experiencing temporary connection delays",
                bot_name=bot_name, website_url=website_url,
            )

        return self._process_response(response, evidence_chunks, sources, start_time, bot_name, website_url)


# Global singleton instance
answer_generator_service = GeminiGenerationAdapter()
generator_service = answer_generator_service

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
