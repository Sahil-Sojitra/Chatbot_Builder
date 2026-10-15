import re
from urllib.parse import urljoin, urlparse, urldefrag
from typing import List, Set, Optional, Dict, Any

from app.services.security import validate_safe_url, SSRFValidationError

# File extensions that represent media, binary, or non-HTML resources
EXCLUDED_EXTENSIONS = {
    # Documents & Archives
    ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z", ".iso", ".exe", ".bin",
    ".dmg", ".pkg", ".deb", ".rpm",
    # Images & Icons
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".tiff", ".bmp",
    # Audio & Video
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".flv", ".webm", ".mkv", ".ogg",
    # Fonts & Styles & Scripts
    ".css", ".js", ".mjs", ".woff", ".woff2", ".ttf", ".eot", ".otf",
    # Data & Feeds
    ".json", ".xml", ".csv", ".tsv", ".yaml", ".yml", ".rss", ".atom",
}

# Substrings identifying authentication endpoints or destructive actions
DISALLOWED_PATH_PATTERNS = [
    re.compile(r"/(log[ -_]?out|sign[ -_]?out)", re.IGNORECASE),
    re.compile(r"/(delete|destroy|remove|cancel|terminate)", re.IGNORECASE),
    re.compile(r"/(reset[ -_]?password|forgot[ -_]?password)", re.IGNORECASE),
]


def normalize_url(raw_url: str, base_url: str) -> Optional[str]:
    """Resolve, clean, and normalize a URL string against a base URL.

    - Resolves relative URLs (e.g., '/docs' -> 'https://example.com/docs').
    - Strips fragment identifiers (e.g., '#section' -> removed).
    - Normalizes scheme and domain to lowercase.
    - Strips trailing slashes from path (except root '/') for clean deduplication.
    - Ignores unsupported schemes (mailto:, tel:, javascript:).
    """
    if not raw_url or not raw_url.strip():
        return None

    trimmed = raw_url.strip()

    # Reject javascript:, mailto:, tel:, anchor-only links
    if trimmed.startswith(("#", "javascript:", "mailto:", "tel:", "data:", "sms:")):
        return None

    # Resolve relative paths against the base URL
    try:
        resolved = urljoin(base_url, trimmed)
        # Strip fragment
        clean_url, _ = urldefrag(resolved)
        parsed = urlparse(clean_url)
    except Exception:
        return None

    # Enforce HTTP/HTTPS schemes only
    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        return None

    # Must contain a valid network location (hostname)
    if not parsed.netloc:
        return None

    # Normalize hostname (lowercase, drop default ports)
    hostname = parsed.hostname.lower()
    port = parsed.port
    if (scheme == "http" and port == 80) or (scheme == "https" and port == 443):
        netloc = hostname
    elif port:
        netloc = f"{hostname}:{port}"
    else:
        netloc = hostname

    # Normalize path (remove duplicate slashes, drop trailing slash if length > 1)
    path = parsed.path or "/"
    path = re.sub(r"/+", "/", path)
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]

    # Reconstruct query string if present
    query = f"?{parsed.query}" if parsed.query else ""

    return f"{scheme}://{netloc}{path}{query}"


def is_eligible_internal_link(
    target_url: str,
    base_url: str,
    allowed_domains: Optional[Set[str]] = None,
) -> bool:
    """Check if a candidate URL is an eligible, safe internal HTML page.

    Criteria:
    1. Must match the allowed base domain (same origin / domain).
    2. Must not be a binary or non-HTML asset extension (e.g., .pdf, .png, .zip).
    3. Must not match destructive / auth endpoints (logout, delete, reset-password).
    """
    try:
        parsed_target = urlparse(target_url)
        parsed_base = urlparse(base_url)
    except Exception:
        return False

    target_host = (parsed_target.hostname or "").lower()
    base_host = (parsed_base.hostname or "").lower()

    if not target_host or not base_host:
        return False

    # Check origin / domain restriction
    if allowed_domains:
        if target_host not in allowed_domains:
            return False
    else:
        # Default: strict same-hostname origin
        if target_host != base_host:
            return False

    # Check file extension
    path_lower = parsed_target.path.lower()
    for ext in EXCLUDED_EXTENSIONS:
        if path_lower.endswith(ext):
            return False

    # Check destructive / auth action patterns
    for pattern in DISALLOWED_PATH_PATTERNS:
        if pattern.search(path_lower):
            return False

    return True


def filter_crawl4ai_internal_links(
    crawl4ai_links: Any,
    base_url: str,
    max_links: int = 50,
) -> List[str]:
    """Process Crawl4AI's native parsed links dictionary into deduplicated, safe internal URLs.

    Crawl4AI provides result.links as:
    {'internal': [{'href': '...'}, ...], 'external': [...]}
    """
    discovered: Set[str] = set()
    ordered_results: List[str] = []

    # Extract internal link items from Crawl4AI's dictionary
    raw_items: List[Any] = []
    if isinstance(crawl4ai_links, dict):
        raw_items = crawl4ai_links.get("internal", [])
    elif isinstance(crawl4ai_links, list):
        raw_items = crawl4ai_links

    for item in raw_items:
        if len(ordered_results) >= max_links:
            break

        # Handle string or dict item ({'href': '...'})
        href = item.get("href") if isinstance(item, dict) else str(item)
        normalized = normalize_url(href, base_url)
        if not normalized:
            continue

        if normalized in discovered:
            continue

        if is_eligible_internal_link(normalized, base_url):
            discovered.add(normalized)
            ordered_results.append(normalized)

    return ordered_results
