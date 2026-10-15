import asyncio
import re
from typing import Optional, List, Dict, Set
from pydantic import BaseModel, Field

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from app.services.security import validate_safe_url, SSRFValidationError
from app.services.link_discovery import (
    filter_crawl4ai_internal_links,
    normalize_url,
    is_eligible_internal_link,
)


class CrawlResult(BaseModel):
    """Normalized output from crawling a single web page."""
    url: str
    title: Optional[str] = None
    markdown: str
    clean_text: str
    success: bool
    status_code: Optional[int] = None
    error_message: Optional[str] = None


class LinkDiscoveryResult(BaseModel):
    """Output from discovering internal links on a starting webpage."""
    starting_url: str
    discovered_links: List[str]
    total_found: int
    success: bool
    error_message: Optional[str] = None


class PageCrawlSummary(BaseModel):
    """Per-page execution summary within a multi-page crawl job."""
    url: str
    title: Optional[str] = None
    success: bool
    status_code: Optional[int] = None
    char_count: int = 0
    error_message: Optional[str] = None


class MultiPageCrawlResult(BaseModel):
    """Comprehensive, structured result for a bounded multi-page crawl operation."""
    starting_url: str
    max_pages_requested: int
    total_discovered: int
    total_processed: int
    successful_count: int
    failed_count: int
    successful_pages: List[CrawlResult] = Field(default_factory=list)
    failed_pages: List[PageCrawlSummary] = Field(default_factory=list)
    success: bool = True
    error_message: Optional[str] = None


class Crawl4AICrawler:
    """Production-grade asynchronous web crawler and multi-page ingestor powered by Crawl4AI.

    Features:
    - Pre-flight and hop-by-hop SSRF validation.
    - Single-page crawling and internal link discovery.
    - Bounded multi-page BFS ingestion with concurrency semaphore limits.
    - Robust per-page failure tolerance (partial successes preserved).
    - Loop prevention and deduplication via query canonicalization.
    """

    DEFAULT_TIMEOUT_MS = 20000
    DEFAULT_CONCURRENCY = 3

    async def crawl_page(
        self,
        url: str,
        crawler_instance: Optional[AsyncWebCrawler] = None,
    ) -> CrawlResult:
        """Crawl a single URL safely using Crawl4AI's AsyncWebCrawler.

        If crawler_instance is passed, reuses the active browser context for efficiency.
        """
        # 1. Pre-flight SSRF Security Check
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
            if not result.success:
                return CrawlResult(
                    url=canonical_url,
                    markdown="",
                    clean_text="",
                    success=False,
                    status_code=result.status_code,
                    error_message=result.error_message or "Crawl4AI execution failed",
                )

            markdown_text = (
                result.markdown.raw_markdown
                if hasattr(result.markdown, "raw_markdown")
                else str(result.markdown or "")
            ).strip()

            clean_text = re.sub(r"\s+", " ", result.cleaned_html or markdown_text).strip()

            # Resilient fallback: if markdown converter returned empty but HTML content exists
            if not markdown_text and clean_text:
                markdown_text = clean_text

            title = None
            if hasattr(result, "metadata") and isinstance(result.metadata, dict):
                title = result.metadata.get("title")

            if not markdown_text:
                return CrawlResult(
                    url=canonical_url,
                    title=title,
                    markdown="",
                    clean_text=clean_text,
                    success=False,
                    status_code=result.status_code,
                    error_message="Page rendered successfully but extracted markdown content was empty.",
                )

            return CrawlResult(
                url=canonical_url,
                title=title,
                markdown=markdown_text,
                clean_text=clean_text,
                success=True,
                status_code=result.status_code or 200,
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
        max_pages: int = 10,
        concurrency: int = DEFAULT_CONCURRENCY,
    ) -> MultiPageCrawlResult:
        """Perform a bounded, resilient multi-page crawl starting from an initial URL.

        Control Flow:
        1. Validates starting URL against SSRF and normalizes it.
        2. Clamps max_pages strictly between 1 and 20.
        3. Initializes a shared browser session to avoid spawning redundant Chromium instances.
        4. Crawls starting page and collects extracted internal links.
        5. Uses a breadth-first search (BFS) queue to schedule candidate pages up to max_pages.
        6. Limits concurrent execution via asyncio.Semaphore.
        7. Collects successful CrawlResult objects and failed PageCrawlSummary records.
        """
        # Clamp max_pages between 1 and 20
        bounded_max_pages = max(1, min(20, max_pages))

        # 1. Normalize and SSRF-validate starting URL
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

        # Track visited and queued URLs
        visited_urls: Set[str] = set()
        queued_urls: Set[str] = {normalized_root}
        queue: List[str] = [normalized_root]

        successful_pages: List[CrawlResult] = []
        failed_pages: List[PageCrawlSummary] = []

        semaphore = asyncio.Semaphore(concurrency)
        browser_config = BrowserConfig(headless=True, verbose=False)

        async with AsyncWebCrawler(config=browser_config) as crawler:
            while queue and len(visited_urls) < bounded_max_pages:
                # Determine how many remaining slots we have
                remaining_slots = bounded_max_pages - len(visited_urls)
                batch_size = min(len(queue), remaining_slots, concurrency)
                batch = [queue.pop(0) for _ in range(batch_size)]

                async def _worker(target_url: str):
                    async with semaphore:
                        visited_urls.add(target_url)

                        # Crawl the page
                        crawl_res = await self.crawl_page(target_url, crawler_instance=crawler)

                        if crawl_res.success:
                            successful_pages.append(crawl_res)
                            # If we still have capacity to discover more pages, extract links
                            if len(visited_urls) + len(queue) < bounded_max_pages:
                                disc_res = await self.discover_internal_links(
                                    target_url,
                                    max_links=bounded_max_pages * 2,
                                    crawler_instance=crawler,
                                )
                                if disc_res.success:
                                    for link in disc_res.discovered_links:
                                        if (
                                            link not in queued_urls
                                            and link not in visited_urls
                                            and len(queued_urls) < bounded_max_pages * 2
                                        ):
                                            queued_urls.add(link)
                                            queue.append(link)
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
crawler_service = Crawl4AICrawler()
