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
    max_pages: int = Field(
        default=10,
        ge=1,
        le=20,
        description="Maximum number of pages to discover and ingest (between 1 and 20).",
        examples=[10],
    )
