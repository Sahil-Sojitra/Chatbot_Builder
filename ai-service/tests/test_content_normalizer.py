import pytest
from datetime import datetime, timezone

from app.services.content_normalizer import (
    content_normalizer,
    NormalizedPageRecord,
    NormalizationResult,
    ContentNormalizationStats,
)
from app.services.crawler import CrawlResult, MultiPageCrawlResult


class TestContentNormalizer:
    """Test suite validating Step 8 content extraction and normalization."""

    def test_empty_content_is_discarded(self):
        """Pages with empty strings, whitespace-only, or trivial length should be discarded."""
        pages = [
            {"url": "https://example.com/empty1", "markdown": ""},
            {"url": "https://example.com/empty2", "markdown": "   \n\n  \t  \n  "},
            {"url": "https://example.com/short", "markdown": "Too short"},
            {"url": "https://example.com/valid", "markdown": "# Valid Title\n\nThis is sufficient content for ingestion."},
        ]

        result = content_normalizer.normalize_pages(pages)

        assert result.stats.total_input_pages == 4
        assert result.stats.usable_pages == 1
        assert result.stats.empty_pages_discarded == 3
        assert len(result.records) == 1
        assert result.records[0].source_url == "https://example.com/valid"

    def test_noise_only_content_is_discarded_as_empty(self):
        """Pages that only contain cookie banners and skip links should be discarded as empty."""
        pages = [
            {
                "url": "https://example.com/noise",
                "markdown": (
                    "Skip to main content\n"
                    "We use cookies to enhance your experience\n"
                    "Accept all cookies\n"
                    "Back to top\n"
                ),
            },
            {
                "url": "https://example.com/real",
                "markdown": (
                    "# Documentation\n"
                    "Skip to content\n"
                    "We value your privacy\n"
                    "Accept all cookies\n"
                    "This is the actual product documentation and API guides that users need.\n"
                    "Back to top\n"
                ),
            },
        ]

        result = content_normalizer.normalize_pages(pages)

        assert result.stats.usable_pages == 1
        assert result.stats.empty_pages_discarded == 1
        assert result.records[0].source_url == "https://example.com/real"
        # Ensure noise lines were stripped from the usable page
        assert "Skip to content" not in result.records[0].content
        assert "Accept all cookies" not in result.records[0].content
        assert "Back to top" not in result.records[0].content
        assert "This is the actual product documentation" in result.records[0].content

    def test_whitespace_and_paragraph_normalization(self):
        """Preserves headings and paragraph breaks while collapsing redundant whitespace."""
        raw_markdown = (
            "# Main Heading   \n"
            "\n\n\n\n"
            "Paragraph one   with    excessive    horizontal     spaces.   \n"
            "\n\n\n"
            "## Subheading\n"
            "\n"
            "Paragraph two under the subheading.\n"
            "- List item 1\n"
            "- List item 2\n"
        )

        cleaned = content_normalizer.clean_markdown_text(raw_markdown)

        # Headings preserved
        assert "# Main Heading" in cleaned
        assert "## Subheading" in cleaned
        # Horizontal spaces collapsed
        assert "Paragraph one with excessive horizontal spaces." in cleaned
        # Consecutive newlines collapsed to standard double-newline
        assert "\n\n\n" not in cleaned
        assert "Paragraph one with excessive horizontal spaces.\n\n## Subheading" in cleaned
        # List preserved
        assert "- List item 1\n- List item 2" in cleaned

    def test_code_block_indentation_preserved(self):
        """Code block indentation must be preserved while surrounding text is normalized."""
        raw_markdown = (
            "# Python Sample\n\n"
            "Here is the function:   \n\n"
            "```python\n"
            "def add(a, b):\n"
            "    # Indented block\n"
            "    result = a + b\n"
            "    return result\n"
            "```\n\n"
            "End of sample.   \n"
        )

        cleaned = content_normalizer.clean_markdown_text(raw_markdown)

        assert "    # Indented block" in cleaned
        assert "    return result" in cleaned
        assert "End of sample." in cleaned

    def test_duplicate_pages_by_canonical_url(self):
        """Pages with identical canonical URLs (differing only by trailing slash or query params) are deduplicated."""
        pages = [
            {"url": "https://example.com/about", "markdown": "# About Us\n\nWe are a software company."},
            {"url": "https://example.com/about/", "markdown": "# About Us\n\nWe are a software company."},
            {"url": "https://example.com/about?utm_source=twitter", "markdown": "# About Us\n\nWe are a software company."},
        ]

        result = content_normalizer.normalize_pages(pages)

        assert result.stats.total_input_pages == 3
        assert result.stats.usable_pages == 1
        assert result.stats.duplicate_pages_discarded == 2
        assert len(result.records) == 1
        assert result.records[0].canonical_url == "https://example.com/about"

    def test_duplicate_pages_by_content_hash(self):
        """Different URLs that have identical body content (e.g. aliases / redirects) are deduplicated."""
        pages = [
            {"url": "https://example.com/home", "markdown": "# Welcome\n\nThis is the homepage of our website."},
            {"url": "https://example.com/index.html", "markdown": "# Welcome\n\nThis is the homepage of our website."},
        ]

        result = content_normalizer.normalize_pages(pages)

        assert result.stats.total_input_pages == 2
        assert result.stats.usable_pages == 1
        assert result.stats.duplicate_pages_discarded == 1

    def test_malformed_crawler_output_handling(self):
        """Non-dict inputs, missing URLs, or corrupted entries should be safely counted as malformed."""
        pages = [
            None,
            "not a dict or object",
            12345,
            {"url": "", "markdown": "# Valid Title\n\nSome content here."},
            {"markdown": "# Missing URL\n\nContent without URL."},
            {"url": "https://example.com/valid", "markdown": "# Valid\n\nLegitimate page content."},
        ]

        result = content_normalizer.normalize_pages(pages)

        assert result.stats.total_input_pages == 6
        assert result.stats.usable_pages == 1
        assert result.stats.malformed_pages_discarded == 5
        assert result.records[0].source_url == "https://example.com/valid"

    def test_source_url_and_canonical_url_retention(self):
        """Both raw source_url and normalized canonical_url must be retained on records."""
        raw_url = "https://example.com/pricing/?utm_campaign=winter#monthly"
        page = {
            "url": raw_url,
            "title": "Pricing Plans",
            "markdown": "# Pricing\n\nOur plans start at $10/month with great features.",
            "status_code": 200,
        }

        result = content_normalizer.normalize_pages([page])

        assert result.stats.usable_pages == 1
        record = result.records[0]
        assert record.source_url == raw_url
        assert record.canonical_url == "https://example.com/pricing"
        assert record.title == "Pricing Plans"
        assert record.metadata["status_code"] == 200
        assert record.metadata["character_count"] > 0
        assert record.metadata["word_count"] > 0
        assert isinstance(record.extracted_at, datetime)
        assert record.extracted_at.tzinfo == timezone.utc

    def test_title_fallback_to_h1(self):
        """If title is missing, it falls back to the first H1 in the markdown content."""
        page = {
            "url": "https://example.com/guide",
            "title": None,
            "markdown": "# Comprehensive User Guide\n\nDetailed instructions for the platform.",
        }

        result = content_normalizer.normalize_pages([page])

        assert result.records[0].title == "Comprehensive User Guide"

    def test_statistics_sum_matches_total(self):
        """Verifies that usable + empty + duplicate + malformed equals total_input_pages."""
        pages = [
            {"url": "https://example.com/page1", "markdown": "# Page 1\n\nUsable content for testing."},
            {"url": "https://example.com/page1/", "markdown": "# Page 1\n\nDuplicate of page 1."},
            {"url": "https://example.com/empty", "markdown": ""},
            {"invalid": "no url"},
        ]

        result = content_normalizer.normalize_pages(pages)
        stats = result.stats

        assert stats.total_input_pages == 4
        assert stats.usable_pages == 1
        assert stats.duplicate_pages_discarded == 1
        assert stats.empty_pages_discarded == 1
        assert stats.malformed_pages_discarded == 1
        assert (
            stats.usable_pages
            + stats.empty_pages_discarded
            + stats.duplicate_pages_discarded
            + stats.malformed_pages_discarded
            == stats.total_input_pages
        )

    def test_works_with_multipage_crawl_result_object(self):
        """Accepts a MultiPageCrawlResult instance directly and normalizes its successful_pages."""
        crawl_result = MultiPageCrawlResult(
            starting_url="https://example.com",
            max_pages_requested=5,
            total_discovered=3,
            total_processed=3,
            successful_count=2,
            failed_count=1,
            successful_pages=[
                CrawlResult(
                    url="https://example.com",
                    title="Homepage",
                    markdown="# Home\n\nWelcome to our company website.",
                    clean_text="Home Welcome to our company website.",
                    success=True,
                    status_code=200,
                ),
                CrawlResult(
                    url="https://example.com/contact",
                    title="Contact",
                    markdown="# Contact Us\n\nEmail us at support@example.com anytime.",
                    clean_text="Contact Us Email us at support@example.com anytime.",
                    success=True,
                    status_code=200,
                ),
            ],
        )

        norm_result = content_normalizer.normalize_pages(crawl_result)

        assert norm_result.stats.total_input_pages == 2
        assert norm_result.stats.usable_pages == 2
        assert len(norm_result.records) == 2
        assert norm_result.records[0].source_url == "https://example.com"
        assert norm_result.records[1].source_url == "https://example.com/contact"
