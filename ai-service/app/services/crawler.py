import asyncio
import re
from typing import Optional
from pydantic import BaseModel

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from app.services.security import validate_safe_url, SSRFValidationError


class CrawlResult(BaseModel):
    """Normalized output from crawling a single web page."""
    url: str
    title: Optional[str] = None
    markdown: str
    clean_text: str
    success: bool
    status_code: Optional[int] = None
    error_message: Optional[str] = None


class Crawl4AICrawler:
    """Production-grade asynchronous single-page web crawler powered by Crawl4AI.

    Features:
    - Pre-flight and redirect SSRF protection preventing access to private / metadata IP ranges.
    - Headless browser rendering via Crawl4AI's AsyncWebCrawler.
    - High-quality clean markdown extraction.
    - Safe error handling for timeouts, invalid targets, and empty pages.
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

                # Extract markdown and text
                markdown_text = (
                    result.markdown.raw_markdown
                    if hasattr(result.markdown, "raw_markdown")
                    else str(result.markdown or "")
                ).strip()

                # Clean whitespace
                clean_text = re.sub(r"\s+", " ", result.cleaned_html or markdown_text).strip()

                # Title extraction
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


# Global shared instance
crawler_service = Crawl4AICrawler()
