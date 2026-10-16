import os
import time
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import httpx

from app.services.retrieval import RetrievedChunk

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL: str = "gemini-3.5-flash-lite"
DEFAULT_TIMEOUT_SECONDS: float = 15.0


class GenerationError(Exception):
    """Base exception for all answer generation errors."""
    pass


class GenerationTimeoutError(GenerationError):
    """Raised when an LLM provider request times out."""
    pass


class GenerationProviderError(GenerationError):
    """Raised when an upstream LLM provider API returns an error or fails."""
    pass


class SourceReference(BaseModel):
    """Structured reference linking generated answer statements back to source chunks."""

    chunk_id: str = Field(..., description="Unique deterministic identifier of the source chunk.")
    source_url: str = Field(..., description="Original webpage URL.")
    canonical_url: str = Field(..., description="Canonicalized webpage URL.")
    title: Optional[str] = Field(None, description="Title of the source webpage.")
    score: float = Field(..., description="Cosine similarity score indicating relevance.")
    snippet: str = Field(..., description="Short text snippet excerpt from the source chunk.")


class GenerationStats(BaseModel):
    """Diagnostics and performance metrics for an answer generation call."""

    model_name: str = Field(..., description="LLM model identifier used for generation.")
    duration_ms: float = Field(..., description="Time taken to generate the answer in milliseconds.")
    total_evidence_chunks: int = Field(0, description="Number of evidence chunks passed to the prompt.")
    tokens_used: Optional[int] = Field(None, description="Tokens consumed during generation, if reported.")


class GeneratedAnswer(BaseModel):
    """Comprehensive result of answering a question using grounded RAG evidence."""

    answer: str = Field(..., description="Synthesized natural language answer grounded in evidence.")
    sources: List[SourceReference] = Field(default_factory=list, description="Preserved source citations.")
    has_grounded_evidence: bool = Field(True, description="Whether answer is backed by relevant retrieved chunks.")
    stats: GenerationStats = Field(..., description="Diagnostics and generation metrics.")


