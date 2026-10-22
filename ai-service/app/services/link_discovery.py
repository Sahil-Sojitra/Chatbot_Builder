import re
from urllib.parse import urljoin, urlparse, urldefrag, parse_qsl, urlencode
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

# Substrings identifying authentication endpoints, destructive actions, or low-value boilerplate (legal, sitemaps, admin)
DISALLOWED_PATH_PATTERNS = [
    re.compile(r"/(log[ -_]?out|sign[ -_]?out)", re.IGNORECASE),
    re.compile(r"/(delete|destroy|remove|cancel|terminate)", re.IGNORECASE),
    re.compile(r"/(reset[ -_]?password|forgot[ -_]?password)", re.IGNORECASE),
    re.compile(r"/(privacy(-|_)?policy|terms(-|_)?(of(-|_)?service|and(-|_)?conditions|of(-|_)?use)|cookie(-|_)?policy|disclaimer|impressum|legal)", re.IGNORECASE),
    re.compile(r"/(sitemap(\.xml)?|feed|rss|search|cart|checkout|wp-admin|wp-login)", re.IGNORECASE),
]

# Query parameters commonly used for tracking, sessions, or infinite pagination loops
DISALLOWED_QUERY_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "ref", "source", "session_id", "phpsessid", "jsessionid"
}


def normalize_url(raw_url: str, base_url: str, strip_tracking_params: bool = True) -> Optional[str]:
    """Resolve, clean, and normalize a URL string against a base URL.

    - Resolves relative URLs (e.g., '/docs' -> 'https://example.com/docs').
    - Strips fragment identifiers (e.g., '#section' -> removed).
    - Normalizes scheme and domain to lowercase.
    - Strips trailing slashes from path (except root '/') for clean deduplication.
    - Strips tracking & session query parameters to prevent infinite crawler variations.
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

    # Reconstruct query string with sorting and tracking param removal
    query = ""
    if parsed.query:
        query_params = parse_qsl(parsed.query, keep_blank_values=False)
        if strip_tracking_params:
            filtered_params = [
                (k, v) for k, v in query_params if k.lower() not in DISALLOWED_QUERY_PARAMS
            ]
        else:
            filtered_params = query_params

        if filtered_params:
            filtered_params.sort(key=lambda x: x[0])
            query = f"?{urlencode(filtered_params)}"

    return f"{scheme}://{netloc}{path}{query}"


def is_eligible_internal_link(
    target_url: str,
    base_url: str,
    allowed_domains: Optional[Set[str]] = None,
) -> bool:
    """Check if a candidate URL is an eligible, safe internal HTML page."""
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
        # Default: strict same-hostname origin (treating www. and non-www as equivalent)
        norm_target = target_host[4:] if target_host.startswith("www.") else target_host
        norm_base = base_host[4:] if base_host.startswith("www.") else base_host
        if norm_target != norm_base:
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
    """Process Crawl4AI's native parsed links dictionary into deduplicated, safe internal URLs."""
    discovered: Set[str] = set()
    ordered_results: List[str] = []

    raw_items: List[Any] = []
    if isinstance(crawl4ai_links, dict):
        # Inspect both internal and external (in case www/non-www differences put it under external)
        raw_items.extend(crawl4ai_links.get("internal", []))
        raw_items.extend(crawl4ai_links.get("external", []))
    elif isinstance(crawl4ai_links, list):
        raw_items = crawl4ai_links

    for item in raw_items:
        if len(ordered_results) >= max_links:
            break

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
