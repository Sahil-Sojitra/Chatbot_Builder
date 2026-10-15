from fastapi import APIRouter

from app.schemas.ingestion import WebsiteIngestionRequest

router = APIRouter(prefix="/demo", tags=["Demo / Temporary Validation"])


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
