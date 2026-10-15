import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.services.chunker import ContentChunk
from app.services.embedding import (
    VoyageEmbeddingService,
    EmbeddedChunk,
    BatchEmbeddingResult,
    QueryEmbeddingResult,
    EmbeddingConfigurationError,
    EmbeddingGenerationError,
    VOYAGE_MODEL_DIMENSIONS,
)


class DummyVoyageResponse:
    """Mock response matching the Voyage AI client API."""
    def __init__(self, embeddings, total_tokens=42):
        self.embeddings = embeddings
        self.total_tokens = total_tokens


class TestVoyageEmbeddingService:
    """Unit test suite for Step 10: Voyage AI vector embedding service."""

    @pytest.fixture
    def sample_chunks(self):
        return [
            ContentChunk(
                chunk_id="chk_001",
                source_url="https://example.com/docs",
                canonical_url="https://example.com/docs",
                title="Documentation",
                content="Instant Bot indexes web pages into high-dimensional vectors.",
                chunk_index=0,
                token_count=10,
                char_count=65,
                metadata={"status_code": 200, "page_type": "docs"},
            ),
            ContentChunk(
                chunk_id="chk_002",
                source_url="https://example.com/docs",
                canonical_url="https://example.com/docs",
                title="Documentation",
                content="Dense vector embeddings represent semantic meaning numerically.",
                chunk_index=1,
                token_count=8,
                char_count=64,
                metadata={"status_code": 200, "page_type": "docs"},
            ),
        ]

    def test_empty_chunks_returns_empty_result_without_api_call(self):
        """Passing an empty list of chunks must return immediately with 0 tokens and no API calls."""
        service = VoyageEmbeddingService(api_key="mock-key", model="voyage-3")

        with patch.object(service, "_get_client") as mock_get_client:
            result = service.embed_chunks([])
            assert result.success is True
            assert result.embedded_chunks == []
            assert result.stats.total_chunks == 0
            assert result.stats.total_tokens_used == 0
            assert result.stats.dimensions == 1024
            mock_get_client.assert_not_called()

    def test_missing_api_key_raises_configuration_error(self, sample_chunks, monkeypatch):
        """Attempting to embed without an API key must raise a clear EmbeddingConfigurationError."""
        monkeypatch.delenv("VOYAGE_API_KEY", raising=False)
        service = VoyageEmbeddingService(api_key=None, model="voyage-3")

        with pytest.raises(EmbeddingConfigurationError) as exc_info:
            service.embed_chunks(sample_chunks)

        assert "VOYAGE_API_KEY is not configured" in str(exc_info.value)

    def test_batch_embedding_dimensionality_and_metadata_preservation(self, sample_chunks):
        """Verifies that 1024-dimension vectors are generated and all chunk metadata is preserved."""
        service = VoyageEmbeddingService(api_key="mock-test-key", model="voyage-3")

        # Mock Voyage AI 1024-dimensional embedding output
        mock_vector_1 = [0.01 * (i % 10) for i in range(1024)]
        mock_vector_2 = [0.02 * (i % 10) for i in range(1024)]
        mock_client = MagicMock()
        mock_client.embed.return_value = DummyVoyageResponse(
            embeddings=[mock_vector_1, mock_vector_2],
            total_tokens=18,
        )

        with patch.object(service, "_get_client", return_value=mock_client):
            result = service.embed_chunks(sample_chunks)

        assert result.success is True
        assert len(result.embedded_chunks) == 2
        assert result.stats.total_chunks == 2
        assert result.stats.total_tokens_used == 18
        assert result.stats.dimensions == 1024
        assert result.stats.model_name == "voyage-3"

        # Verify chunk 0
        c0 = result.embedded_chunks[0]
        assert c0.chunk_id == "chk_001"
        assert c0.source_url == "https://example.com/docs"
        assert c0.canonical_url == "https://example.com/docs"
        assert c0.title == "Documentation"
        assert c0.dimensions == 1024
        assert len(c0.embedding) == 1024
        assert isinstance(c0.embedding[0], float)
        assert c0.metadata["page_type"] == "docs"

        # Verify chunk 1
        c1 = result.embedded_chunks[1]
        assert c1.chunk_id == "chk_002"
        assert c1.dimensions == 1024
        assert len(c1.embedding) == 1024

        # Verify input_type='document' was passed for document indexing
        mock_client.embed.assert_called_once()
        _, kwargs = mock_client.embed.call_args
        assert kwargs["input_type"] == "document"
        assert kwargs["model"] == "voyage-3"

    def test_model_dimensions_mapping(self):
        """Verifies that documented model dimensions match Voyage AI specifications."""
        assert VOYAGE_MODEL_DIMENSIONS["voyage-3"] == 1024
        assert VOYAGE_MODEL_DIMENSIONS["voyage-3-lite"] == 512
        assert VOYAGE_MODEL_DIMENSIONS["voyage-code-2"] == 1536

        service_lite = VoyageEmbeddingService(api_key="mock", model="voyage-3-lite")
        assert service_lite.get_expected_dimensions() == 512

    def test_batch_slicing_splits_large_batches(self):
        """Batches larger than batch_size must be sliced across multiple API calls."""
        # Create 5 small chunks with batch_size=2
        chunks = [
            ContentChunk(
                chunk_id=f"chk_{i}",
                source_url="https://example.com",
                canonical_url="https://example.com",
                content=f"Text content number {i}",
                chunk_index=i,
                token_count=5,
                char_count=20,
            )
            for i in range(5)
        ]

        service = VoyageEmbeddingService(api_key="mock", model="voyage-3", batch_size=2)
        mock_client = MagicMock()
        # Mock responses for slices: 2, 2, 1 items
        mock_client.embed.side_effect = [
            DummyVoyageResponse(embeddings=[[0.1] * 1024, [0.2] * 1024], total_tokens=10),
            DummyVoyageResponse(embeddings=[[0.3] * 1024, [0.4] * 1024], total_tokens=10),
            DummyVoyageResponse(embeddings=[[0.5] * 1024], total_tokens=5),
        ]

        with patch.object(service, "_get_client", return_value=mock_client):
            result = service.embed_chunks(chunks)

        assert mock_client.embed.call_count == 3
        assert len(result.embedded_chunks) == 5
        assert result.stats.total_tokens_used == 25

    def test_embed_query_uses_query_input_type(self):
        """Embedding a query must use input_type='query' and return QueryEmbeddingResult."""
        service = VoyageEmbeddingService(api_key="mock-key", model="voyage-3")
        mock_client = MagicMock()
        mock_client.embed.return_value = DummyVoyageResponse(
            embeddings=[[0.5] * 1024],
            total_tokens=4,
        )

        with patch.object(service, "_get_client", return_value=mock_client):
            q_res = service.embed_query("How does website ingestion work?")

        assert isinstance(q_res, QueryEmbeddingResult)
        assert q_res.query == "How does website ingestion work?"
        assert q_res.dimensions == 1024
        assert len(q_res.embedding) == 1024
        assert q_res.token_count == 4

        _, kwargs = mock_client.embed.call_args
        assert kwargs["input_type"] == "query"

    def test_empty_query_raises_value_error(self):
        """Empty or whitespace-only queries must raise ValueError."""
        service = VoyageEmbeddingService(api_key="mock-key")
        with pytest.raises(ValueError):
            service.embed_query("")
        with pytest.raises(ValueError):
            service.embed_query("   ")

    def test_api_key_masking(self):
        """API keys must be masked so secrets are never exposed in logs."""
        assert VoyageEmbeddingService._mask_key(None) == "<not-set>"
        assert VoyageEmbeddingService._mask_key("") == "<not-set>"
        assert VoyageEmbeddingService._mask_key("1234") == "***"
        masked = VoyageEmbeddingService._mask_key("pa-voyage-secret-token-123456789")
        assert "secret" not in masked
        assert masked == "pa-v...6789"

    @pytest.mark.asyncio
    async def test_async_batch_embedding(self, sample_chunks):
        """Verifies asynchronous embedding batch processing."""
        service = VoyageEmbeddingService(api_key="mock-async-key", model="voyage-3")

        mock_vector = [0.1] * 1024
        mock_async_client = MagicMock()
        mock_async_client.embed = AsyncMock(
            return_value=DummyVoyageResponse(
                embeddings=[mock_vector, mock_vector],
                total_tokens=20,
            )
        )

        with patch.object(service, "_get_async_client", return_value=mock_async_client):
            result = await service.aembed_chunks(sample_chunks)

        assert result.success is True
        assert len(result.embedded_chunks) == 2
        assert result.stats.dimensions == 1024
        assert mock_async_client.embed.called
