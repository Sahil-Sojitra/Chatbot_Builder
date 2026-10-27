"""Shared internal API-key authentication dependency.

Secures service-to-service communication between the Node.js backend
and the FastAPI AI service using constant-time key validation.
"""

import logging
import secrets
from typing import Optional
from fastapi import Header, HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger("ai_service.auth")

GENERIC_AUTH_ERROR_DETAIL = "Unauthorized: Invalid or missing API key."


def verify_internal_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> str:
    """FastAPI dependency that enforces internal API-key verification.

    Requirements:
    1. Reads expected key from INTERNAL_API_KEY via Settings.
    2. Reads caller key from the X-API-Key request header.
    3. Rejects missing or empty server-side configuration with HTTP 401.
       (Never allows authentication to be bypassed simply because an env var is unset).
    4. Rejects missing, empty, or incorrect request headers with HTTP 401.
    5. Uses constant-time comparison via secrets.compare_digest().
    6. Does NOT log API keys, request header values, or secrets.
    7. Returns a generic error message without exposing configuration details.

    Returns:
        The validated caller API key string.

    Raises:
        HTTPException: HTTP 401 Unauthorized if verification fails.
    """
    settings = get_settings()
    server_key = (settings.INTERNAL_API_KEY or "").strip()

    # Reject if server-side key is unconfigured or empty (never silent bypass)
    if not server_key:
        logger.error("Authentication rejected: Server INTERNAL_API_KEY is not configured or empty.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_AUTH_ERROR_DETAIL,
        )

    # Reject if caller did not supply X-API-Key header or supplied empty/whitespace
    caller_key = (x_api_key or "").strip()
    if not caller_key:
        logger.warning("Authentication rejected: Request missing or empty X-API-Key header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_AUTH_ERROR_DETAIL,
        )

    # Constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(caller_key, server_key):
        logger.warning("Authentication rejected: Provided X-API-Key does not match configured key.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_AUTH_ERROR_DETAIL,
        )

    return caller_key
