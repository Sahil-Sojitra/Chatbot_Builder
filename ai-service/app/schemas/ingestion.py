from typing import Optional
from pydantic import BaseModel, Field, HttpUrl


class WebsiteIngestionRequest(BaseModel):
    """Schema validating incoming website ingestion requests."""

    chatbot_id: str = Field(
        ...,
        min_length=1,
        description="Non-empty identifier of the chatbot.",
        examples=["bot_12345"],
    )
    website_url: HttpUrl = Field(
        ...,
        description="Valid HTTP or HTTPS website URL to crawl and ingest.",
        examples=["https://example.com"],
    )
    max_pages: Optional[int] = Field(
        default=None,
        ge=1,
        description="Maximum number of pages to discover and ingest (unbounded when omitted).",
        examples=[20],
    )

