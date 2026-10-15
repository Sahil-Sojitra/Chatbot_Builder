import hashlib
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Union
from pydantic import BaseModel, Field

from app.services.link_discovery import normalize_url


class NormalizedPageRecord(BaseModel):
    """Cleaned and normalized page content record ready for chunking and vector storage."""

    source_url: str = Field(..., description="The original raw URL visited by the crawler.")
    canonical_url: str = Field(..., description="Normalized and canonicalized page URL.")
    title: Optional[str] = Field(None, description="Extracted or inferred page title.")
    content: str = Field(..., description="Cleaned Markdown or text content with headings preserved.")
    extracted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when the content record was extracted and normalized.",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Crawl metadata including character count, word count, status code, and content hash.",
    )


class ContentNormalizationStats(BaseModel):
    """Detailed statistics summarizing the content normalization batch operation."""

    total_input_pages: int = Field(0, description="Total number of page records received for processing.")
    usable_pages: int = Field(0, description="Number of valid, non-empty, unique pages retained.")
    empty_pages_discarded: int = Field(0, description="Pages discarded because they contained no meaningful text.")
    duplicate_pages_discarded: int = Field(0, description="Pages discarded due to duplicate URLs or identical content.")
    malformed_pages_discarded: int = Field(0, description="Pages discarded due to invalid structure or missing URL.")


class NormalizationResult(BaseModel):
    """Structured batch result returned by the content normalization service."""

    records: List[NormalizedPageRecord] = Field(default_factory=list)
    stats: ContentNormalizationStats
    success: bool = True


