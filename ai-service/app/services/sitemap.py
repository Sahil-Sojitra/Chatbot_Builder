"""Lightweight asynchronous sitemap discovery and parsing service."""

import logging
import re
import xml.etree.ElementTree as ET
from typing import List, Optional, Set, Tuple
from urllib.parse import urlparse

import httpx

from app.core.url_utils import get_url_priority
from app.services.link_discovery import is_eligible_internal_link, normalize_url
from app.services.security import SSRFValidationError, validate_safe_url

logger = logging.getLogger(__name__)

DEFAULT_SITEMAP_TIMEOUT_SECONDS: float = 6.0
MAX_SITEMAP_FETCHES: int = 5  # Cap nested sitemap index fetches to avoid recursion bombs


class SitemapService:
    """Asynchronous XML sitemap parser and discoverer.

    Features:
    - Checks standard locations: /sitemap.xml, /sitemap_index.xml, and robots.txt.
    - Handles nested <sitemapindex> and standard <urlset>.
    - Strips XML namespaces for robust element extraction.
    - SSRF pre-flight validation on all outbound requests and discovered links.
    - Domain boundary validation and URL deduplication.
    - Prioritizes extracted URLs via get_url_priority.
    """

    def __init__(self, timeout_seconds: float = DEFAULT_SITEMAP_TIMEOUT_SECONDS):
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def _strip_ns(tag: str) -> str:
        """Strip XML namespace prefix from element tag: e.g. '{http://...}url' -> 'url'."""
        if "}" in tag:
            return tag.split("}", 1)[1]
        return tag

    def parse_sitemap_xml(
        self, xml_content: str, base_url: str
    ) -> Tuple[List[str], List[str]]:
        """Parses sitemap XML string into page URLs and nested sub-sitemap URLs.

        Returns:
            Tuple of (page_urls, sub_sitemap_urls).
        """
        page_urls: List[str] = []
        sub_sitemaps: List[str] = []

        if not xml_content or not xml_content.strip():
            return page_urls, sub_sitemaps

        try:
            root = ET.fromstring(xml_content.strip())
        except ET.ParseError as exc:
            logger.debug(f"Failed to parse sitemap XML: {exc}")
            return page_urls, sub_sitemaps

        root_tag = self._strip_ns(root.tag).lower()

        # Handle sitemap index: <sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>
        if root_tag == "sitemapindex":
            for sitemap_elem in root:
                if self._strip_ns(sitemap_elem.tag).lower() == "sitemap":
                    for child in sitemap_elem:
                        if self._strip_ns(child.tag).lower() == "loc" and child.text:
                            loc_url = child.text.strip()
                            norm = normalize_url(loc_url, base_url, strip_tracking_params=True)
                            if norm:
                                sub_sitemaps.append(norm)

        # Handle standard urlset: <urlset><url><loc>...</loc></url></urlset>
        elif root_tag == "urlset":
            for url_elem in root:
                if self._strip_ns(url_elem.tag).lower() == "url":
                    for child in url_elem:
                        if self._strip_ns(child.tag).lower() == "loc" and child.text:
                            loc_url = child.text.strip()
                            norm = normalize_url(loc_url, base_url, strip_tracking_params=True)
                            if norm and is_eligible_internal_link(norm, base_url):
                                page_urls.append(norm)

        return page_urls, sub_sitemaps

    def extract_robots_sitemaps(self, robots_txt: str, base_url: str) -> List[str]:
        """Extracts Sitemap: directives from a robots.txt body."""
        sitemap_urls: List[str] = []
        if not robots_txt:
            return sitemap_urls

        for line in robots_txt.splitlines():
            line_str = line.strip()
            if line_str.lower().startswith("sitemap:"):
                raw_url = line_str.split(":", 1)[1].strip()
                norm = normalize_url(raw_url, base_url)
                if norm:
                    sitemap_urls.append(norm)

        return sitemap_urls

    async def _fetch_text_safely(
        self, client: httpx.AsyncClient, target_url: str
    ) -> Optional[str]:
        """Fetches text content from target URL with SSRF validation and timeout."""
        try:
            safe_url, _ = validate_safe_url(target_url, resolve_dns=True)
        except SSRFValidationError as err:
            logger.warning(f"Blocked SSRF sitemap attempt for {target_url}: {err}")
            return None
        except Exception:
            return None

        try:
            response = await client.get(
                safe_url,
                timeout=self.timeout_seconds,
                headers={"User-Agent": "ChatbotBuilder-SitemapCrawler/1.0"},
                follow_redirects=True,
            )
            if response.status_code == 200:
                return response.text
        except Exception as exc:
            logger.debug(f"Failed to fetch sitemap from {target_url}: {exc}")

        return None

    async def discover_sitemap_urls(
        self, starting_url: str, max_links: int = 50
    ) -> List[str]:
        """Discovers internal webpage URLs from the target website's sitemap.

        Checks:
        1. /sitemap.xml
        2. /sitemap_index.xml
        3. /robots.txt (extracting Sitemap: lines)
        And follows up to MAX_SITEMAP_FETCHES sub-sitemaps if a sitemap index is encountered.
        """
        parsed = urlparse(starting_url)
        origin = f"{parsed.scheme}://{parsed.netloc}"

        candidate_sitemaps: List[str] = [
            f"{origin}/sitemap.xml",
            f"{origin}/sitemap_index.xml",
        ]

        discovered_page_urls: Set[str] = set()
        visited_sitemaps: Set[str] = set()
        sitemap_queue: List[str] = []

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            # 1. Check robots.txt for custom sitemap declarations
            robots_txt = await self._fetch_text_safely(client, f"{origin}/robots.txt")
            if robots_txt:
                for sm_url in self.extract_robots_sitemaps(robots_txt, starting_url):
                    if sm_url not in candidate_sitemaps:
                        candidate_sitemaps.append(sm_url)

            sitemap_queue.extend(candidate_sitemaps)

            # 2. Process sitemap queue
            fetches = 0
            while sitemap_queue and fetches < MAX_SITEMAP_FETCHES and len(discovered_page_urls) < max_links * 2:
                current_sitemap = sitemap_queue.pop(0)
                if current_sitemap in visited_sitemaps:
                    continue
                visited_sitemaps.add(current_sitemap)

                xml_text = await self._fetch_text_safely(client, current_sitemap)
                fetches += 1

                if not xml_text:
                    continue

                page_urls, sub_sitemaps = self.parse_sitemap_xml(xml_text, starting_url)

                for p_url in page_urls:
                    discovered_page_urls.add(p_url)

                for sub_sm in sub_sitemaps:
                    if sub_sm not in visited_sitemaps and sub_sm not in sitemap_queue:
                        sitemap_queue.append(sub_sm)

                # If we successfully found page links from /sitemap.xml or an index,
                # we don't necessarily need to probe fallback /sitemap_index.xml
                if len(discovered_page_urls) >= max_links:
                    break

        # Sort discovered page URLs by importance (e.g. priority heuristics)
        sorted_urls = sorted(discovered_page_urls, key=get_url_priority)
        final_list = sorted_urls[:max_links]

        logger.info(
            f"Sitemap discovery for '{starting_url}': found {len(discovered_page_urls)} pages "
            f"across {len(visited_sitemaps)} sitemaps, returning top {len(final_list)}."
        )

        return final_list


# Global instance
sitemap_service = SitemapService()
