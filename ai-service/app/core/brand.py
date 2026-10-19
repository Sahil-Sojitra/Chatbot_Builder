"""Utilities for extracting and formatting brand and company identities."""

import re
from typing import Optional
from urllib.parse import urlparse


def extract_brand_name(bot_name: Optional[str] = None, website_url: Optional[str] = None) -> str:
    """Extracts a clean, human-readable brand or company name.

    Derives the identity from the chatbot persona name if available, or falls
    back to the root domain of the website URL.

    Examples:
        >>> extract_brand_name("Acme Corp AI Assistant")
        "Acme Corp"
        >>> extract_brand_name(None, "https://docs.stripe.com/payments")
        "Stripe"
        >>> extract_brand_name(None, None)
        "our team"

    Args:
        bot_name: The custom name given to the bot (e.g., 'Nike Support Bot').
        website_url: The primary URL of the website being indexed.

    Returns:
        Cleaned brand string to use in first-person prompt generation and fallbacks.
    """
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