class LLMGenerationAdapter(ABC):
    """Abstract interface defining the contract for LLM generation adapters.

    Decouples LLM provider implementations (Gemini, Claude, OpenAI) from business logic.
    """

    @abstractmethod
    def generate_answer(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
    ) -> GeneratedAnswer:
        """Synchronously generates a grounded answer given a question and evidence chunks."""
        pass

    @abstractmethod
    async def agenerate_answer(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
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
        key = self._api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            raise GenerationProviderError(
                "GEMINI_API_KEY is not configured. Set the GEMINI_API_KEY environment variable "
                "or pass api_key to GeminiGenerationAdapter."
            )
        return key.strip()

    @staticmethod
    def _build_sources(evidence_chunks: List[RetrievedChunk]) -> List[SourceReference]:
        """Converts retrieved chunks into unique structured source references with clean snippets."""
        sources: List[SourceReference] = []
        seen_urls: set[str] = set()

        for chunk in evidence_chunks:
            url_key = (chunk.canonical_url or chunk.source_url or "").lower().strip()
            if url_key in seen_urls:
                continue
            seen_urls.add(url_key)

            # Produce a clean snippet (up to 200 chars)
            clean_text = " ".join(chunk.content.split())
            snippet = clean_text[:200] + "..." if len(clean_text) > 200 else clean_text
            sources.append(
                SourceReference(
                    chunk_id=chunk.chunk_id,
                    source_url=chunk.source_url,
                    canonical_url=chunk.canonical_url,
                    title=chunk.title,
                    score=chunk.score,
                    snippet=snippet,
                )
            )
        return sources

    @staticmethod
    def _build_prompt(question: str, evidence_chunks: List[RetrievedChunk]) -> str:
        """Constructs a clean grounding prompt preventing repetitive citations and hallucination."""
        # Group chunks by unique source URL to present clean, coherent context
        grouped_by_url: Dict[str, List[RetrievedChunk]] = {}
        for chunk in evidence_chunks:
            key = chunk.canonical_url or chunk.source_url
            grouped_by_url.setdefault(key, []).append(chunk)

        context_blocks = []
        for idx, (url, chunks) in enumerate(grouped_by_url.items(), start=1):
            title = chunks[0].title or "Webpage"
            passages = "\n\n".join(c.content.strip() for c in chunks)
            context_blocks.append(f"--- Document {idx}: {title} ({url}) ---\n{passages}")

        context_text = "\n\n".join(context_blocks)

        prompt = (
            "You are a helpful, professional, and friendly AI assistant for this organization.\n"
            "Your objective is to answer the user's question accurately using ONLY the provided evidence passages below.\n\n"
            "STRICT GUIDELINES:\n"
            "1. Answer ONLY using the facts stated directly in the provided evidence passages.\n"
            "2. If the evidence passages DO NOT contain the information needed to answer the question, state: "
            "'I do not have enough information in the indexed website knowledge base to answer this question.'\n"
            "3. Format your response cleanly using natural, polished markdown (e.g., bullet points for lists, bolding for key terms).\n"
            "4. NEVER mention source tags like 'Source 1', 'Source 2', or '[Source X]' in your answer text. The UI already displays sources separately below your response. Write fluent, natural paragraphs and clean bullet points without citation clutter.\n"
            "5. When the user asks for a specific page link or URL (such as Careers, Contact, or Services), provide the exact page link (e.g. [Careers Page](https://webosmotic.com/careers)) using standard markdown [Link Text](https://...). Do NOT insert a space between the closing bracket and opening parenthesis.\n"
            "6. Keep your tone engaging, professional, and concise.\n\n"
            f"=== EVIDENCE PASSAGES ===\n{context_text}\n=== END OF EVIDENCE ===\n\n"
            f"USER QUESTION: {question.strip()}\n\n"
            "ANSWER:"
        )
        return prompt

    def generate_answer(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
    ) -> GeneratedAnswer:
        """Synchronously generates a grounded answer using Google Gemini."""
        start_time = time.perf_counter()
        sources = self._build_sources(evidence_chunks)

        if not evidence_chunks:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return GeneratedAnswer(
                answer="I do not have enough information in the indexed website knowledge base to answer this question.",
                sources=[],
                has_grounded_evidence=False,
                stats=GenerationStats(
                    model_name=self.model,
                    duration_ms=duration_ms,
                    total_evidence_chunks=0,
                ),
            )

        api_key = self._get_api_key()
        prompt = self._build_prompt(question, evidence_chunks)
        url = f"{self.BASE_URL}/{self.model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,  # Low temperature for factual grounding
                "maxOutputTokens": 800,
            },
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(url, json=payload)
        except httpx.TimeoutException as exc:
            logger.error(f"Gemini API request timed out after {self.timeout_seconds}s: {exc}")
            raise GenerationTimeoutError(f"Gemini API request timed out: {exc}") from exc
        except Exception as exc:
            logger.error(f"Gemini API connection error: {exc}")
            raise GenerationProviderError(f"Gemini API connection failed: {exc}") from exc

        if response.status_code == 429:
            raise GenerationProviderError("Gemini API rate limit exceeded (HTTP 429). Please try again shortly.")
        if response.status_code >= 500:
            raise GenerationProviderError(f"Gemini API server error (HTTP {response.status_code}): {response.text}")
        if response.status_code != 200:
            raise GenerationProviderError(f"Gemini API error (HTTP {response.status_code}): {response.text}")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise GenerationProviderError("Gemini API returned no response candidates.")

        parts = candidates[0].get("content", {}).get("parts", [])
        answer_text = "".join(part.get("text", "") for part in parts).strip()
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

    async def agenerate_answer(
        self,
        question: str,
        evidence_chunks: List[RetrievedChunk],
    ) -> GeneratedAnswer:
        """Asynchronously generates a grounded answer using Google Gemini."""
        start_time = time.perf_counter()
        sources = self._build_sources(evidence_chunks)

        if not evidence_chunks:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return GeneratedAnswer(
                answer="I do not have enough information in the indexed website knowledge base to answer this question.",
                sources=[],
                has_grounded_evidence=False,
                stats=GenerationStats(
                    model_name=self.model,
                    duration_ms=duration_ms,
                    total_evidence_chunks=0,
                ),
            )

        api_key = self._get_api_key()
        prompt = self._build_prompt(question, evidence_chunks)
        url = f"{self.BASE_URL}/{self.model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(url, json=payload)
        except httpx.TimeoutException as exc:
            logger.error(f"Gemini async API request timed out after {self.timeout_seconds}s: {exc}")
            raise GenerationTimeoutError(f"Gemini API request timed out: {exc}") from exc
        except Exception as exc:
            logger.error(f"Gemini async API connection error: {exc}")
            raise GenerationProviderError(f"Gemini API connection failed: {exc}") from exc

        if response.status_code == 429:
            raise GenerationProviderError("Gemini API rate limit exceeded (HTTP 429). Please try again shortly.")
        if response.status_code >= 500:
            raise GenerationProviderError(f"Gemini API server error (HTTP {response.status_code}): {response.text}")
        if response.status_code != 200:
            raise GenerationProviderError(f"Gemini API error (HTTP {response.status_code}): {response.text}")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise GenerationProviderError("Gemini API returned no response candidates.")

        parts = candidates[0].get("content", {}).get("parts", [])
        answer_text = "".join(part.get("text", "") for part in parts).strip()
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


# Global singleton instance
generator_service = GeminiGenerationAdapter()
