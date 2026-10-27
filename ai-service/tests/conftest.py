"""Shared pytest fixtures and test configuration for ai-service."""

import os
import pytest
from fastapi.testclient import TestClient

# Ensure test environment and standard test API key are configured
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-secret-key-12345")

from app.core.config import get_settings
from app.main import app


@pytest.fixture(autouse=True)
def reset_settings_cache():
    """Clears the settings cache before and after each test to prevent test leakage."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def test_api_key():
    return os.getenv("INTERNAL_API_KEY", "test-internal-secret-key-12345")


@pytest.fixture
def auth_headers(test_api_key):
    return {"X-API-Key": test_api_key}


@pytest.fixture
def test_client(auth_headers):
    return TestClient(app, headers=auth_headers)
