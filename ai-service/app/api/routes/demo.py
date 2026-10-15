from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, HttpUrl, Field

from app.schemas.ingestion import WebsiteIngestionRequest
from app.services.crawler import (
    crawler_service,
    CrawlResult,
    LinkDiscoveryResult,
    MultiPageCrawlResult,
)
from app.services.content_normalizer import (
    content_normalizer,
    NormalizationResult,
)
from app.services.chunker import (
    chunker_service,
    ChunkingResult,
)

router = APIRouter(prefix="/demo", tags=["Demo / Temporary Testing"])


class SinglePageCrawlRequest(BaseModel):
    url: HttpUrl


class LinkDiscoveryRequest(BaseModel):
    url: HttpUrl
    max_links: int = 20


class MultiPageCrawlRequest(BaseModel):
    url: HttpUrl
    max_pages: int = Field(
        default=10,
        ge=1,
        le=20,
        description="Maximum internal pages to crawl (1 to 20)",
    )


@router.post("/validate-ingestion")
def demo_validate_ingestion(payload: WebsiteIngestionRequest):
    """Temporary endpoint demonstrating request validation for website ingestion.

    Does not trigger crawling or network requests.
    """
    return {
        "message": "Payload is valid",
        "validated_data": {
            "chatbot_id": payload.chatbot_id,
            "website_url": str(payload.website_url),
            "max_pages": payload.max_pages,
        },
    }


@router.post("/crawl-single-page", response_model=CrawlResult)
async def demo_crawl_single_page(payload: SinglePageCrawlRequest):
    """Temporary testing endpoint that runs the single-page crawler on a validated URL."""
    result = await crawler_service.crawl_page(str(payload.url))
    if not result.success and "SSRF Security Violation" in (result.error_message or ""):
        raise HTTPException(status_code=400, detail=result.error_message)

    return result


@router.post("/discover-links", response_model=LinkDiscoveryResult)
async def demo_discover_links(payload: LinkDiscoveryRequest):
    """Temporary testing endpoint to discover eligible internal links from a starting page."""
    result = await crawler_service.discover_internal_links(
        starting_url=str(payload.url),
        max_links=payload.max_links,
    )
    if not result.success and "SSRF Security Violation" in (result.error_message or ""):
        raise HTTPException(status_code=400, detail=result.error_message)

    return result


@router.post("/crawl-multipage", response_model=MultiPageCrawlResult)
async def demo_crawl_multipage(payload: MultiPageCrawlRequest):
    """Temporary testing endpoint executing bounded multi-page crawling."""
    result = await crawler_service.crawl_multipage(
        starting_url=str(payload.url),
        max_pages=payload.max_pages,
    )
    if not result.success and "SSRF Security Violation" in (result.error_message or ""):
        raise HTTPException(status_code=400, detail=result.error_message)

    return result


@router.post("/crawl-and-normalize", response_model=NormalizationResult)
async def demo_crawl_and_normalize(payload: MultiPageCrawlRequest):
    """Convenience testing endpoint: crawls multiple pages and normalizes the output."""
    crawl_result = await crawler_service.crawl_multipage(
        starting_url=str(payload.url),
        max_pages=payload.max_pages,
    )
    if not crawl_result.success and "SSRF Security Violation" in (crawl_result.error_message or ""):
        raise HTTPException(status_code=400, detail=crawl_result.error_message)

    return content_normalizer.normalize_pages(crawl_result)


@router.post("/normalize-content", response_model=NormalizationResult)
def demo_normalize_content(pages: list[dict]):
    """Testing endpoint to normalize a list of raw page objects without triggering network requests."""
    return content_normalizer.normalize_pages(pages)


@router.post("/chunk-pages", response_model=ChunkingResult)
def demo_chunk_pages(pages: list[dict], chunk_size: int = 500, chunk_overlap: int = 100):
    """Testing endpoint to chunk normalized or raw page dictionaries without network calls."""
    normalized = content_normalizer.normalize_pages(pages)
    return chunker_service.chunk_pages(normalized, chunk_size=chunk_size, chunk_overlap=chunk_overlap)


@router.post("/crawl-and-chunk", response_model=ChunkingResult)
async def demo_crawl_and_chunk(payload: MultiPageCrawlRequest, chunk_size: int = 500, chunk_overlap: int = 100):
    """Convenience testing endpoint: crawls, normalizes, and chunks a website end-to-end."""
    crawl_result = await crawler_service.crawl_multipage(
        starting_url=str(payload.url),
        max_pages=payload.max_pages,
    )
    if not crawl_result.success and "SSRF Security Violation" in (crawl_result.error_message or ""):
        raise HTTPException(status_code=400, detail=crawl_result.error_message)

    normalized = content_normalizer.normalize_pages(crawl_result)
    return chunker_service.chunk_pages(normalized, chunk_size=chunk_size, chunk_overlap=chunk_overlap)


