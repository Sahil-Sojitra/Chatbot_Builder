import pytest
from unittest.mock import AsyncMock, patch

from app.services.security import validate_safe_url, SSRFValidationError, is_ip_allowed
from app.services.crawler import Crawl4AICrawler, CrawlResult, LinkDiscoveryResult
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
# Link Discovery & Normalization Tests
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


def test_normalize_url_strips_tracking_params_to_prevent_loops():
    """Verify UTM parameters and session IDs are stripped to prevent crawler loops."""
    base = "https://example.com"
    url1 = "https://example.com/pricing?utm_source=twitter&utm_medium=social"
    url2 = "https://example.com/pricing?ref=homepage&utm_campaign=winter"
    assert normalize_url(url1, base) == "https://example.com/pricing"
    assert normalize_url(url2, base) == "https://example.com/pricing"


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
            {"href": "https://google.com"},
        ]
    }

    links = filter_crawl4ai_internal_links(mock_crawl4ai_links, base, max_links=10)
    assert links == [
        "https://example.com/pricing",
        "https://example.com/about",
        "https://example.com/contact",
    ]

    limited = filter_crawl4ai_internal_links(mock_crawl4ai_links, base, max_links=2)
    assert len(limited) == 2
    assert limited == [
        "https://example.com/pricing",
        "https://example.com/about",
    ]


# ---------------------------------------------------------------------------
# Step 7: Multi-Page Bounded Crawl Tests (Mocked & Deterministic)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_multipage_crawl_never_exceeds_max_pages():
    """Deterministic test proving the page limit is strictly enforced."""
    crawler = Crawl4AICrawler()

    # Create 30 candidate internal pages
    discovered_urls = [f"https://example.com/page-{i}" for i in range(1, 31)]

    async def mock_crawl_page(url, crawler_instance=None):
        return CrawlResult(
            url=url,
            title=f"Title for {url}",
            markdown=f"# Content of {url}",
            clean_text=f"Content of {url}",
            success=True,
            status_code=200,
        )

    async def mock_discover_internal_links(url, max_links=20, crawler_instance=None):
        return LinkDiscoveryResult(
            starting_url=url,
            discovered_links=discovered_urls,
            total_found=len(discovered_urls),
            success=True,
        )

    with patch.object(crawler, "crawl_page", side_effect=mock_crawl_page), \
         patch.object(crawler, "discover_internal_links", side_effect=mock_discover_internal_links), \
         patch("app.services.crawler.AsyncWebCrawler"):

        # Request exactly 5 pages maximum
        result = await crawler.crawl_multipage("https://example.com", max_pages=5)

        assert result.success is True
        assert result.max_pages_requested == 5
        assert result.total_processed == 5
        assert result.successful_count == 5
        assert len(result.successful_pages) == 5
        assert result.failed_count == 0


@pytest.mark.asyncio
async def test_multipage_crawl_tolerates_individual_page_failures():
    """Verify that a single page failure does not abort the entire multi-page crawl."""
    crawler = Crawl4AICrawler()

    pages = {
        "https://example.com/": CrawlResult(
            url="https://example.com/",
            title="Home",
            markdown="# Home",
            clean_text="Home",
            success=True,
            status_code=200,
        ),
        "https://example.com/broken": CrawlResult(
            url="https://example.com/broken",
            markdown="",
            clean_text="",
            success=False,
            status_code=500,
            error_message="HTTP server error: status code 500",
        ),
        "https://example.com/docs": CrawlResult(
            url="https://example.com/docs",
            title="Docs",
            markdown="# Documentation",
            clean_text="Documentation",
            success=True,
            status_code=200,
        ),
    }

    async def mock_crawl_page(url, crawler_instance=None):
        return pages.get(
            url,
            CrawlResult(
                url=url, markdown="", clean_text="", success=False, error_message="Not found"
            ),
        )

    async def mock_discover_internal_links(url, max_links=20, crawler_instance=None):
        if url in ("https://example.com", "https://example.com/"):
            return LinkDiscoveryResult(
                starting_url=url,
                discovered_links=["https://example.com/broken", "https://example.com/docs"],
                total_found=2,
                success=True,
            )
        return LinkDiscoveryResult(
            starting_url=url, discovered_links=[], total_found=0, success=True
        )

    with patch.object(crawler, "crawl_page", side_effect=mock_crawl_page), \
         patch.object(crawler, "discover_internal_links", side_effect=mock_discover_internal_links), \
         patch("app.services.crawler.AsyncWebCrawler"):

        result = await crawler.crawl_multipage("https://example.com", max_pages=10)

        # Overall crawl should succeed because good pages were extracted
        assert result.success is True
        assert result.successful_count == 2
        assert result.failed_count == 1
        assert len(result.failed_pages) == 1
        assert result.failed_pages[0].url == "https://example.com/broken"
        assert result.failed_pages[0].status_code == 500
