"""Comprehensive security, authentication, and routing test suite for FastAPI AI Service.

Validates:
1. Strict internal API-key authentication enforcement.
2. Route protection across chat, ingestion, and vector-store deletion.
3. Denial-before-execution guarantees (business operations are never invoked on 401).
4. Environment-based route registration (demo routes absent in production, present in development).
5. Health endpoint safety and isolation.
6. Vector-store deletion exception mapping.
"""

import os
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.internal_auth import GENERIC_AUTH_ERROR_DETAIL
from app.main import create_app
from app.services.qa import qa_service
from app.services.crawler import crawler_service
from app.services.document_parser import document_parser_service
from app.services.vector_store import vector_store, VectorDeleteResult, VectorStoreError

TEST_SECRET = "production-grade-internal-key-998877"


@pytest.fixture
def clean_env(monkeypatch):
    """Sets a clean, isolated test environment and clears settings cache."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("INTERNAL_API_KEY", TEST_SECRET)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def auth_headers():
    return {"X-API-Key": TEST_SECRET}


@pytest.fixture
def dev_client(clean_env):
    """Client for application constructed explicitly in development mode."""
    settings = Settings(ENVIRONMENT="development", INTERNAL_API_KEY=TEST_SECRET)
    app = create_app(settings=settings)
    return TestClient(app)


@pytest.fixture
def prod_client(clean_env):
    """Client for application constructed explicitly in production mode."""
    settings = Settings(ENVIRONMENT="production", INTERNAL_API_KEY=TEST_SECRET)
    app = create_app(settings=settings)
    return TestClient(app)


# ==============================================================================
# 1. AUTHENTICATION MECHANISM TESTS
# ==============================================================================

class TestAuthenticationMechanism:
    """Verifies the core security requirements for the internal API key."""

    def test_correct_api_key_succeeds(self, dev_client, auth_headers):
        """Valid X-API-Key header is accepted on protected endpoint."""
        from app.models.qa import QAResponse, QAStats
        mock_response = QAResponse(
            chatbot_id="bot_1",
            question="valid query",
            answer="Test answer",
            sources=[],
            has_grounded_evidence=True,
            stats=QAStats(model_used="gemini-1.5-flash"),
        )
        with patch.object(qa_service, "aanswer_question", AsyncMock(return_value=mock_response)):
            resp = dev_client.post(
                "/api/v1/chat/ask",
                headers=auth_headers,
                json={"chatbot_id": "bot_1", "question": "valid query"},
            )
            assert resp.status_code == 200

    def test_missing_header_returns_401(self, dev_client):
        """Missing X-API-Key header returns HTTP 401."""
        resp = dev_client.post(
            "/api/v1/chat/ask",
            json={"chatbot_id": "bot_1", "question": "valid query"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == GENERIC_AUTH_ERROR_DETAIL

    def test_incorrect_header_returns_401(self, dev_client):
        """Incorrect X-API-Key header returns HTTP 401."""
        resp = dev_client.post(
            "/api/v1/chat/ask",
            headers={"X-API-Key": "completely-invalid-key"},
            json={"chatbot_id": "bot_1", "question": "valid query"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == GENERIC_AUTH_ERROR_DETAIL

    def test_empty_header_returns_401(self, dev_client):
        """Empty string or whitespace-only X-API-Key header returns HTTP 401."""
        for empty_val in ("", "   ", "\t"):
            resp = dev_client.post(
                "/api/v1/chat/ask",
                headers={"X-API-Key": empty_val},
                json={"chatbot_id": "bot_1", "question": "valid query"},
            )
            assert resp.status_code == 401
            assert resp.json()["detail"] == GENERIC_AUTH_ERROR_DETAIL

    def test_missing_server_side_key_never_allows_bypass(self, monkeypatch):
        """When server-side INTERNAL_API_KEY is empty/unset, requests must STILL be rejected with 401."""
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.delenv("INTERNAL_API_KEY", raising=False)
        get_settings.cache_clear()

        settings = Settings(ENVIRONMENT="development", INTERNAL_API_KEY=None)
        app = create_app(settings=settings)
        client = TestClient(app)

        # Even if caller passes a header, it must be rejected because server has no valid key
        resp = client.post(
            "/api/v1/chat/ask",
            headers={"X-API-Key": "attempted-key"},
            json={"chatbot_id": "bot_1", "question": "test"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == GENERIC_AUTH_ERROR_DETAIL

    def test_whitespace_only_server_key_rejected(self, monkeypatch):
        """When server-side INTERNAL_API_KEY is whitespace only, requests are rejected with 401."""
        settings = Settings(ENVIRONMENT="development", INTERNAL_API_KEY="   ")
        app = create_app(settings=settings)
        client = TestClient(app)

        resp = client.post(
            "/api/v1/chat/ask",
            headers={"X-API-Key": "   "},
            json={"chatbot_id": "bot_1", "question": "test"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == GENERIC_AUTH_ERROR_DETAIL

    def test_production_startup_fails_without_key(self):
        """Production environment startup must fail if INTERNAL_API_KEY is missing, empty, or whitespace."""
        for bad_key in (None, "", "   ", "\t\n"):
            bad_settings = Settings(ENVIRONMENT="production", INTERNAL_API_KEY=bad_key)
            with pytest.raises(RuntimeError) as exc_info:
                create_app(settings=bad_settings)
            assert "INTERNAL_API_KEY must be set" in str(exc_info.value)

    def test_error_response_does_not_leak_secrets(self, dev_client):
        """Authentication error responses never disclose internal secret existence or values."""
        resp = dev_client.post(
            "/api/v1/chat/ask",
            headers={"X-API-Key": "attacker-guess"},
            json={"chatbot_id": "bot_1", "question": "test"},
        )
        assert resp.status_code == 401
        body = resp.text
        assert TEST_SECRET not in body
        assert "INTERNAL_API_KEY" not in body
        assert resp.json()["detail"] == GENERIC_AUTH_ERROR_DETAIL


# ==============================================================================
# 2. ROUTE COVERAGE & DENIAL-BEFORE-EXECUTION TESTS
# ==============================================================================

class TestRouteProtectionCoverage:
    """Proves that every customer-facing and ingestion route enforces authentication

    and that business logic is NEVER called on unauthorized requests.
    """

    def test_chat_ask_denial_before_execution(self, dev_client):
        """POST /api/v1/chat/ask denies before calling qa_service."""
        with patch.object(qa_service, "aanswer_question", AsyncMock()) as mock_qa:
            resp = dev_client.post(
                "/api/v1/chat/ask",
                json={"chatbot_id": "bot_1", "question": "sample"},
            )
            assert resp.status_code == 401
            mock_qa.assert_not_called()

    def test_chat_message_denial_before_execution(self, dev_client):
        """POST /api/v1/chat/message denies before calling qa_service."""
        with patch.object(qa_service, "aanswer_question", AsyncMock()) as mock_qa:
            resp = dev_client.post(
                "/api/v1/chat/message",
                json={"chatbot_id": "bot_1", "question": "sample"},
            )
            assert resp.status_code == 401
            mock_qa.assert_not_called()

    def test_ingest_website_denial_before_execution(self, dev_client):
        """POST /api/v1/ingest/website denies before calling crawler_service."""
        with patch.object(crawler_service, "crawl_multipage", AsyncMock()) as mock_crawl:
            resp = dev_client.post(
                "/api/v1/ingest/website",
                json={"chatbot_id": "bot_1", "website_url": "https://example.com"},
            )
            assert resp.status_code == 401
            mock_crawl.assert_not_called()

    def test_ingest_document_denial_before_execution(self, dev_client):
        """POST /api/v1/ingest/document denies before parsing document."""
        with patch.object(document_parser_service, "parse_document", AsyncMock()) as mock_parse:
            data = {"chatbot_id": "bot_1"}
            files = {"file": ("test.txt", b"Hello world", "text/plain")}
            resp = dev_client.post("/api/v1/ingest/document", data=data, files=files)
            assert resp.status_code == 401
            mock_parse.assert_not_called()

    def test_ingest_document_raw_denial_before_execution(self, dev_client):
        """POST /api/v1/ingest/document-raw denies before parsing."""
        with patch.object(document_parser_service, "parse_document", AsyncMock()) as mock_parse:
            payload = {
                "chatbot_id": "bot_1",
                "filename": "doc.txt",
                "content_base64": "SGVsbG8=",
            }
            resp = dev_client.post("/api/v1/ingest/document-raw", json=payload)
            assert resp.status_code == 401
            mock_parse.assert_not_called()

    def test_ingest_chatbot_deletion_denial_before_execution(self, dev_client):
        """DELETE /api/v1/ingest/chatbot/{id} denies before calling vector store."""
        with patch.object(vector_store, "delete_chatbot_content") as mock_delete:
            resp = dev_client.delete("/api/v1/ingest/chatbot/bot_test_1")
            assert resp.status_code == 401
            mock_delete.assert_not_called()

    def test_vector_store_direct_deletion_denial_before_execution(self, dev_client):
        """DELETE /vector-store/{id} denies before calling vector store."""
        with patch.object(vector_store, "delete_chatbot_content") as mock_delete:
            resp = dev_client.delete("/vector-store/bot_test_1")
            assert resp.status_code == 401
            mock_delete.assert_not_called()


# ==============================================================================
# 3. ENVIRONMENT & ROUTING TESTS
# ==============================================================================

class TestEnvironmentRouting:
    """Verifies that demo routes are omitted in production and present in development."""

    def test_health_endpoint_available_without_auth_in_dev_and_prod(self, dev_client, prod_client):
        """GET /health is always available and requires no credentials."""
        for client in (dev_client, prod_client):
            resp = client.get("/health")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "healthy"
            assert "service" in data
            assert "version" in data
            # Ensure no credentials or environment dumps in health check
            text = resp.text
            assert TEST_SECRET not in text
            assert "INTERNAL_API_KEY" not in text

    def test_demo_routes_available_in_development(self, dev_client, auth_headers):
        """In development mode, /demo/* routes exist and function as expected."""
        resp = dev_client.post(
            "/demo/validate-ingestion",
            json={"chatbot_id": "bot_dev", "website_url": "https://example.com"},
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Payload is valid"

    def test_demo_routes_absent_in_production_returns_404(self, prod_client, auth_headers):
        """In production mode, /demo/* routes are genuinely NOT mounted and return 404."""
        for path in (
            "/demo/validate-ingestion",
            "/demo/crawl-single-page",
            "/demo/discover-links",
            "/demo/crawl-multipage",
            "/demo/vector-store/health",
            "/demo/retrieval",
        ):
            resp = prod_client.post(path, json={})
            assert resp.status_code == 404, f"Expected 404 for {path} in production, got {resp.status_code}"

    def test_production_protected_routes_remain_registered(self, prod_client, auth_headers):
        """In production mode, protected business routes remain registered and respond appropriately."""
        with patch.object(vector_store, "delete_chatbot_content") as mock_delete:
            mock_delete.return_value = VectorDeleteResult(chatbot_id="bot_prod", success=True)
            # Authenticated deletion route works in production
            resp = prod_client.delete("/vector-store/bot_prod", headers=auth_headers)
            assert resp.status_code == 200

    def test_factory_creates_independent_applications_without_route_leakage(self):
        """create_app creates fresh FastAPI instances preventing cross-environment route contamination."""
        dev_app = create_app(Settings(ENVIRONMENT="development", INTERNAL_API_KEY=TEST_SECRET))
        prod_app = create_app(Settings(ENVIRONMENT="production", INTERNAL_API_KEY=TEST_SECRET))

        client_dev = TestClient(dev_app)
        client_prod = TestClient(prod_app)

        # In dev app, demo endpoint is mounted and responds
        dev_resp = client_dev.post(
            "/demo/validate-ingestion",
            json={"chatbot_id": "bot_test", "website_url": "https://example.com"},
        )
        assert dev_resp.status_code == 200

        # In prod app, demo endpoint is not mounted and returns 404
        prod_resp = client_prod.post(
            "/demo/validate-ingestion",
            json={"chatbot_id": "bot_test", "website_url": "https://example.com"},
        )
        assert prod_resp.status_code == 404


# ==============================================================================
# 4. VECTOR STORE DELETION ERROR MAPPING TESTS
# ==============================================================================

class TestVectorStoreDeletionErrorHandling:
    """Verifies that vector store deletion endpoints return proper non-2xx status codes on failure."""

    def test_vector_store_deletion_success(self, dev_client, auth_headers):
        """DELETE /vector-store/{chatbot_id} returns 200 on success."""
        with patch.object(vector_store, "delete_chatbot_content") as mock_delete:
            mock_delete.return_value = VectorDeleteResult(
                chatbot_id="bot_clean",
                success=True,
                deleted_chunks_count=15,
            )
            resp = dev_client.delete("/vector-store/bot_clean", headers=auth_headers)
            assert resp.status_code == 200
            assert resp.json()["success"] is True

    def test_vector_store_deletion_empty_id_returns_400(self, dev_client, auth_headers):
        """DELETE /vector-store/{chatbot_id} with whitespace-only id returns 400."""
        resp = dev_client.delete("/vector-store/%20%20%20", headers=auth_headers)
        assert resp.status_code == 400
        assert "must not be empty" in resp.json()["detail"].lower()

    def test_vector_store_deletion_failure_returns_500_without_leak(self, dev_client, auth_headers):
        """When vector deletion throws an exception, returns HTTP 500 without leaking details."""
        with patch.object(vector_store, "delete_chatbot_content") as mock_delete:
            mock_delete.side_effect = VectorStoreError("Pinecone API key pcsk_secret_XYZ failed: cluster timeout")
            resp = dev_client.delete("/vector-store/bot_err", headers=auth_headers)
            assert resp.status_code == 500
            detail = resp.json()["detail"]
            assert "Failed to delete vector store content" in detail
            # Ensure no credentials or internal traces leak
            assert "pcsk_secret_XYZ" not in resp.text
            assert "Pinecone" not in resp.text

    def test_ingest_chatbot_deletion_failure_returns_500(self, dev_client, auth_headers):
        """DELETE /api/v1/ingest/chatbot/{chatbot_id} returns 500 on failure."""
        with patch.object(vector_store, "delete_chatbot_content") as mock_delete:
            mock_delete.side_effect = Exception("Database network failure")
            resp = dev_client.delete("/api/v1/ingest/chatbot/bot_err", headers=auth_headers)
            assert resp.status_code == 500
            assert "Failed to delete chatbot vector store content" in resp.json()["detail"]
