import os
import re
import time
import logging
from urllib.parse import urlparse
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import httpx

from app.services.retrieval import RetrievedChunk

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL: str = "gemini-3.5-flash-lite"
DEFAULT_TIMEOUT_SECONDS: float = 15.0


def extract_brand_name(bot_name: Optional[str] = None, website_url: Optional[str] = None) -> str:
    """Extracts a clean, human-readable brand/company name from bot name or website URL."""
    if bot_name and bot_name.strip():
        cleaned = re.sub(
            r"\s+(?:AI\s+)?(?:Assistant|Bot|Chatbot|Agent)$",
            "",
            bot_name.strip(),
            flags=re.IGNORECASE,
        )
        if cleaned.strip():
            return cleaned.strip()

    if website_url and website_url.strip():
        try:
            parsed = urlparse(website_url.strip())
            host = parsed.hostname or parsed.path
            host = re.sub(r"^www\.", "", host)
            parts = host.split(".")
            main_part = parts[0] if len(parts) > 1 else host
            if main_part:
                return main_part.capitalize()
        except Exception:
            pass

    return "our team"


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
    def _build_prompt(
        question: str,
        evidence_chunks: List[RetrievedChunk],
        bot_name: Optional[str] = None,
        website_url: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Constructs a clean grounding prompt establishing native first-party brand identity."""
        brand = extract_brand_name(bot_name, website_url)

        # Group chunks by unique source URL to present clean, coherent context
        grouped_by_url: Dict[str, List[RetrievedChunk]] = {}
        for chunk in evidence_chunks:
            key = chunk.canonical_url or chunk.source_url
            grouped_by_url.setdefault(key, []).append(chunk)

        context_blocks = []
        for idx, (url, chunks) in enumerate(grouped_by_url.items(), start=1):
            title = chunks[0].title or "Webpage"
            passages = "\n\n".join(c.content.strip() for c in chunks)
            context_blocks.append(f"=== Document {idx}: {title} ===\nURL: {url}\nContent:\n{passages}")

        context_text = "\n\n".join(context_blocks)

        custom_prompt_section = ""
        if system_prompt and system_prompt.strip():
            custom_prompt_section = (
                f"\n=== CUSTOM BOT INSTRUCTIONS (HIGHEST PRIORITY) ===\n"
                f"{system_prompt.strip()}\n"
                f"=== END OF CUSTOM INSTRUCTIONS ===\n\n"
            )

        prompt = (
            f"You are the official representative and assistant for {brand}.\n"
            f"You are integrated directly into our official website{f' ({website_url})' if website_url else ''} to help our visitors and customers.\n"
            "Your objective is to provide an accurate, helpful, welcoming, and professionally structured answer "
            "based strictly on our website content provided below.\n\n"
            f"{custom_prompt_section}"
            "=== OPERATIONAL DIRECTIVES ===\n"
            f"1. FIRST-PERSON BRAND IDENTITY & VOICE:\n"
            f"   - You ARE an integral part of {brand}. Always speak in the first-person plural ('we', 'our', 'us', 'our team', 'at {brand}') when describing products, services, capabilities, values, and policies.\n"
            f"   - NEVER refer to {brand} in the detached third person (do NOT say '{brand} is a company that...' or 'The website says...'). Instead say 'We offer...', 'At {brand}, we provide...', 'Our team specializes in...'.\n"
            "   - NEVER use robotic third-party disclaimers such as 'According to the provided documents', 'Based on the context', 'Document 1 states', or 'in the indexed website knowledge base'. Speak naturally and authoritatively as our website representative.\n\n"
            f"2. CONVERSATIONAL INTENT & GREETINGS:\n"
            f"   - If the user sends a greeting (e.g., 'Hello', 'Hi', 'Hey', 'Good morning') or asks about you (e.g., 'Who are you?', 'What do you do?'):\n"
            f"     Warmly introduce yourself as the official assistant for {brand}, welcome them to our website, and briefly summarize what we offer or invite them to ask about our services, products, or documentation.\n"
            "   - Never return an unhelpful or robotic rejection for simple pleasantries.\n\n"
            "3. STRICT FACTUAL GROUNDING & FAITHFULNESS:\n"
            "   - Answer using ONLY the information and facts stated directly in the provided evidence documents below.\n"
            "   - Do NOT assume, speculate, extrapolate, or introduce outside knowledge not present in our website text.\n"
            f"   - If our website evidence DOES NOT contain the details to answer the user's inquiry, respond politely and helpfully as our team member. State:\n"
            f"     'We don\\'t have those specific details on hand right now. For more information, please feel free to reach out to our team directly through our contact page or support channels, and we\\'ll be glad to help!'\n"
            "     (If contact details or links are available in the evidence, offer them naturally).\n\n"
            "4. SEMANTIC UNDERSTANDING & SYNONYM MATCHING:\n"
            "   - Interpret user queries conceptually and semantically. Users may use synonyms or informal phrasing that differ from our exact website wording "
            "(e.g., 'fees/cost' vs 'pricing', 'register/signup' vs 'get started', 'cancel' vs 'manage subscription', 'shipping/delivery' vs 'dispatch', 'creators/team' vs 'leadership/authors'). "
            "Intelligently map user intent to the matching concepts in our website evidence.\n\n"
            "5. DIRECT & COMPREHENSIVE SYNTHESIS:\n"
            "   - Start with a direct, definitive answer to the user's core inquiry in your very first sentence.\n"
            "   - Carefully cross-reference and synthesize information across ALL provided document passages. Look for names, features, specifications, pricing, steps, policies, and contact channels that may be distributed across different pages.\n"
            "   - For multi-part or compound questions, systematically address every part.\n"
            "   - If the evidence only partially answers the question, share all verified facts we have and clearly let the user know which specific detail was not covered.\n\n"
            "6. HIGH-FIDELITY DATA & ENTITY PRESERVATION:\n"
            "   - Preserve exact figures, numbers, currencies (e.g., USD, EUR, INR, GBP, $, etc.), contact emails, phone numbers, physical/digital addresses, opening hours, technical terms, code snippets, and version numbers verbatim from the text. Never truncate, round, or distort specific values.\n\n"
            "7. ACCURATE NAVIGATION & PAGE LINKS:\n"
            "   - When referring to specific pages, resources, or when the user asks for links, embed the exact URL from the document header as a standard markdown link: [Descriptive Page Title](url).\n"
            "   - Use ONLY the exact URLs present in the document headers. Never invent, modify, or hallucinate URLs.\n"
            "   - Ensure proper markdown link syntax with NO space between bracket and parenthesis: [Text](URL).\n\n"
            "8. ADAPTIVE, DOMAIN-AGNOSTIC PRESENTATION:\n"
            "   - Present answers cleanly using structured Markdown:\n"
            "     * Technical / Docs: Use code blocks (```) with language identifiers for commands, API endpoints, code snippets, or configuration.\n"
            "     * E-Commerce / SaaS: Use Markdown tables or bullet lists for comparisons, feature breakdowns, pricing tiers, and specifications.\n"
            "     * How-To / Procedures: Use numbered sequential steps (1., 2., 3.) for workflows and instructions.\n"
            "     * Highlighting: Use bold text (**terms**) for key terms, entities, and important values.\n"
            "   - NEVER include raw citation tags or internal markers like 'Source 1', 'Document 1', or '[Source X]' in your answer text. The user interface automatically displays verified source badges separately. Write natural, flowing paragraphs and bullet points.\n\n"
            "9. TONE & EFFICIENCY:\n"
            f"   - Maintain a confident, welcoming, polite, and professional tone as a genuine member of the {brand} team.\n\n"
            f"=== WEBSITE EVIDENCE ===\n{context_text}\n=== END OF EVIDENCE ===\n\n"
            f"USER QUESTION: {question.strip()}\n\n"
            "ANSWER:"
        )

        return prompt

    def _create_soft_fallback(
        self,
        evidence_chunks: List[RetrievedChunk],
        sources: List[SourceReference],
        start_time: float,
        note: str = "experiencing high demand",
        bot_name: Optional[str] = None,
        website_url: Optional[str] = None,
    ) -> GeneratedAnswer:
        """Gracefully constructs a helpful, grounded response from retrieved passages when the LLM call fails."""
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        brand = extract_brand_name(bot_name, website_url)

        if not evidence_chunks:
            return GeneratedAnswer(
                answer=(
                    f"Welcome to {brand}! We don't have those specific details on hand right now. "
                    "Please feel free to reach out to our team directly through our contact page or support channels, "
                    "and we'll be glad to help!"
                ),
                sources=[],
                has_grounded_evidence=False,
                stats=GenerationStats(
                    model_name=f"{self.model}-fallback",
                    duration_ms=duration_ms,
                    total_evidence_chunks=0,
                ),
            )

        top_chunks = evidence_chunks[:3]
        fallback_lines = [
            f"We are currently {note} while generating a full response. However, based on our website, here is the relevant information:\n"
        ]
        for c in top_chunks:
            title = c.title or "Webpage"
            url = c.canonical_url or c.source_url
            clean = " ".join(c.content.split())
            if len(clean) > 250:
                clean = clean[:250].rstrip() + "..."
            fallback_lines.append(f"* **[{title}]({url})**:\n  {clean}\n")

        fallback_lines.append(
            "\nYou can visit the links above for full details or try asking your question again in a moment."
        )

        return GeneratedAnswer(
            answer="\n".join(fallback_lines),
            sources=sources,
            has_grounded_evidence=True,
            stats=GenerationStats(
                model_name=f"{self.model}-fallback",
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
        sources = self._build_sources(evidence_chunks)
        brand = extract_brand_name(bot_name, website_url)

        if not evidence_chunks:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return GeneratedAnswer(
                answer=(
                    f"Welcome to {brand}! We don't have those specific details on hand right now. "
                    "Please feel free to reach out to our team directly through our contact page or support channels, "
                    "and we'll be glad to help!"
                ),
                sources=[],
                has_grounded_evidence=False,
                stats=GenerationStats(
                    model_name=self.model,
                    duration_ms=duration_ms,
                    total_evidence_chunks=0,
                ),
            )

        api_key = self._get_api_key()
        prompt = self._build_prompt(
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
                "temperature": 0.2,  # Low temperature for factual grounding
                "maxOutputTokens": 2048,
            },
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(url, json=payload)
        except httpx.TimeoutException as exc:
            logger.warning(f"Gemini API request timed out after {self.timeout_seconds}s: {exc}. Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="experiencing momentary delays",
                bot_name=bot_name, website_url=website_url,
            )
        except Exception as exc:
            logger.warning(f"Gemini API connection error: {exc}. Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="experiencing temporary connection delays",
                bot_name=bot_name, website_url=website_url,
            )

        if response.status_code == 429:
            logger.warning("Gemini API rate limit exceeded (HTTP 429). Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="experiencing high traffic demand",
                bot_name=bot_name, website_url=website_url,
            )
        if response.status_code >= 500:
            logger.warning(f"Gemini API server error (HTTP {response.status_code}). Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="experiencing a temporary service interruption",
                bot_name=bot_name, website_url=website_url,
            )
        if response.status_code != 200:
            logger.warning(f"Gemini API error (HTTP {response.status_code}). Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="temporarily unavailable",
                bot_name=bot_name, website_url=website_url,
            )

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            logger.warning("Gemini API returned no candidates. Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="unable to formulate an answer",
                bot_name=bot_name, website_url=website_url,
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        answer_text = "".join(part.get("text", "") for part in parts).strip()
        if not answer_text:
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
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
        sources = self._build_sources(evidence_chunks)
        brand = extract_brand_name(bot_name, website_url)

        if not evidence_chunks:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return GeneratedAnswer(
                answer=(
                    f"Welcome to {brand}! We don't have those specific details on hand right now. "
                    "Please feel free to reach out to our team directly through our contact page or support channels, "
                    "and we'll be glad to help!"
                ),
                sources=[],
                has_grounded_evidence=False,
                stats=GenerationStats(
                    model_name=self.model,
                    duration_ms=duration_ms,
                    total_evidence_chunks=0,
                ),
            )

        api_key = self._get_api_key()
        prompt = self._build_prompt(
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
                "temperature": 0.2,
                "maxOutputTokens": 2048,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(url, json=payload)
        except httpx.TimeoutException as exc:
            logger.warning(f"Gemini async API request timed out after {self.timeout_seconds}s: {exc}. Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="experiencing momentary delays",
                bot_name=bot_name, website_url=website_url,
            )
        except Exception as exc:
            logger.warning(f"Gemini async API connection error: {exc}. Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="experiencing temporary connection delays",
                bot_name=bot_name, website_url=website_url,
            )

        if response.status_code == 429:
            logger.warning("Gemini async API rate limit exceeded (HTTP 429). Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="experiencing high traffic demand",
                bot_name=bot_name, website_url=website_url,
            )
        if response.status_code >= 500:
            logger.warning(f"Gemini async API server error (HTTP {response.status_code}). Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="experiencing a temporary service interruption",
                bot_name=bot_name, website_url=website_url,
            )
        if response.status_code != 200:
            logger.warning(f"Gemini async API error (HTTP {response.status_code}). Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="temporarily unavailable",
                bot_name=bot_name, website_url=website_url,
            )

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            logger.warning("Gemini async API returned no response candidates. Activating soft fallback.")
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
                note="unable to formulate an answer",
                bot_name=bot_name, website_url=website_url,
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        answer_text = "".join(part.get("text", "") for part in parts).strip()
        if not answer_text:
            return self._create_soft_fallback(
                evidence_chunks, sources, start_time,
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



# Global singleton instance
generator_service = GeminiGenerationAdapter()
