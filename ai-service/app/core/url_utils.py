"""URL parsing, scoring, and priority utilities."""

from urllib.parse import urlparse


def get_url_priority(url: str) -> int:
    """Universally prioritizes URLs across any type of website.

    Prioritizes top-level navigation and section roots (depth 1) before deeply
    nested sub-pages, and penalizes query strings or tracking URLs to ensure
    foundational pages (e.g. /about, /pricing, /contact) receive index representation.

    Args:
        url: Full webpage URL.

    Returns:
        Integer score where lower numbers indicate higher crawl priority (0 is highest).
    """
    try:
        parsed = urlparse(url)
        path = parsed.path.strip("/")
        if not path:
            return 0  # Root homepage is highest priority

        # Path depth: e.g. /about -> depth 1, /docs/setup -> depth 2
        depth = len(path.split("/"))

        # Penalize query string variations
        query_penalty = 2 if parsed.query else 0

        return depth + query_penalty
    except Exception:
        return 10
