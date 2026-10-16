from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint continues to return 200 OK and expected body."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "Chatbot Builder AI Service",
        "version": "0.1.0",
    }


def test_valid_ingestion_payload_default_max_pages():
    """Valid payload with default unbounded max_pages (None)."""
    payload = {
        "chatbot_id": "bot_9876",
        "website_url": "https://docs.example.com/guide",
    }
    response = client.post("/demo/validate-ingestion", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Payload is valid"
    assert data["validated_data"]["chatbot_id"] == "bot_9876"
    assert data["validated_data"]["website_url"] == "https://docs.example.com/guide"
    assert data["validated_data"]["max_pages"] is None



def test_valid_ingestion_payload_custom_max_pages():
    """Valid payload with explicit custom max_pages within range [1, 20]."""
    payload = {
        "chatbot_id": "bot_abc",
        "website_url": "http://example.org",
        "max_pages": 5,
    }
    response = client.post("/demo/validate-ingestion", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["validated_data"]["max_pages"] == 5


def test_invalid_empty_chatbot_id():
    """Reject empty string chatbot_id."""
    payload = {
        "chatbot_id": "",
        "website_url": "https://example.com",
    }
    response = client.post("/demo/validate-ingestion", json=payload)
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(err["loc"] == ["body", "chatbot_id"] for err in errors)


def test_invalid_missing_chatbot_id():
    """Reject payload missing required chatbot_id field."""
    payload = {
        "website_url": "https://example.com",
    }
    response = client.post("/demo/validate-ingestion", json=payload)
    assert response.status_code == 422


def test_invalid_malformed_url():
    """Reject not-a-url string."""
    payload = {
        "chatbot_id": "bot_1",
        "website_url": "not-a-valid-url",
    }
    response = client.post("/demo/validate-ingestion", json=payload)
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(err["loc"] == ["body", "website_url"] for err in errors)


def test_invalid_unsupported_url_scheme():
    """Reject non-http/https URL schemes such as ftp:// or file://."""
    payload = {
        "chatbot_id": "bot_1",
        "website_url": "ftp://example.com/file",
    }
    response = client.post("/demo/validate-ingestion", json=payload)
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(err["loc"] == ["body", "website_url"] for err in errors)


def test_invalid_max_pages_below_minimum():
    """Reject max_pages < 1."""
    payload = {
        "chatbot_id": "bot_1",
        "website_url": "https://example.com",
        "max_pages": 0,
    }
    response = client.post("/demo/validate-ingestion", json=payload)
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(err["loc"] == ["body", "max_pages"] for err in errors)


def test_valid_large_max_pages():
    """Accept large max_pages (e.g. 50, 100) without artificial capping."""
    payload = {
        "chatbot_id": "bot_1",
        "website_url": "https://example.com",
        "max_pages": 50,
    }
    response = client.post("/demo/validate-ingestion", json=payload)
    assert response.status_code == 200
    assert response.json()["validated_data"]["max_pages"] == 50

