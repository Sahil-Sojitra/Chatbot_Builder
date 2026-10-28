import pytest
from unittest.mock import AsyncMock, patch

from app.models.crawler import CrawlResult
from app.services.anti_bot import (
    detect_bot_protection_challenge,
    FRIENDLY_BOT_BLOCKED_MESSAGE,
)
from app.services.web_crawler import Crawl4AICrawler


def test_detects_cloudflare_challenge_by_title():
    """Verify challenge detection when page title indicates Cloudflare interstitial."""
    is_blocked, reason = detect_bot_protection_challenge(
        title="Just a moment...",
        markdown_or_text="Checking your browser before accessing example.com.",
    )
    assert is_blocked is True
    assert "Just a moment..." in (reason or "")

    is_blocked2, reason2 = detect_bot_protection_challenge(
        title="Attention Required! | Cloudflare",
        markdown_or_text="Please complete the security check to access example.com.",
    )
    assert is_blocked2 is True
    assert "Attention Required!" in (reason2 or "")


def test_detects_cloudflare_challenge_by_body_signature():
    """Verify challenge detection when body contains turnstile or challenge markers."""
    html_sample = """
    <html>
      <head><title>Web Page</title></head>
      <body>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>
        <div>Please verify you are a human to continue.</div>
        <div>Cloudflare Ray ID: 89ab31f4c7189a</div>
      </body>
    </html>
    """
    is_blocked, reason = detect_bot_protection_challenge(
        status_code=200,
        title="Web Page",
        markdown_or_text="Please verify you are a human to continue. Cloudflare Ray ID: 89ab31f4c7189a",
        html=html_sample,
    )
    assert is_blocked is True
    assert reason is not None


def test_detects_http_403_waf_block():
    """Verify challenge detection when server returns HTTP 403 with WAF keywords."""
    is_blocked, reason = detect_bot_protection_challenge(
        status_code=403,
        title="403 Forbidden",
        markdown_or_text="Access Denied. You used Cloudflare to restrict access.",
    )
    assert is_blocked is True
    assert "403" in (reason or "")


def test_legitimate_website_not_flagged():
    """Verify normal business website is not flagged as challenge."""
    is_blocked, reason = detect_bot_protection_challenge(
        status_code=200,
        title="Acme Payments - Fast & Simple API",
        markdown_or_text="Welcome to Acme Payments! Build seamless checkout flows with our REST APIs.",
        html="<div>Welcome to Acme Payments! Build seamless checkout flows.</div>",
    )
    assert is_blocked is False
    assert reason is None


@pytest.mark.asyncio
async def test_crawl_multipage_aborts_immediately_on_root_challenge():
    """Verify that crawl_multipage aborts immediately when root URL is blocked by WAF."""
    crawler = Crawl4AICrawler()

    mock_challenge_result = CrawlResult(
        url="https://protected-site.com",
        title="Just a moment...",
        markdown="",
        clean_text="",
        success=False,
        status_code=403,
        is_bot_blocked=True,
        error_message="Bot Protection Challenge: Challenge title matched",
    )

    with patch("app.services.web_crawler.validate_safe_url", return_value=("https://protected-site.com", "93.184.216.34")), \
         patch.object(crawler, "crawl_page", return_value=mock_challenge_result):
        res = await crawler.crawl_multipage("https://protected-site.com", max_pages=10)

    assert res.success is False
    assert res.successful_count == 0
    assert res.error_message == FRIENDLY_BOT_BLOCKED_MESSAGE
