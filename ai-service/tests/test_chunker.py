import pytest

from app.services.chunker import (
    chunker_service,
    ContentChunk,
    ChunkingResult,
    ChunkingStats,
)
from app.services.content_normalizer import (
    NormalizedPageRecord,
    NormalizationResult,
    ContentNormalizationStats,
)


class TestContentChunker:
    """Test suite validating Step 9 chunking and text-splitting behavior."""

    def test_short_content_produces_single_chunk(self):
        """Pages with token counts below target chunk size must produce exactly 1 chunk."""
        page = NormalizedPageRecord(
            source_url="https://example.com/about",
            canonical_url="https://example.com/about",
            title="About Us",
            content="# About Us\n\nWe build conversational AI agents for modern web applications.",
            metadata={"status_code": 200},
        )

        chunks = chunker_service.chunk_page(page, chunk_size=500, chunk_overlap=100)

        assert len(chunks) == 1
        chunk = chunks[0]
        assert chunk.chunk_index == 0
        assert chunk.source_url == "https://example.com/about"
        assert chunk.canonical_url == "https://example.com/about"
        assert chunk.title == "About Us"
        assert chunk.token_count > 0
        assert chunk.token_count <= 500
        assert page.content in chunk.content
        assert chunk.chunk_id.startswith("chk_")

    def test_long_content_splits_into_multiple_bounded_chunks(self):
        """Long articles exceeding 500 tokens must split into multiple chunks under the token limit."""
        # Generate ~1000 tokens of text
        sentence = "Artificial intelligence and natural language processing empower enterprise chatbots to answer customer queries. "
        long_content = "# Overview\n\n" + (sentence * 65)

        page = NormalizedPageRecord(
            source_url="https://example.com/docs",
            canonical_url="https://example.com/docs",
            title="AI Documentation",
            content=long_content,
        )

        chunks = chunker_service.chunk_page(page, chunk_size=500, chunk_overlap=100)

        assert len(chunks) >= 2
        for i, chunk in enumerate(chunks):
            assert chunk.chunk_index == i
            assert chunk.source_url == page.source_url
            assert chunk.canonical_url == page.canonical_url
            assert chunk.title == page.title
            assert chunk.token_count <= 510  # Token limit respected (small variance on boundary)
            assert chunk.token_count >= chunker_service.MIN_CHUNK_TOKENS
            assert not chunk.content.endswith(" ")  # Clean boundary
            assert not chunk.content.startswith(" ")

    def test_consecutive_chunks_have_overlap(self):
        """Consecutive chunks must share overlapping context to prevent losing semantic meaning across boundaries."""
        sentences = [
            f"Fact number {i}: Enterprise chatbots need reliable knowledge bases to function correctly."
            for i in range(1, 40)
        ]
        text = "\n\n".join(sentences)

        page = NormalizedPageRecord(
            source_url="https://example.com/facts",
            canonical_url="https://example.com/facts",
            title="Chatbot Facts",
            content=text,
        )

        # Use smaller chunk_size to deliberately test overlap between chunks
        chunks = chunker_service.chunk_page(page, chunk_size=80, chunk_overlap=30)

        assert len(chunks) >= 3
        # Check that chunk 0 and chunk 1 share text
        tail_of_chunk_0 = chunks[0].content[-40:]
        assert any(
            phrase in chunks[1].content
            for phrase in tail_of_chunk_0.split(". ")
            if len(phrase.strip()) > 15
        )

    def test_empty_content_produces_no_chunks(self):
        """Empty strings, whitespace-only, or negligible fragments must not create chunks."""
        empty_page = NormalizedPageRecord(
            source_url="https://example.com/empty",
            canonical_url="https://example.com/empty",
            title="Empty",
            content="     \n\n\t   ",
        )
        trivial_page = NormalizedPageRecord(
            source_url="https://example.com/trivial",
            canonical_url="https://example.com/trivial",
            title="Trivial",
            content="Hi",
        )

        assert chunker_service.chunk_page(empty_page) == []
        assert chunker_service.chunk_page(trivial_page) == []

        result = chunker_service.chunk_pages([empty_page, trivial_page])
        assert result.chunks == []
        assert result.stats.empty_pages_skipped == 2
        assert result.stats.total_chunks_created == 0

    def test_metadata_and_urls_preserved_on_all_chunks(self):
        """Original URLs, titles, and extra metadata keys must be retained on every chunk."""
        page = NormalizedPageRecord(
            source_url="https://example.com/pricing/?utm_campaign=winter",
            canonical_url="https://example.com/pricing",
            title="Pricing Table",
            content="# Pricing\n\nBasic is $10. Pro is $20. Enterprise is custom.",
            metadata={"status_code": 200, "author": "Product Team"},
        )

        chunks = chunker_service.chunk_page(page)

        assert len(chunks) == 1
        chunk = chunks[0]
        assert chunk.source_url == "https://example.com/pricing/?utm_campaign=winter"
        assert chunk.canonical_url == "https://example.com/pricing"
        assert chunk.title == "Pricing Table"
        assert chunk.metadata["status_code"] == 200
        assert chunk.metadata["author"] == "Product Team"
        assert chunk.metadata["chunk_index"] == 0
        assert "token_count" in chunk.metadata

    def test_deterministic_stable_chunk_id(self):
        """Chunk IDs must be deterministic (running on identical content yields identical IDs)."""
        content = "# Guide\n\nDeterministic chunking is essential for idempotent storage."
        url = "https://example.com/guide"

        id1 = chunker_service.generate_chunk_id(url, 0, content)
        id2 = chunker_service.generate_chunk_id(url, 0, content)
        id_different_index = chunker_service.generate_chunk_id(url, 1, content)
        id_different_content = chunker_service.generate_chunk_id(url, 0, content + " Updated")

        assert id1 == id2
        assert id1 != id_different_index
        assert id1 != id_different_content
        assert id1.startswith("chk_")

    def test_statistics_calculation_on_batch(self):
        """Verifies summary statistics (averages, min, max, page counts)."""
        pages = [
            NormalizedPageRecord(
                source_url="https://example.com/p1",
                canonical_url="https://example.com/p1",
                title="Page 1",
                content="# Page 1\n\nShort content about AI.",
            ),
            NormalizedPageRecord(
                source_url="https://example.com/p2",
                canonical_url="https://example.com/p2",
                title="Page 2",
                content="# Page 2\n\n" + ("Longer descriptive text explaining features in detail. " * 50),
            ),
            NormalizedPageRecord(
                source_url="https://example.com/empty",
                canonical_url="https://example.com/empty",
                title="Empty",
                content="",
            ),
        ]

        result = chunker_service.chunk_pages(pages, chunk_size=300, chunk_overlap=50)
        stats = result.stats

        assert stats.total_pages_processed == 3
        assert stats.empty_pages_skipped == 1
        assert stats.total_chunks_created >= 2
        assert stats.min_tokens > 0
        assert stats.max_tokens >= stats.min_tokens
        assert stats.avg_tokens_per_chunk >= stats.min_tokens
        assert stats.avg_tokens_per_chunk <= stats.max_tokens

    def test_accepts_normalization_result_directly(self):
        """Seamless integration: accepts NormalizationResult from Step 8 without manual extraction."""
        norm_result = NormalizationResult(
            records=[
                NormalizedPageRecord(
                    source_url="https://example.com/api",
                    canonical_url="https://example.com/api",
                    title="API Reference",
                    content="# API Reference\n\nGET /v1/chat endpoint specifications.",
                ),
                NormalizedPageRecord(
                    source_url="https://example.com/sdk",
                    canonical_url="https://example.com/sdk",
                    title="Python SDK",
                    content="# Python SDK\n\npip install my-chatbot-sdk.",
                ),
            ],
            stats=ContentNormalizationStats(
                total_input_pages=2,
                usable_pages=2,
                empty_pages_discarded=0,
                duplicate_pages_discarded=0,
                malformed_pages_discarded=0,
            ),
        )

        chunk_result = chunker_service.chunk_pages(norm_result)

        assert chunk_result.success is True
        assert chunk_result.stats.total_pages_processed == 2
        assert chunk_result.stats.total_chunks_created == 2
        assert len(chunk_result.chunks) == 2
        assert chunk_result.chunks[0].title == "API Reference"
        assert chunk_result.chunks[1].title == "Python SDK"

    def test_gemini_offline_tokenizer_token_counting(self):
        """Verifies that the local Google Gemini tokenizer correctly counts tokens offline."""
        from app.services.chunker import ContentChunker

        chunker = ContentChunker()
        sample_text = "Instant Bot builds conversational AI agents using Google Gemini embeddings."
        token_count = chunker.count_tokens(sample_text)

        assert token_count > 0
        assert token_count == 11  # Exact BPE token count in Gemini 256k vocabulary


