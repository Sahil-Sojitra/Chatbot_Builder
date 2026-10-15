from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from app.schemas.ingestion import WebsiteIngestionRequest
from app.services.crawler import crawler_service, CrawlResult

router = APIRouter(prefix="/demo", tags=["Demo / Temporary Testing"])


class SinglePageCrawlRequest(BaseModel):
    url: HttpUrl


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
    """Temporary testing endpoint that runs the single-page crawler on a validated URL.

    Enforces SSRF prevention and returns title, clean markdown, plain text, and status.
    """
    result = await crawler_service.crawl_page(str(payload.url))
    if not result.success and "SSRF Security Violation" in (result.error_message or ""):
        raise HTTPException(status_code=400, detail=result.error_message)

    return result
