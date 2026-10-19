"""Backwards-compatible alias for app.services.url_security."""

from app.services.url_security import (
    FORBIDDEN_HOSTNAMES,
    SSRFValidationError,
    is_ip_allowed,
    validate_safe_url,
)

__all__ = [
    "SSRFValidationError",
    "FORBIDDEN_HOSTNAMES",
    "is_ip_allowed",
    "validate_safe_url",
]
