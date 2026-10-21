"""Service for auto-extracting brand persona, company summary, and starter questions."""

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, Field

from app.core.brand import extract_brand_name

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL: str = "gemini-3.5-flash-lite"
DEFAULT_TIMEOUT_SECONDS: float = 12.0


class BotPersona(BaseModel):
    """Structured brand identity and interaction recommendations generated for an Instant Bot."""

    brand_name: str = Field(..., description="Clean, proper brand or organization name.")
    tagline: Optional[str] = Field(None, description="One-line company or product tagline.")
    company_description: Optional[str] = Field(None, description="Short 1-2 sentence description of what the business does.")
    suggested_system_prompt: Optional[str] = Field(None, description="Tailored system instructions adopting brand voice.")
    starter_questions: List[str] = Field(
        default_factory=list,
        description="3 to 4 recommended starter questions visitors commonly ask.",
    )


class PersonaGeneratorService:
    """Generates brand persona and engaging starter questions from website homepage content using Gemini."""

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

    def _get_api_key(self) -> Optional[str]:
        return (self._api_key or os.getenv("GEMINI_API_KEY", "")).strip() or None

    def _build_deterministic_fallback(
        self, website_url: str, raw_bot_name: Optional[str] = None
    ) -> BotPersona:
        """Constructs high-quality deterministic fallback persona when LLM generation is unavailable."""
        brand = extract_brand_name(raw_bot_name, website_url)
        return BotPersona(
            brand_name=brand,
            tagline=f"Official AI Assistant for {brand}",
            company_description=f"{brand} customer and product intelligence assistant.",
            suggested_system_prompt=(
                f"You are the official representative and assistant for {brand}.\n"
                f"Welcome visitors warmly, speak in a helpful and professional first-person brand voice ('we', 'our team'), "
                f"and answer questions accurately based on our official website information."
            ),
            starter_questions=[
                f"What products or services does {brand} offer?",
                f"How do I get started with {brand}?",
                "Where can I find pricing or subscription plans?",
                "How can I get in touch with customer support?",
            ],
        )

    async def agenerate_persona(
        self,
        homepage_text: str,
        website_url: str,
        raw_bot_name: Optional[str] = None,
    ) -> BotPersona:
        """Asynchronously synthesizes structured bot persona from homepage markdown."""
        api_key = self._get_api_key()
        if not api_key:
            logger.info("GEMINI_API_KEY not configured. Using deterministic fallback persona.")
            return self._build_deterministic_fallback(website_url, raw_bot_name)

        clean_text = (homepage_text or "").strip()[:4000]
        if len(clean_text) < 10:
            return self._build_deterministic_fallback(website_url, raw_bot_name)

        brand_guess = extract_brand_name(raw_bot_name, website_url)

        prompt = (
            "You are an expert brand analyst. Analyze the following webpage excerpt from an official website "
            f"({website_url}) and extract a structured brand persona.\n\n"
            "Return a raw, strictly valid JSON object with EXACTLY these keys:\n"
            '{\n'
            f'  "brand_name": "Accurate brand or company name (e.g. \'{brand_guess}\')",\n'
            '  "tagline": "Short, catchy 1-line company tagline or value proposition",\n'
            '  "company_description": "1 to 2 concise sentences describing what this company or product does",\n'
            '  "suggested_system_prompt": "Tailored, friendly first-person system instructions for an AI representative of this brand",\n'
            '  "starter_questions": [\n'
            '    "3 to 4 engaging, specific, and common questions visitors would ask this business"\n'
            '  ]\n'
            '}\n\n'
            "RULES:\n"
            "1. Output ONLY the JSON object. Do not include markdown codeblocks or conversational filler.\n"
            "2. Questions must be natural and directly related to the company's offerings.\n"
            "3. Keep questions under 80 characters each.\n\n"
            f"=== WEBPAGE CONTENT ===\n{clean_text}\n=== END OF CONTENT ==="
        )

        url = f"{self.BASE_URL}/{self.model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(url, json=payload)

            if response.status_code != 200:
                logger.warning(
                    f"Gemini persona generation returned HTTP {response.status_code}: {response.text[:250]}. "
                    "Using deterministic fallback."
                )
                return self._build_deterministic_fallback(website_url, raw_bot_name)

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return self._build_deterministic_fallback(website_url, raw_bot_name)

            content_parts = candidates[0].get("content", {}).get("parts", [])
            raw_json_str = "".join(part.get("text", "") for part in content_parts).strip()

            # Clean markdown codeblocks if model enclosed them
            raw_json_str = re.sub(r"^```(?:json)?", "", raw_json_str, flags=re.MULTILINE)
            raw_json_str = re.sub(r"```$", "", raw_json_str, flags=re.MULTILINE).strip()

            parsed = json.loads(raw_json_str)

            brand_name = str(parsed.get("brand_name") or brand_guess).strip()
            tagline = str(parsed.get("tagline") or f"Official Assistant for {brand_name}").strip()
            description = str(parsed.get("company_description") or "").strip()
            system_prompt = str(parsed.get("suggested_system_prompt") or "").strip()
            questions = [str(q).strip() for q in parsed.get("starter_questions", []) if q]

            if not questions:
                questions = [
                    f"What products or services does {brand_name} offer?",
                    "How can I get in touch with your team?",
                    "Where can I find pricing details?",
                ]

            return BotPersona(
                brand_name=brand_name,
                tagline=tagline,
                company_description=description,
                suggested_system_prompt=system_prompt,
                starter_questions=questions[:4],
            )

        except Exception as exc:
            logger.warning(f"Error during persona generation: {exc}. Using deterministic fallback.")
            return self._build_deterministic_fallback(website_url, raw_bot_name)


# Global instance
persona_generator_service = PersonaGeneratorService()
