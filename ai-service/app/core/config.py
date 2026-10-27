"""Configuration management using Pydantic Settings.

Provides centralized, validated configuration with strict production security checks.
"""

import os
from enum import Enum
from functools import lru_cache
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnvironment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core environment and server settings
    ENVIRONMENT: str = Field(default=AppEnvironment.PRODUCTION.value)
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    LOG_LEVEL: str = Field(default="info")

    # Service-to-service internal authentication key
    INTERNAL_API_KEY: Optional[str] = Field(default=None)

    # External LLM & Provider keys (optional at startup, validated per-call)
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None)
    GEMINI_API_KEY: Optional[str] = Field(default=None)
    GEMINI_MODEL: str = Field(default="gemini-1.5-flash")
    GROQ_API_KEY: Optional[str] = Field(default=None)

    # Embedding & Vector store settings
    VOYAGE_API_KEY: Optional[str] = Field(default=None)
    VOYAGE_MODEL: str = Field(default="voyage-4")
    VOYAGE_BATCH_SIZE: int = Field(default=128)
    PINECONE_API_KEY: Optional[str] = Field(default=None)
    PINECONE_INDEX_NAME: Optional[str] = Field(default=None)

    # Backend API URL for webhook notifications
    BACKEND_API_URL: Optional[str] = Field(default=None)

    @property
    def normalized_environment(self) -> str:
        """Returns the trimmed, lowercase environment name."""
        return (self.ENVIRONMENT or "").strip().lower()

    @property
    def is_production(self) -> bool:
        """Returns True if the environment is production or defaults safely to production."""
        # Safe default: Any environment that is not explicitly development or testing
        # is treated with production-level security restrictions.
        return self.normalized_environment in ("production", "prod") or (
            not self.is_development and not self.is_testing
        )

    @property
    def is_development(self) -> bool:
        """Returns True if explicitly running in local development mode."""
        return self.normalized_environment in ("development", "dev")

    @property
    def is_testing(self) -> bool:
        """Returns True if explicitly running in automated testing mode."""
        return self.normalized_environment in ("testing", "test")

    def should_register_demo_routes(self) -> bool:
        """Demo routes must only be registered in development or testing environments.
        
        In production or any unspecified environment, demo routes are never mounted.
        """
        return self.is_development or self.is_testing

    def validate_internal_api_key(self) -> None:
        """Enforces that production deployments have a valid, non-empty INTERNAL_API_KEY.
        
        Raises:
            RuntimeError: If running in production and INTERNAL_API_KEY is missing or empty.
        """
        if self.is_production:
            key = (self.INTERNAL_API_KEY or "").strip()
            if not key:
                raise RuntimeError(
                    "Production configuration error: INTERNAL_API_KEY must be set and non-empty in production. "
                    "Service startup aborted to prevent unauthenticated access."
                )


@lru_cache()
def get_settings() -> Settings:
    """Returns a cached singleton instance of Settings."""
    return Settings()
