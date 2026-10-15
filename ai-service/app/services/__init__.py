"""Services package."""

from app.services.crawler import crawler_service, CrawlResult, MultiPageCrawlResult, PageCrawlSummary
from app.services.security import validate_safe_url, SSRFValidationError
from app.services.link_discovery import filter_crawl4ai_internal_links, normalize_url
from app.services.content_normalizer import (
    content_normalizer,
    NormalizedPageRecord,
    NormalizationResult,
    ContentNormalizationStats,
)

__all__ = [
    "crawler_service",
    "CrawlResult",
    "MultiPageCrawlResult",
    "PageCrawlSummary",
    "validate_safe_url",
    "SSRFValidationError",
    "filter_crawl4ai_internal_links",
    "normalize_url",
    "content_normalizer",
    "NormalizedPageRecord",
    "NormalizationResult",
    "ContentNormalizationStats",
]
