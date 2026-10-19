"""Backwards-compatible alias for app.services.web_crawler."""

from crawl4ai import AsyncWebCrawler

from app.services.web_crawler import (
    Crawl4AICrawler,
    CrawlResult,
    LinkDiscoveryResult,
    MultiPageCrawlResult,
    PageCrawlSummary,
    crawler_service,
    get_url_priority,
    web_crawler_service,
)

__all__ = [
    "get_url_priority",
    "CrawlResult",
    "LinkDiscoveryResult",
    "PageCrawlSummary",
    "MultiPageCrawlResult",
    "Crawl4AICrawler",
    "crawler_service",
    "web_crawler_service",
    "AsyncWebCrawler",
]
