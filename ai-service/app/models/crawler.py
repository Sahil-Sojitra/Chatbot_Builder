"""Pydantic data models for crawler operations and results."""

from typing import List, Optional
from pydantic import BaseModel, Field


class CrawlResult(BaseModel):
    """Normalized output from crawling a single web page."""

    url: str = Field(..., description="The URL of the crawled web page.")
    title: Optional[str] = Field(None, description="The extracted page title, if available.")
    markdown: str = Field(..., description="Extracted Markdown content of the page.")
    clean_text: str = Field(..., description="Sanitized plain text extracted from HTML/Markdown.")
    success: bool = Field(..., description="Whether the page crawl succeeded.")
    status_code: Optional[int] = Field(None, description="HTTP status code returned by the server.")
    links: List[str] = Field(default_factory=list, description="Internal links discovered on this page.")
    is_bot_blocked: bool = Field(False, description="Whether the page was blocked by anti-bot/WAF.")
    error_message: Optional[str] = Field(None, description="Error details if the page crawl failed.")


class LinkDiscoveryResult(BaseModel):
    """Output from discovering internal links on a starting webpage."""

    starting_url: str = Field(..., description="Root webpage URL evaluated for link discovery.")
    discovered_links: List[str] = Field(default_factory=list, description="List of eligible internal URLs found.")
    total_found: int = Field(0, description="Total count of eligible internal links discovered.")
    success: bool = Field(True, description="Whether the link discovery process completed successfully.")
    error_message: Optional[str] = Field(None, description="Error message if discovery failed.")


class PageCrawlSummary(BaseModel):
    """Per-page execution summary within a multi-page crawl job."""

    url: str = Field(..., description="URL of the crawled page.")
    title: Optional[str] = Field(None, description="Page title if resolved.")
    success: bool = Field(..., description="Whether the individual page crawl was successful.")
    status_code: Optional[int] = Field(None, description="HTTP response status code.")
    char_count: int = Field(0, description="Character count of extracted content.")
    error_message: Optional[str] = Field(None, description="Error details if this page failed.")


class MultiPageCrawlResult(BaseModel):
    """Structured result for a multi-page crawl operation."""

    starting_url: str = Field(..., description="Starting root URL of the crawl job.")
    max_pages_requested: Optional[int] = Field(None, description="Requested page limit (None if unbounded).")
    total_discovered: int = Field(0, description="Total internal links discovered.")
    total_processed: int = Field(0, description="Total pages processed (successful + failed).")
    successful_count: int = Field(0, description="Count of successfully crawled pages.")
    failed_count: int = Field(0, description="Count of pages that failed to crawl.")
    successful_pages: List[CrawlResult] = Field(default_factory=list, description="List of successful page results.")
    failed_pages: List[PageCrawlSummary] = Field(default_factory=list, description="List of failed page summaries.")
    success: bool = Field(True, description="Whether at least one page was successfully crawled.")
    error_message: Optional[str] = Field(None, description="Summary error message if the entire crawl failed.")
