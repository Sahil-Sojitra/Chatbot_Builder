"""Utilities for extracting and formatting brand and company identities."""

import re
from typing import Optional
from urllib.parse import urlparse


def is_id_like(value: str) -> bool:
    """Checks whether a string resembles an internal database ID (e.g. 24-char MongoDB ObjectId or UUID)."""
    clean_val = value.strip()
    if re.fullmatch(r"^[0-9a-fA-F]{24}$", clean_val):
        return True
    if re.fullmatch(r"^[0-9a-fA-F\-]{32,36}$", clean_val):
        return True
    return False


def extract_brand_name(bot_name: Optional[str] = None, website_url: Optional[str] = None) -> str:
    """Extracts a clean, human-readable brand or company name.

    Derives the identity from the chatbot persona name if available, or falls
    back to the root domain of the website URL. Rejects raw MongoDB ObjectIds and UUIDs.

    Examples:
        >>> extract_brand_name("Acme Corp AI Assistant")
        "Acme Corp"
        >>> extract_brand_name("6ad9bb6583b985dab3fc8531 AI Assistant", "https://webosmotic.com")
        "Webosmotic"
        >>> extract_brand_name(None, "https://docs.stripe.com/payments")
        "Stripe"
    """
    if bot_name and bot_name.strip():
        cleaned = re.sub(
            r"\s+(?:AI\s+)?(?:Assistant|Bot|Chatbot|Agent)$",
            "",
            bot_name.strip(),
            flags=re.IGNORECASE,
        ).strip()
        # Only accept if it does not resemble a database ObjectId or hex identifier
        if cleaned and not is_id_like(cleaned):
            return cleaned

    if website_url and website_url.strip():
        try:
            parsed = urlparse(website_url.strip())
            host = parsed.hostname or parsed.path
            host = re.sub(r"^www\.", "", host.lower())
            parts = host.split(".")
            # Handle common subdomains like docs.stripe.com, app.hubspot.com
            common_subdomains = {"docs", "app", "api", "blog", "portal", "help", "support", "status", "web"}
            if len(parts) >= 3 and parts[0] in common_subdomains:
                main_part = parts[1]
            elif len(parts) >= 2:
                main_part = parts[0]
            else:
                main_part = host

            if main_part:
                return main_part.capitalize()
        except Exception:
            pass

    return "our team"
