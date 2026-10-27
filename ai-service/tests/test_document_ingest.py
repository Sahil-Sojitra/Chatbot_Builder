"""Integration tests for document ingestion endpoints (POST /api/v1/ingest/document and /document-raw)."""

import os
import base64
import io
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.embedding import BatchEmbeddingResult, EmbeddingBatchStats, EmbeddedChunk
from app.services.vector_store import VectorUpsertResult


@pytest.fixture
def auth_headers():
    key = os.getenv("INTERNAL_API_KEY", "test-internal-secret-key-12345")
    return {"x-api-key": key}


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def mock_embedding_result():
    return BatchEmbeddingResult(
        embedded_chunks=[
            EmbeddedChunk(
                chunk_id="chk_doc_01",
                source_url="doc://handbook.txt",
                canonical_url="doc://handbook.txt#section-1",
                title="Handbook",
                content="Company guidelines and procedures for all team members.",
                chunk_index=0,
                embedding=[0.01] * 1024,
                dimensions=1024,
                token_count=10,
            )
        ],
        stats=EmbeddingBatchStats(
            total_chunks=1,
            successful_chunks=1,
            failed_chunks=0,
            total_tokens=10,
            duration_ms=15.0,
            model="voyage-3",
        ),
        success=True,
    )


@pytest.fixture
def mock_upsert_result():
    return VectorUpsertResult(
        chatbot_id="bot_test_123",
        upserted_count=1,
        success=True,
    )


def test_ingest_document_multipart_success(test_client, auth_headers, mock_embedding_result, mock_upsert_result):
    """POST /api/v1/ingest/document accepts multipart file uploads and indexes chunks into Pinecone."""
    file_bytes = b"Company guidelines and procedures for all team members.\n\nAttendance policy details."
    files = {"file": ("handbook.txt", io.BytesIO(file_bytes), "text/plain")}
    data = {"chatbot_id": "bot_test_123", "source_name": "Official Handbook"}

    with patch("app.services.embedding.embedding_service.aembed_chunks", new=AsyncMock(return_value=mock_embedding_result)):
        with patch("app.services.vector_store.vector_store.upsert_chunks", return_value=mock_upsert_result):
            res = test_client.post("/api/v1/ingest/document", data=data, files=files, headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["chatbot_id"] == "bot_test_123"
    assert body["filename"] == "Official Handbook"
    assert body["file_type"] == "txt"
    assert body["chunks_indexed"] == 1
    assert body["char_count"] > 0


def test_ingest_document_raw_base64_success(test_client, auth_headers, mock_embedding_result, mock_upsert_result):
    """POST /api/v1/ingest/document-raw accepts base64 content for programmatic ingestion."""
    raw_csv = b"Feature,Available\nChatbot,Yes\nAnalytics,Yes\n"
    b64_content = base64.b64encode(raw_csv).decode("utf-8")

    payload = {
        "chatbot_id": "bot_test_123",
        "filename": "features.csv",
        "content_base64": b64_content,
        "mime_type": "text/csv",
    }

    with patch("app.services.embedding.embedding_service.aembed_chunks", new=AsyncMock(return_value=mock_embedding_result)):
        with patch("app.services.vector_store.vector_store.upsert_chunks", return_value=mock_upsert_result):
            res = test_client.post("/api/v1/ingest/document-raw", json=payload, headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["chatbot_id"] == "bot_test_123"
    assert body["filename"] == "features.csv"
    assert body["file_type"] == "csv"
    assert body["chunks_indexed"] == 1


def test_ingest_document_empty_failure(test_client, auth_headers):
    """Empty documents return a clean 200 response with success=False."""
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    data = {"chatbot_id": "bot_test_123"}

    res = test_client.post("/api/v1/ingest/document", data=data, files=files, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is False
    assert "empty" in body["error_message"].lower()
