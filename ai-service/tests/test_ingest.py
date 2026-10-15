import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.crawler import CrawlResult, MultiPageCrawlResult
from app.services.embedding import BatchEmbeddingResult, EmbeddingBatchStats, EmbeddedChunk
from app.services.vector_store import VectorUpsertResult


@pytest.fixture
def test_client():
    return TestClient(app)


def test_ingest_website_success(test_client):
    """POST /api/v1/ingest/website successfully crawls, normalizes, chunks, embeds, and indexes."""
    mock_crawl = MultiPageCrawlResult(
        starting_url="https://example.com",
        max_pages_requested=5,
        total_discovered=1,
        total_processed=1,
        successful_count=1,
        failed_count=0,
        successful_pages=[
            CrawlResult(
                url="https://example.com",
                title="Example Domain",
                markdown="# Example Domain\n\nThis is an example website for testing knowledge ingestion.",
                clean_text="Example Domain. This is an example website for testing knowledge ingestion.",
                status_code=200,
                success=True,
            )
        ],
        failed_pages=[],
        success=True,
    )

    mock_embeddings = BatchEmbeddingResult(
        embedded_chunks=[
            EmbeddedChunk(
                chunk_id="chk_01",
                source_url="https://example.com",
                canonical_url="https://example.com",
                title="Example Domain",
                content="This is an example website for testing knowledge ingestion.",
                chunk_index=0,
                embedding=[0.05] * 1024,
                dimensions=1024,
                token_count=10,
            )
        ],
        stats=EmbeddingBatchStats(
            total_chunks=1,
            total_tokens_used=10,
            dimensions=1024,
            model_name="voyage-4",
            duration_ms=50.0,
        ),
        success=True,
    )

    mock_upsert = VectorUpsertResult(
        chatbot_id="bot_store_123",
        upserted_count=1,
        success=True,
    )

    with patch("app.api.v1.ingest.crawler_service.crawl_multipage", AsyncMock(return_value=mock_crawl)), \
         patch("app.api.v1.ingest.embedding_service.aembed_chunks", AsyncMock(return_value=mock_embeddings)), \
         patch("app.api.v1.ingest.vector_store.upsert_chunks", MagicMock(return_value=mock_upsert)):

        resp = test_client.post(
            "/api/v1/ingest/website",
            json={
                "chatbot_id": "bot_store_123",
                "website_url": "https://example.com",
                "max_pages": 5,
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["chatbot_id"] == "bot_store_123"
        assert data["website_url"] == "https://example.com/"
        assert data["pages_crawled"] == 1
        assert data["chunks_indexed"] == 1
        assert data["success"] is True


def test_ingest_website_ssrf_violation_returns_400(test_client):
    """SSRF violations during crawling return HTTP 400."""
    mock_crawl = MultiPageCrawlResult(
        starting_url="http://127.0.0.1",
        max_pages_requested=1,
        total_discovered=0,
        total_processed=0,
        successful_count=0,
        failed_count=1,
        successful_pages=[],
        failed_pages=[],
        success=False,
        error_message="SSRF Security Violation: Access to 127.0.0.1 is blocked.",
    )

    with patch("app.api.v1.ingest.crawler_service.crawl_multipage", AsyncMock(return_value=mock_crawl)):
        resp = test_client.post(
            "/api/v1/ingest/website",
            json={
                "chatbot_id": "bot_store_123",
                "website_url": "http://127.0.0.1",
            },
        )
        assert resp.status_code == 400
        assert "SSRF Security Violation" in resp.json()["detail"]


def test_ingest_internal_api_key_enforcement(test_client, monkeypatch):
    """When INTERNAL_API_KEY is configured, requests without key or with wrong key return 401."""
    monkeypatch.setenv("INTERNAL_API_KEY", "secret-key-xyz")

    # 1. Missing key
    resp_missing = test_client.post(
        "/api/v1/ingest/website",
        json={"chatbot_id": "bot_123", "website_url": "https://example.com"},
    )
    assert resp_missing.status_code == 401

    # 2. Wrong key
    resp_wrong = test_client.post(
        "/api/v1/ingest/website",
        headers={"x-api-key": "wrong-key"},
        json={"chatbot_id": "bot_123", "website_url": "https://example.com"},
    )
    assert resp_wrong.status_code == 401
