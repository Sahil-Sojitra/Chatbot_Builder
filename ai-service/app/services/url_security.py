"""SSRF validation and network security utilities."""

import ipaddress
import socket
from typing import Optional, Tuple
from urllib.parse import urlparse


class SSRFValidationError(Exception):
    """Raised when a URL targets a forbidden or private network destination."""
    pass


FORBIDDEN_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
}


def is_ip_allowed(ip_str: str) -> bool:
    """Validate that an IP address is a public, routable global address.

    Blocks:
    - Loopback (127.0.0.0/8, ::1)
    - Private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7)
    - Link-local (169.254.0.0/16, fe80::/10) - includes AWS/GCP cloud metadata (169.254.169.254)
    - Multicast, broadcast, reserved, and unspecified addresses
    """
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False

    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return False

    return True


def validate_safe_url(raw_url: str, resolve_dns: bool = True) -> Tuple[str, Optional[str]]:
    """Validate a URL against SSRF vulnerabilities.

    1. Checks scheme (must be http or https).
    2. Checks hostname existence and blocks obvious loopback strings.
    3. Resolves DNS to IP addresses and verifies that EVERY resolved IP
       is a public routable address (prevents DNS rebinding and private LAN scans).

    Returns:
        (canonical_url, resolved_ip)

    Raises:
        SSRFValidationError if the URL is unsafe or invalid.
    """
    try:
        parsed = urlparse(raw_url)
    except Exception as exc:
        raise SSRFValidationError(f"Invalid URL structure: {exc}") from exc

    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        raise SSRFValidationError(f"Unsupported URL scheme: '{scheme}'. Only HTTP and HTTPS are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFValidationError("URL must include a valid hostname.")

    hostname_lower = hostname.lower().strip()
    if hostname_lower in FORBIDDEN_HOSTNAMES or hostname_lower.endswith(".localhost"):
        raise SSRFValidationError(f"Access to '{hostname}' is blocked for security.")

    try:
        direct_ip = ipaddress.ip_address(hostname_lower)
        if not is_ip_allowed(str(direct_ip)):
            raise SSRFValidationError(f"Access to IP address {direct_ip} is forbidden.")
        return raw_url, str(direct_ip)
    except ValueError:
        pass

    if resolve_dns:
        try:
            port = parsed.port or (443 if scheme == "https" else 80)
            addr_info = socket.getaddrinfo(hostname_lower, port, proto=socket.IPPROTO_TCP)
            if not addr_info:
                raise SSRFValidationError(f"Could not resolve host: {hostname}")

            first_ip = None
            for entry in addr_info:
                sockaddr = entry[4]
                ip_str = sockaddr[0]
                if not first_ip:
                    first_ip = ip_str
                if not is_ip_allowed(ip_str):
                    raise SSRFValidationError(
                        f"Resolved address '{ip_str}' for host '{hostname}' is private or reserved."
                    )
            return raw_url, first_ip
        except socket.gaierror as exc:
            raise SSRFValidationError(f"DNS resolution failed for '{hostname}': {exc}") from exc

    return raw_url, None


__all__ = [
    "SSRFValidationError",
    "FORBIDDEN_HOSTNAMES",
    "is_ip_allowed",
    "validate_safe_url",
]
