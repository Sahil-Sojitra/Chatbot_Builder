import pytest
from unittest.mock import AsyncMock, patch
import httpx

from app.services.sitemap import SitemapService, sitemap_service


def test_parse_standard_urlset_xml():
    """Verify parsing a standard sitemap.xml with XML namespace."""
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
            <loc>https://example.com/</loc>
            <priority>1.0</priority>
        </url>
        <url>
            <loc>https://example.com/about</loc>
            <priority>0.8</priority>
        </url>
        <url>
            <loc>https://example.com/pricing</loc>
            <priority>0.8</priority>
        </url>
        <url>
            <loc>https://example.com/docs/guide</loc>
            <priority>0.6</priority>
        </url>
        <url>
            <!-- Should be filtered out due to binary extension -->
            <loc>https://example.com/manual.pdf</loc>
        </url>
        <url>
            <!-- Should be filtered out due to logout action -->
            <loc>https://example.com/logout</loc>
        </url>
        <url>
            <!-- Should be filtered out due to external domain -->
            <loc>https://otherdomain.com/page</loc>
        </url>
    </urlset>
    """
    service = SitemapService()
    pages, sub_sitemaps = service.parse_sitemap_xml(xml_content, "https://example.com")

    assert "https://example.com/" in pages
    assert "https://example.com/about" in pages
    assert "https://example.com/pricing" in pages
    assert "https://example.com/docs/guide" in pages
    assert "https://example.com/manual.pdf" not in pages
    assert "https://example.com/logout" not in pages
    assert "https://otherdomain.com/page" not in pages
    assert sub_sitemaps == []


def test_parse_sitemap_index_xml():
    """Verify parsing a sitemap index containing child sitemaps."""
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap>
            <loc>https://example.com/sitemap-pages.xml</loc>
            <lastmod>2026-01-01</lastmod>
        </sitemap>
        <sitemap>
            <loc>https://example.com/sitemap-posts.xml</loc>
            <lastmod>2026-01-01</lastmod>
        </sitemap>
    </sitemapindex>
    """
    service = SitemapService()
    pages, sub_sitemaps = service.parse_sitemap_xml(xml_content, "https://example.com")

    assert pages == []
    assert sub_sitemaps == [
        "https://example.com/sitemap-pages.xml",
        "https://example.com/sitemap-posts.xml",
    ]


def test_extract_robots_sitemaps():
    """Verify extracting Sitemap directives from robots.txt content."""
    robots_txt = """
    User-agent: *
    Disallow: /admin/
    Disallow: /private/

    Sitemap: https://example.com/custom-sitemap.xml
    sitemap: https://example.com/sitemap2.xml
    """
    service = SitemapService()
    urls = service.extract_robots_sitemaps(robots_txt, "https://example.com")
    assert urls == [
        "https://example.com/custom-sitemap.xml",
        "https://example.com/sitemap2.xml",
    ]


@pytest.mark.asyncio
async def test_discover_sitemap_urls_end_to_end():
    """Verify end-to-end sitemap discovery through sitemap index and sub-sitemap."""
    index_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap>
            <loc>https://example.com/sub-sitemap.xml</loc>
        </sitemap>
    </sitemapindex>
    """
    sub_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/docs</loc></url>
        <url><loc>https://example.com/contact</loc></url>
    </urlset>
    """

    async def mock_fetch(client, target_url):
        if "robots.txt" in target_url:
            return None
        if target_url == "https://example.com/sitemap.xml":
            return index_xml
        if target_url == "https://example.com/sub-sitemap.xml":
            return sub_xml
        return None

    service = SitemapService()
    with patch.object(service, "_fetch_text_safely", side_effect=mock_fetch):
        discovered = await service.discover_sitemap_urls("https://example.com", max_links=10)

    assert "https://example.com/docs" in discovered
    assert "https://example.com/contact" in discovered


@pytest.mark.asyncio
async def test_discover_sitemap_ssrf_safety():
    """Verify sitemaps hosted on private IPs are blocked by SSRF checks."""
    service = SitemapService()
    async with httpx.AsyncClient() as client:
        # Private loopback target
        result = await service._fetch_text_safely(client, "http://127.0.0.1/sitemap.xml")
        assert result is None