class ContentNormalizer:
    """Service responsible for cleaning, sanitizing, and deduplicating crawled web pages.

    Ensures downstream ingestion, chunking, and RAG pipelines receive high-quality,
    noise-free content with preserved headings and structure.
    """

    MIN_MEANINGFUL_CHAR_COUNT: int = 15

    # Common standalone noise patterns (cookie banners, skip links, scroll links, empty links)
    NOISE_PATTERNS: List[re.Pattern] = [
        re.compile(r"^\s*(?:skip to (?:main )?content|back to top|scroll to top)\s*$", re.IGNORECASE),
        re.compile(
            r"^\s*(?:accept (?:all )?cookies|cookie (?:settings|preferences|policy)|manage (?:cookies|consent)|privacy preferences)\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^\s*(?:we (?:value your privacy|use cookies to enhance|respect your privacy)).*$",
            re.IGNORECASE,
        ),
        # Empty markdown images or links e.g. ![]() or []()
        re.compile(r"^\s*(?:!\[\s*\]\(\s*\)|\[\s*\]\(\s*\))\s*$"),
    ]

    def clean_markdown_text(self, raw_text: Optional[str]) -> str:
        """Sanitizes text/markdown content:

        1. Removes boilerplate noise (cookie popups, skip links, empty links).
        2. Normalizes horizontal spaces while preserving code block indentation.
        3. Preserves headings (# Heading) and paragraph boundaries (\n\n).
        4. Collapses excessive newlines (3+ -> 2).
        """
        if not raw_text or not isinstance(raw_text, str):
            return ""

        lines = raw_text.splitlines()
        cleaned_lines: List[str] = []
        in_code_block: bool = False

        for line in lines:
            stripped = line.strip()

            # Detect code fence toggles (``` or ~~~)
            if stripped.startswith("```") or stripped.startswith("~~~"):
                in_code_block = not in_code_block
                cleaned_lines.append(stripped)
                continue

            # Within code blocks, preserve exact indentation and content
            if in_code_block:
                cleaned_lines.append(line.rstrip())
                continue

            # Check if line matches any noise pattern
            if any(pattern.match(stripped) for pattern in self.NOISE_PATTERNS):
                continue

            # Outside code blocks, normalize horizontal whitespace
            if stripped:
                # Collapse multiple spaces/tabs into a single space
                normalized_line = re.sub(r"[ \t]+", " ", line).strip()
                cleaned_lines.append(normalized_line)
            else:
                # Empty line representing paragraph break
                cleaned_lines.append("")

        # Join lines and collapse 3+ consecutive newlines to standard double newline (\n\n)
        joined = "\n".join(cleaned_lines)
        normalized = re.sub(r"\n{3,}", "\n\n", joined).strip()
        return normalized

    def extract_title(self, raw_title: Optional[str], content: str) -> Optional[str]:
        """Returns the page title, falling back to the first H1 markdown heading if available."""
        if raw_title and isinstance(raw_title, str) and raw_title.strip():
            # Clean up title (remove trailing/leading space, collapse multiple spaces)
            return re.sub(r"\s+", " ", raw_title).strip()

        # Fallback: look for '# Heading' at the beginning of content
        first_line = content.splitlines()[0].strip() if content.splitlines() else ""
        if first_line.startswith("# ") and not first_line.startswith("## "):
            return first_line[2:].strip()

        return None

    def compute_content_hash(self, text: str) -> str:
        """Computes a SHA-256 hash of the normalized content for exact duplicate detection."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def normalize_single_record(
        self,
        page_data: Any,
    ) -> Optional[NormalizedPageRecord]:
        """Processes a single raw page record into a NormalizedPageRecord.

        Returns None if the record is malformed or empty.
        """
        # 1. Extract raw fields from dict or Pydantic object
        source_url: Optional[str] = None
        raw_title: Optional[str] = None
        raw_content: Optional[str] = None
        status_code: Optional[int] = None
        extra_meta: Dict[str, Any] = {}

        if isinstance(page_data, dict):
            source_url = page_data.get("url")
            raw_title = page_data.get("title")
            raw_content = page_data.get("markdown") or page_data.get("clean_text") or page_data.get("content")
            status_code = page_data.get("status_code")
            extra_meta = {k: v for k, v in page_data.items() if k not in ("url", "title", "markdown", "clean_text", "content")}
        elif hasattr(page_data, "url"):
            source_url = getattr(page_data, "url", None)
            raw_title = getattr(page_data, "title", None)
            raw_content = getattr(page_data, "markdown", None) or getattr(page_data, "clean_text", None)
            status_code = getattr(page_data, "status_code", None)
            if hasattr(page_data, "metadata") and isinstance(page_data.metadata, dict):
                extra_meta = dict(page_data.metadata)
        else:
            return None

        # 2. Validate URL
        if not source_url or not isinstance(source_url, str) or not source_url.strip():
            return None

        source_url = source_url.strip()
        canonical = normalize_url(source_url, source_url) or source_url

        # 3. Clean and sanitize content
        cleaned_content = self.clean_markdown_text(raw_content)
        if len(cleaned_content) < self.MIN_MEANINGFUL_CHAR_COUNT:
            return None

        # 4. Resolve Title
        title = self.extract_title(raw_title, cleaned_content)

        # 5. Compute metadata
        content_hash = self.compute_content_hash(cleaned_content)
        words = len(re.findall(r"\b\w+\b", cleaned_content))

        metadata: Dict[str, Any] = {
            "character_count": len(cleaned_content),
            "word_count": words,
            "status_code": status_code,
            "content_hash": content_hash,
            **extra_meta,
        }

        return NormalizedPageRecord(
            source_url=source_url,
            canonical_url=canonical,
            title=title,
            content=cleaned_content,
            metadata=metadata,
        )

    def normalize_pages(
        self,
        pages: Union[List[Any], Any],
    ) -> NormalizationResult:
        """Normalizes a list of page objects or a MultiPageCrawlResult.

        Deduplicates by canonical URL and content hash, filters out empty/noise-only pages,
        and returns detailed execution statistics.
        """
        # Handle MultiPageCrawlResult or dict with 'successful_pages'
        page_list: List[Any] = []
        if hasattr(pages, "successful_pages") and isinstance(pages.successful_pages, list):
            page_list = pages.successful_pages
        elif isinstance(pages, dict) and "successful_pages" in pages and isinstance(pages["successful_pages"], list):
            page_list = pages["successful_pages"]
        elif isinstance(pages, list):
            page_list = pages
        elif pages is not None:
            page_list = [pages]

        total_input = len(page_list)
        usable_records: List[NormalizedPageRecord] = []
        seen_canonical_urls: Set[str] = set()
        seen_content_hashes: Set[str] = set()

        empty_count = 0
        duplicate_count = 0
        malformed_count = 0

        for raw_page in page_list:
            # Check for malformed input
            if raw_page is None or not (isinstance(raw_page, dict) or hasattr(raw_page, "url")):
                malformed_count += 1
                continue

            # Extract source URL safely
            url = raw_page.get("url") if isinstance(raw_page, dict) else getattr(raw_page, "url", None)
            if not url or not isinstance(url, str) or not url.strip():
                malformed_count += 1
                continue

            # Check if canonical URL was already seen before doing heavy cleaning
            canonical = normalize_url(url.strip(), url.strip()) or url.strip()
            if canonical in seen_canonical_urls:
                duplicate_count += 1
                continue

            # Extract raw content
            if isinstance(raw_page, dict):
                raw_text = raw_page.get("markdown") or raw_page.get("clean_text") or raw_page.get("content")
            else:
                raw_text = getattr(raw_page, "markdown", None) or getattr(raw_page, "clean_text", None)

            # Check for empty content
            cleaned_content = self.clean_markdown_text(raw_text)
            if len(cleaned_content) < self.MIN_MEANINGFUL_CHAR_COUNT:
                empty_count += 1
                continue

            # Check for duplicate content (e.g. redirected or mirrored pages with different URLs)
            c_hash = self.compute_content_hash(cleaned_content)
            if c_hash in seen_content_hashes:
                duplicate_count += 1
                continue

            # Create normalized record
            title = self.extract_title(
                raw_page.get("title") if isinstance(raw_page, dict) else getattr(raw_page, "title", None),
                cleaned_content,
            )
            status_code = raw_page.get("status_code") if isinstance(raw_page, dict) else getattr(raw_page, "status_code", None)
            words = len(re.findall(r"\b\w+\b", cleaned_content))

            record = NormalizedPageRecord(
                source_url=url.strip(),
                canonical_url=canonical,
                title=title,
                content=cleaned_content,
                metadata={
                    "character_count": len(cleaned_content),
                    "word_count": words,
                    "status_code": status_code,
                    "content_hash": c_hash,
                },
            )

            seen_canonical_urls.add(canonical)
            seen_content_hashes.add(c_hash)
            usable_records.append(record)

        stats = ContentNormalizationStats(
            total_input_pages=total_input,
            usable_pages=len(usable_records),
            empty_pages_discarded=empty_count,
            duplicate_pages_discarded=duplicate_count,
            malformed_pages_discarded=malformed_count,
        )

        return NormalizationResult(
            records=usable_records,
            stats=stats,
            success=True,
        )


# Global singleton instance
content_normalizer = ContentNormalizer()
