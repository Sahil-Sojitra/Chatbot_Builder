"""Anti-bot, WAF, and Cloudflare challenge detection service."""

import logging
import re
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class BotProtectionBlockedError(Exception):
    """Raised when crawling is halted due to a WAF, Cloudflare, or anti-bot challenge page."""
    pass


# Specific title fingerprints associated with automated challenge interstitials
CHALLENGE_TITLE_PATTERNS = [
    re.compile(r"just a moment\.{2,4}", re.IGNORECASE),
    re.compile(r"attention required!.*cloudflare", re.IGNORECASE),
    re.compile(r"security check.*cloudflare", re.IGNORECASE),
    re.compile(r"ddos protection by cloudflare", re.IGNORECASE),
    re.compile(r"checking your browser", re.IGNORECASE),
    re.compile(r"access denied.*cloudflare", re.IGNORECASE),
    re.compile(r"verify you are human", re.IGNORECASE),
    re.compile(r"human verification", re.IGNORECASE),
]

# DOM and text fingerprints of Cloudflare, Turnstile, and known WAF challenges
CHALLENGE_BODY_SIGNATURES = [
    re.compile(r"challenges\.cloudflare\.com", re.IGNORECASE),
    re.compile(r"cf-browser-verification", re.IGNORECASE),
    re.compile(r"cf-challenge", re.IGNORECASE),
    re.compile(r"checking your browser before accessing", re.IGNORECASE),
    re.compile(r"enable (?:javascript|cookies) and reload the page", re.IGNORECASE),
    re.compile(r"enable (?:javascript|cookies) to continue", re.IGNORECASE),
    re.compile(r"please verify (?:that )?you are (?:a )?human", re.IGNORECASE),
    re.compile(r"verify you are human", re.IGNORECASE),
    re.compile(r"cloudflare ray id:?\s+[0-9a-fA-F]+", re.IGNORECASE),
    re.compile(r"ray id:?\s+[0-9a-fA-F]+", re.IGNORECASE),
    re.compile(r"ddos protection by cloudflare", re.IGNORECASE),
    re.compile(r"used cloudflare to restrict access", re.IGNORECASE),
    re.compile(r"turnstile", re.IGNORECASE),
    re.compile(r"protected by datadome", re.IGNORECASE),
    re.compile(r"perimeterx", re.IGNORECASE),
]

FRIENDLY_BOT_BLOCKED_MESSAGE = (
    "This website is protected by Cloudflare bot security verification. "
    "Automated crawling was blocked. Please add knowledge by pasting text directly or uploading documents."
)


def detect_bot_protection_challenge(
    status_code: Optional[int] = None,
    title: Optional[str] = None,
    markdown_or_text: Optional[str] = None,
    html: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """Evaluates whether an HTTP crawl response corresponds to an anti-bot or WAF challenge.

    Returns:
        (is_challenge, detected_reason)
    """
    clean_title = (title or "").strip()
    content_to_check = f"{clean_title}\n{markdown_or_text or ''}\n{html or ''}"

    # 1. Check title matches
    if clean_title:
        for pattern in CHALLENGE_TITLE_PATTERNS:
            if pattern.search(clean_title):
                reason = f"Challenge title matched: '{clean_title}'"
                logger.warning(f"Bot protection detected: {reason}")
                return True, reason

    # 2. Check HTTP status 403/429/503 combined with cloudflare or verification keywords
    if status_code in (403, 429, 503):
        lower_content = content_to_check.lower()
        if any(
            kw in lower_content
            for kw in ("cloudflare", "waf", "ray id", "turnstile", "access denied", "verify you are human", "blocked")
        ):
            reason = f"HTTP {status_code} with bot protection fingerprint"
            logger.warning(f"Bot protection detected: {reason}")
            return True, reason

    # 3. Check text / DOM signatures
    for sig in CHALLENGE_BODY_SIGNATURES:
        match = sig.search(content_to_check)
        if match:
            # Avoid false positives if page is a very long, legitimate article talking ABOUT cloudflare:
            # Challenge pages are short (usually under 3500 chars).
            char_count = len((markdown_or_text or "").strip())
            if char_count < 4000 or "challenges.cloudflare.com" in content_to_check or "cf-browser-verification" in content_to_check:
                reason = f"Challenge signature matched: '{match.group(0)}'"
                logger.warning(f"Bot protection detected: {reason}")
                return True, reason

    return False, None
