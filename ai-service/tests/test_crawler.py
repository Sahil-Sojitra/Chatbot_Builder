import pytest
from app.services.security import validate_safe_url, SSRFValidationError, is_ip_allowed
from app.services.crawler import Crawl4AICrawler


def test_ip_allowed_filters_private_and_loopback():
    """Verify that private and loopback IPs are blocked."""
    assert is_ip_allowed("127.0.0.1") is False
    assert is_ip_allowed("10.0.0.1") is False
    assert is_ip_allowed("192.168.1.1") is False
    assert is_ip_allowed("172.16.0.1") is False
    assert is_ip_allowed("169.254.169.254") is False  # AWS metadata
    assert is_ip_allowed("::1") is False
    assert is_ip_allowed("0.0.0.0") is False

    # Public IP addresses should be allowed
    assert is_ip_allowed("8.8.8.8") is True
    assert is_ip_allowed("1.1.1.1") is True
    assert is_ip_allowed("93.184.216.34") is True


def test_validate_safe_url_blocks_localhost_and_private():
    """Verify URL validator rejects local and internal hostnames without needing DNS."""
    with pytest.raises(SSRFValidationError, match="blocked for security"):
        validate_safe_url("http://localhost:8000/api", resolve_dns=False)

    with pytest.raises(SSRFValidationError, match="blocked for security"):
        validate_safe_url("http://127.0.0.1/admin", resolve_dns=False)

    with pytest.raises(SSRFValidationError, match="forbidden"):
        validate_safe_url("http://192.168.1.1/secret", resolve_dns=False)

    with pytest.raises(SSRFValidationError, match="forbidden"):
        validate_safe_url("http://169.254.169.254/latest/meta-data/", resolve_dns=False)


def test_validate_safe_url_blocks_non_http_schemes():
    """Verify non-HTTP(S) schemes are rejected."""
    with pytest.raises(SSRFValidationError, match="Unsupported URL scheme"):
        validate_safe_url("ftp://example.com/test", resolve_dns=False)

    with pytest.raises(SSRFValidationError, match="Unsupported URL scheme"):
        validate_safe_url("file:///etc/passwd", resolve_dns=False)


@pytest.mark.asyncio
async def test_crawler_rejects_ssrf_destination():
    """Verify crawler aborts immediately on loopback/private target."""
    crawler = Crawl4AICrawler()
    result = await crawler.crawl_page("http://127.0.0.1:8000/sensitive")
    assert result.success is False
    assert "SSRF Security Violation" in (result.error_message or "")
