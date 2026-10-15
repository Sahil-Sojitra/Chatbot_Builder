import asyncio
import re
from typing import Optional, List
from pydantic import BaseModel

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from app.services.security import validate_safe_url, SSRFValidationError
from app.services.link_discovery import filter_crawl4ai_internal_links, normalize_url


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


class Crawl4AICrawler:
    """Production-grade asynchronous single-page web crawler and link discoverer powered by Crawl4AI.

    Features:
    - Pre-flight SSRF protection preventing access to private / metadata IP ranges.
    - Headless browser rendering via Crawl4AI's AsyncWebCrawler.
    - High-quality clean markdown extraction.
    - Uses Crawl4AI native link extraction for internal link discovery.
    """

    DEFAULT_TIMEOUT_MS = 20000

    async def crawl_page(self, url: str) -> CrawlResult:
        """Crawl a single URL safely using Crawl4AI's AsyncWebCrawler."""
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

        # 2. Configure Crawl4AI browser and run parameters
        browser_config = BrowserConfig(
            headless=True,
            verbose=False,
        )

        run_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            page_timeout=self.DEFAULT_TIMEOUT_MS,
            word_count_threshold=5,
        )

        # 3. Execute Async Crawl with Crawl4AI
        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(
                    url=canonical_url,
                    config=run_config,
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

                # Extract markdown and text directly from Crawl4AI
                markdown_text = (
                    result.markdown.raw_markdown
                    if hasattr(result.markdown, "raw_markdown")
                    else str(result.markdown or "")
                ).strip()

                clean_text = re.sub(r"\s+", " ", result.cleaned_html or markdown_text).strip()

                # Title extraction from Crawl4AI metadata
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
    ) -> LinkDiscoveryResult:
        """Fetch a starting page and identify eligible internal links using Crawl4AI's native link parser."""
        # Pre-flight SSRF check
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

        browser_config = BrowserConfig(headless=True, verbose=False)
        run_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            page_timeout=self.DEFAULT_TIMEOUT_MS,
        )

        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                crawl_res = await crawler.arun(url=canonical_url, config=run_config)
                if not crawl_res.success:
                    return LinkDiscoveryResult(
                        starting_url=canonical_url,
                        discovered_links=[],
                        total_found=0,
                        success=False,
                        error_message=crawl_res.error_message or "Failed to fetch page for link discovery",
                    )

                # Use Crawl4AI's native parsed links dictionary directly
                # crawl_res.links contains: {'internal': [...], 'external': [...]}
                links = filter_crawl4ai_internal_links(
                    crawl4ai_links=crawl_res.links,
                    base_url=canonical_url,
                    max_links=max_links,
                )

                # Filter each discovered link against SSRF to guarantee safe destinations
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

        except Exception as exc:
            return LinkDiscoveryResult(
                starting_url=canonical_url,
                discovered_links=[],
                total_found=0,
                success=False,
                error_message=f"Link discovery failed: {exc}",
            )


# Global shared instance
crawler_service = Crawl4AICrawler()
