import pytest
from app.services.security import validate_safe_url, SSRFValidationError, is_ip_allowed
from app.services.crawler import Crawl4AICrawler
from app.services.link_discovery import (
    normalize_url,
    is_eligible_internal_link,
    filter_crawl4ai_internal_links,
)


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


# ---------------------------------------------------------------------------
# Step 6: Link Discovery & Normalization Tests (Pure Crawl4AI Pipeline)
# ---------------------------------------------------------------------------


def test_normalize_url_resolves_relative_links():
    """Verify relative paths resolve properly against base URL."""
    base = "https://example.com/blog/article-1"
    assert normalize_url("/about", base) == "https://example.com/about"
    assert normalize_url("subpage", base) == "https://example.com/blog/subpage"
    assert normalize_url("../faq", base) == "https://example.com/faq"


def test_normalize_url_strips_fragments_and_normalizes():
    """Verify URL fragments are stripped and trailing slashes normalized."""
    base = "https://example.com"
    # Strips #section
    assert normalize_url("https://example.com/docs#installation", base) == "https://example.com/docs"
    # Strips duplicate slash
    assert normalize_url("https://example.com/docs//guide/", base) == "https://example.com/docs/guide"
    # Keeps root slash
    assert normalize_url("https://example.com/", base) == "https://example.com/"


def test_normalize_url_rejects_unsupported_schemes():
    """Verify mailto:, javascript:, and tel: links are ignored."""
    base = "https://example.com"
    assert normalize_url("mailto:support@example.com", base) is None
    assert normalize_url("javascript:void(0)", base) is None
    assert normalize_url("tel:+123456789", base) is None
    assert normalize_url("#top", base) is None


def test_is_eligible_internal_link_filters_domains():
    """Verify only same-origin/same-domain links are accepted."""
    base = "https://example.com"
    assert is_eligible_internal_link("https://example.com/docs", base) is True
    assert is_eligible_internal_link("https://otherdomain.com/docs", base) is False
    assert is_eligible_internal_link("https://sub.example.com/docs", base) is False


def test_is_eligible_internal_link_excludes_non_html_and_destructive():
    """Verify non-HTML assets (.pdf, .zip, .png) and auth/destructive links are filtered."""
    base = "https://example.com"
    # Binary / media assets
    assert is_eligible_internal_link("https://example.com/whitepaper.pdf", base) is False
    assert is_eligible_internal_link("https://example.com/archive.zip", base) is False
    assert is_eligible_internal_link("https://example.com/logo.png", base) is False
    assert is_eligible_internal_link("https://example.com/styles.css", base) is False

    # Destructive / auth links
    assert is_eligible_internal_link("https://example.com/logout", base) is False
    assert is_eligible_internal_link("https://example.com/auth/sign-out", base) is False
    assert is_eligible_internal_link("https://example.com/account/delete", base) is False
    assert is_eligible_internal_link("https://example.com/reset-password", base) is False


def test_filter_crawl4ai_internal_links_deduplication_and_limit():
    """Verify Crawl4AI's native link dictionary is filtered, deduplicated, and limited."""
    base = "https://example.com/home"

    # Simulated Crawl4AI result.links output structure
    mock_crawl4ai_links = {
        "internal": [
            {"href": "/pricing"},
            {"href": "/pricing#features"},  # Duplicate after fragment strip
            {"href": "https://example.com/pricing/"},  # Duplicate after slash strip
            {"href": "/about"},
            {"href": "/contact"},
            {"href": "/brochure.pdf"},  # Non-HTML asset (excluded)
            {"href": "/logout"},  # Destructive action (excluded)
            {"href": "javascript:void(0)"},  # Unsupported scheme (excluded)
        ],
        "external": [
            {"href": "https://google.com"},  # Crawl4AI already separated external
        ]
    }

    # Test with max_links = 10
    links = filter_crawl4ai_internal_links(mock_crawl4ai_links, base, max_links=10)
    assert links == [
        "https://example.com/pricing",
        "https://example.com/about",
        "https://example.com/contact",
    ]

    # Test limit enforcement
    limited = filter_crawl4ai_internal_links(mock_crawl4ai_links, base, max_links=2)
    assert len(limited) == 2
    assert limited == [
        "https://example.com/pricing",
        "https://example.com/about",
    ]
