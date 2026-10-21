"""Asynchronous web crawler service using Crawl4AI and Playwright."""

import asyncio
import logging
import re
from typing import List, Optional, Set
from urllib.parse import urlparse

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

from app.core.url_utils import get_url_priority
from app.models.crawler import (
    CrawlResult,
    LinkDiscoveryResult,
    MultiPageCrawlResult,
    PageCrawlSummary,
)
from app.services.link_discovery import (
    filter_crawl4ai_internal_links,
    is_eligible_internal_link,
    normalize_url,
)
from app.services.security import SSRFValidationError, validate_safe_url
from app.services.sitemap import sitemap_service
from app.services.anti_bot import detect_bot_protection_challenge, FRIENDLY_BOT_BLOCKED_MESSAGE

logger = logging.getLogger(__name__)


class Crawl4AICrawler:
    """Production-grade asynchronous web crawler and multi-page ingestor powered by Crawl4AI.

    Features:
    - Pre-flight and hop-by-hop SSRF validation.
    - Single-page crawling and internal link discovery.
    - Bounded multi-page BFS ingestion with concurrency semaphore limits.
    - Robust per-page failure tolerance (partial successes preserved).
    - Loop prevention and deduplication via query canonicalization.
    """

    DEFAULT_TIMEOUT_MS: int = 20000
    DEFAULT_CONCURRENCY: int = 3

    async def crawl_page(
        self,
        url: str,
        crawler_instance: Optional[AsyncWebCrawler] = None,
    ) -> CrawlResult:
        """Crawls a single URL safely using Crawl4AI's AsyncWebCrawler.

        If crawler_instance is passed, reuses the active browser context for efficiency.
        """
        try:
            canonical_url, _ = validate_safe_url(url, resolve_dns=True)
        except SSRFValidationError as ssrf_err:
            return CrawlResult(
                url=url,
                markdown="",
                clean_text="",
                success=False,
                error_message=f"SSRF Security Violation: {ssrf_err}",
            )
        except Exception as exc:
            return CrawlResult(
                url=url,
                markdown="",
                clean_text="",
                success=False,
                error_message=f"Invalid destination: {exc}",
            )

        run_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            page_timeout=self.DEFAULT_TIMEOUT_MS,
            delay_before_return_html=1.0,
            remove_overlay_elements=True,
            word_count_threshold=5,
        )

        async def _run_crawl(crawler: AsyncWebCrawler) -> CrawlResult:
            result = await crawler.arun(url=canonical_url, config=run_config)

            markdown_text = (
                result.markdown.raw_markdown
                if hasattr(result.markdown, "raw_markdown")
                else str(result.markdown or "")
            ).strip()

            clean_text = re.sub(r"\s+", " ", result.cleaned_html or markdown_text).strip()

            if not markdown_text and clean_text:
                markdown_text = clean_text

            title = None
            if hasattr(result, "metadata") and isinstance(result.metadata, dict):
                title = result.metadata.get("title")

            # Check for anti-bot or WAF challenge (Cloudflare, Turnstile, Captchas)
            is_challenge, challenge_reason = detect_bot_protection_challenge(
                status_code=result.status_code,
                title=title,
                markdown_or_text=markdown_text or getattr(result, "error_message", None),
                html=getattr(result, "cleaned_html", None),
            )
            if is_challenge:
                logger.warning(f"Bot protection challenge detected on '{canonical_url}': {challenge_reason}")
                return CrawlResult(
                    url=canonical_url,
                    title=title,
                    markdown="",
                    clean_text="",
                    success=False,
                    status_code=result.status_code,
                    is_bot_blocked=True,
                    error_message=f"Bot Protection Challenge: {challenge_reason}",
                )

            if not result.success:
                return CrawlResult(
                    url=canonical_url,
                    markdown="",
                    clean_text="",
                    success=False,
                    status_code=result.status_code,
                    error_message=result.error_message or "Crawl4AI execution failed",
                )

            extracted_links = filter_crawl4ai_internal_links(
                crawl4ai_links=getattr(result, "links", None),
                base_url=canonical_url,
                max_links=50,
            )

            if markdown_text:
                for match in re.findall(r"\[.*?\]\((https?://[^\s\)]+|/[^\s\)]+)\)", markdown_text):
                    norm_md_link = normalize_url(match, canonical_url)
                    if norm_md_link and is_eligible_internal_link(norm_md_link, canonical_url):
                        if norm_md_link not in extracted_links:
                            extracted_links.append(norm_md_link)

            if not markdown_text:
                return CrawlResult(
                    url=canonical_url,
                    title=title,
                    markdown="",
                    clean_text=clean_text,
                    success=False,
                    status_code=result.status_code,
                    links=extracted_links,
                    error_message="Page rendered successfully but extracted markdown content was empty.",
                )

            return CrawlResult(
                url=canonical_url,
                title=title,
                markdown=markdown_text,
                clean_text=clean_text,
                success=True,
                status_code=result.status_code or 200,
                links=extracted_links,
            )

        try:
            if crawler_instance is not None:
                return await _run_crawl(crawler_instance)
            else:
                browser_config = BrowserConfig(headless=True, verbose=False)
                async with AsyncWebCrawler(config=browser_config) as crawler:
                    return await _run_crawl(crawler)

        except asyncio.TimeoutError:
            return CrawlResult(
                url=canonical_url,
                markdown="",
                clean_text="",
                success=False,
                error_message="Crawl request timed out.",
            )
        except Exception as exc:
            return CrawlResult(
                url=canonical_url,
                markdown="",
                clean_text="",
                success=False,
                error_message=f"Crawl4AI exception: {exc}",
            )

    async def discover_internal_links(
        self,
        starting_url: str,
        max_links: int = 20,
        crawler_instance: Optional[AsyncWebCrawler] = None,
    ) -> LinkDiscoveryResult:
        """Fetch a starting page and identify eligible internal links using Crawl4AI's native link parser."""
        try:
            canonical_url, _ = validate_safe_url(starting_url, resolve_dns=True)
        except SSRFValidationError as ssrf_err:
            return LinkDiscoveryResult(
                starting_url=starting_url,
                discovered_links=[],
                total_found=0,
                success=False,
                error_message=f"SSRF Security Violation: {ssrf_err}",
            )
        except Exception as exc:
            return LinkDiscoveryResult(
                starting_url=starting_url,
                discovered_links=[],
                total_found=0,
                success=False,
                error_message=f"Invalid URL: {exc}",
            )

        run_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            page_timeout=self.DEFAULT_TIMEOUT_MS,
            delay_before_return_html=1.0,
            remove_overlay_elements=True,
        )

        async def _run_discovery(crawler: AsyncWebCrawler) -> LinkDiscoveryResult:
            crawl_res = await crawler.arun(url=canonical_url, config=run_config)
            if not crawl_res.success:
                return LinkDiscoveryResult(
                    starting_url=canonical_url,
                    discovered_links=[],
                    total_found=0,
                    success=False,
                    error_message=crawl_res.error_message or "Failed to fetch page for link discovery",
                )

            links = filter_crawl4ai_internal_links(
                crawl4ai_links=crawl_res.links,
                base_url=canonical_url,
                max_links=max_links,
            )

            safe_links: List[str] = []
            for link in links:
                try:
                    validate_safe_url(link, resolve_dns=False)
                    safe_links.append(link)
                except SSRFValidationError:
                    continue

            return LinkDiscoveryResult(
                starting_url=canonical_url,
                discovered_links=safe_links,
                total_found=len(safe_links),
                success=True,
            )

        try:
            if crawler_instance is not None:
                return await _run_discovery(crawler_instance)
            else:
                browser_config = BrowserConfig(headless=True, verbose=False)
                async with AsyncWebCrawler(config=browser_config) as crawler:
                    return await _run_discovery(crawler)

        except Exception as exc:
            return LinkDiscoveryResult(
                starting_url=canonical_url,
                discovered_links=[],
                total_found=0,
                success=False,
                error_message=f"Link discovery failed: {exc}",
            )

    async def crawl_multipage(
        self,
        starting_url: str,
        max_pages: Optional[int] = None,
        concurrency: int = DEFAULT_CONCURRENCY,
    ) -> MultiPageCrawlResult:
        """Perform a resilient multi-page crawl starting from an initial URL."""
        bounded_max_pages = max_pages if (max_pages is not None and max_pages > 0) else 25

        normalized_root = normalize_url(starting_url, starting_url)
        if not normalized_root:
            return MultiPageCrawlResult(
                starting_url=starting_url,
                max_pages_requested=bounded_max_pages,
                total_discovered=0,
                total_processed=0,
                successful_count=0,
                failed_count=1,
                success=False,
                error_message="Invalid starting URL structure.",
            )

        try:
            validate_safe_url(normalized_root, resolve_dns=True)
        except SSRFValidationError as ssrf_err:
            return MultiPageCrawlResult(
                starting_url=normalized_root,
                max_pages_requested=bounded_max_pages,
                total_discovered=0,
                total_processed=0,
                successful_count=0,
                failed_count=1,
                success=False,
                error_message=f"SSRF Security Violation: {ssrf_err}",
            )

        visited_urls: Set[str] = set()
        queued_urls: Set[str] = {normalized_root}
        queue: List[str] = [normalized_root]

        # 1. Proactively discover XML sitemap and robots.txt links to seed the crawl queue
        try:
            sitemap_links = await sitemap_service.discover_sitemap_urls(
                starting_url=normalized_root,
                max_links=bounded_max_pages * 2 if bounded_max_pages else 50,
            )
            added_sm_count = 0
            for sm_link in sitemap_links:
                if sm_link not in queued_urls:
                    queued_urls.add(sm_link)
                    queue.append(sm_link)
                    added_sm_count += 1

            if added_sm_count > 0:
                # Keep root homepage first, then sort remaining sitemap links by priority
                root_url = queue[0]
                other_links = sorted(queue[1:], key=get_url_priority)
                queue = [root_url] + other_links
                logger.info(
                    f"Bootstrapped crawl queue with {added_sm_count} links from sitemap.xml for '{normalized_root}'"
                )
        except Exception as sm_exc:
            logger.debug(f"Sitemap probe skipped or failed for '{normalized_root}': {sm_exc}")

        successful_pages: List[CrawlResult] = []
        failed_pages: List[PageCrawlSummary] = []

        bot_blocked_detected = False
        bot_blocked_message: Optional[str] = None

        semaphore = asyncio.Semaphore(concurrency)
        browser_config = BrowserConfig(headless=True, verbose=False)

        async with AsyncWebCrawler(config=browser_config) as crawler:
            while queue and (bounded_max_pages is None or len(visited_urls) < bounded_max_pages):
                if bot_blocked_detected:
                    break

                if bounded_max_pages is not None:
                    remaining_slots = bounded_max_pages - len(visited_urls)
                    batch_size = min(len(queue), remaining_slots, concurrency)
                else:
                    batch_size = min(len(queue), concurrency)

                batch = [queue.pop(0) for _ in range(batch_size)]

                async def _worker(target_url: str):
                    nonlocal bot_blocked_detected, bot_blocked_message
                    async with semaphore:
                        visited_urls.add(target_url)
                        crawl_res = await self.crawl_page(target_url, crawler_instance=crawler)

                        if crawl_res.is_bot_blocked or (crawl_res.error_message and "Bot Protection Challenge" in crawl_res.error_message):
                            if target_url == normalized_root:
                                logger.warning(f"Root URL '{normalized_root}' is protected by anti-bot verification. Aborting crawl immediately.")
                                bot_blocked_detected = True
                                bot_blocked_message = FRIENDLY_BOT_BLOCKED_MESSAGE
                                queue.clear()

                        if crawl_res.success:
                            successful_pages.append(crawl_res)
                            links_to_consider = crawl_res.links
                            if not links_to_consider and hasattr(self, "discover_internal_links"):
                                try:
                                    disc_res = await self.discover_internal_links(target_url, crawler_instance=crawler)
                                    if disc_res.success:
                                        links_to_consider = disc_res.discovered_links
                                except Exception:
                                    pass

                            new_links_found = False
                            for link in links_to_consider:
                                if link not in queued_urls and link not in visited_urls:
                                    queued_urls.add(link)
                                    queue.append(link)
                                    new_links_found = True

                            if new_links_found:
                                queue.sort(key=get_url_priority)

                        else:
                            failed_pages.append(
                                PageCrawlSummary(
                                    url=target_url,
                                    title=crawl_res.title,
                                    success=False,
                                    status_code=crawl_res.status_code,
                                    char_count=len(crawl_res.markdown),
                                    error_message=crawl_res.error_message,
                                )
                            )

                await asyncio.gather(*[_worker(url) for url in batch])

        if bot_blocked_detected:
            return MultiPageCrawlResult(
                starting_url=normalized_root,
                max_pages_requested=bounded_max_pages,
                total_discovered=len(queued_urls),
                total_processed=len(successful_pages) + len(failed_pages),
                successful_count=0,
                failed_count=len(failed_pages),
                successful_pages=[],
                failed_pages=failed_pages,
                success=False,
                error_message=bot_blocked_message or FRIENDLY_BOT_BLOCKED_MESSAGE,
            )

        total_processed = len(successful_pages) + len(failed_pages)
        overall_success = len(successful_pages) > 0

        return MultiPageCrawlResult(
            starting_url=normalized_root,
            max_pages_requested=bounded_max_pages,
            total_discovered=len(queued_urls),
            total_processed=total_processed,
            successful_count=len(successful_pages),
            failed_count=len(failed_pages),
            successful_pages=successful_pages,
            failed_pages=failed_pages,
            success=overall_success,
            error_message=None if overall_success else "No pages could be successfully crawled.",
        )


# Global shared instance
web_crawler_service = Crawl4AICrawler()
crawler_service = web_crawler_service

__all__ = [
    "get_url_priority",
    "CrawlResult",
    "LinkDiscoveryResult",
    "PageCrawlSummary",
    "MultiPageCrawlResult",
    "Crawl4AICrawler",
    "web_crawler_service",
    "crawler_service",
]
