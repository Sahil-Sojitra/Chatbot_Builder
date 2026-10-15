import pytest
from unittest.mock import MagicMock, patch

from app.services.embedding import EmbeddedChunk
from app.services.vector_store import (
    PineconeVectorStore,
    VectorSearchResult,
    VectorUpsertResult,
    VectorDeleteResult,
    VectorStoreConfigurationError,
    VectorStoreError,
)


class DummyMatch:
    """Mock match object returned by Pinecone index.query."""
    def __init__(self, match_id, score, metadata):
        self.id = match_id
        self.score = score
        self.metadata = metadata


class DummyQueryResponse:
    """Mock response returned by Pinecone index.query."""
    def __init__(self, matches):
        self.matches = matches


class TestPineconeVectorStore:
    """Unit test suite for Step 11: Pinecone vector store adapter with tenant isolation."""

    @pytest.fixture
    def sample_embedded_chunks(self):
        return [
            EmbeddedChunk(
                chunk_id="chk_001",
                source_url="https://example.com/pricing",
                canonical_url="https://example.com/pricing",
                title="Pricing Plans",
                content="Our pro plan is $10/month with unlimited messages.",
                chunk_index=0,
                embedding=[0.01] * 1024,
                dimensions=1024,
                token_count=10,
                metadata={"category": "pricing"},
            ),
            EmbeddedChunk(
                chunk_id="chk_002",
                source_url="https://example.com/features",
                canonical_url="https://example.com/features",
                title="Features Overview",
                content="Instant Bot integrates with websites and provides fast AI answers.",
                chunk_index=0,
                embedding=[0.02] * 1024,
                dimensions=1024,
                token_count=12,
                metadata={"category": "features"},
            ),
        ]

    def test_missing_api_key_raises_configuration_error(self, monkeypatch):
        """When no API key is set, accessing client or index raises VectorStoreConfigurationError."""
        monkeypatch.delenv("PINECONE_API_KEY", raising=False)
        monkeypatch.delenv("PINECONE_DB_API_KEY", raising=False)
        store = PineconeVectorStore(api_key=None, index_name="test-index")

        with pytest.raises(VectorStoreConfigurationError) as exc_info:
            store._get_client()

        assert "PINECONE_API_KEY is not configured" in str(exc_info.value)

    def test_health_check_returns_true_on_active_connection(self):
        """Verifies health_check returns True when describe_index_stats succeeds."""
        store = PineconeVectorStore(api_key="mock-key", index_name="test-index")
        mock_index = MagicMock()
        mock_index.describe_index_stats.return_value = {"total_vector_count": 42}

        with patch.object(store, "_get_index", return_value=mock_index):
            assert store.health_check() is True
            mock_index.describe_index_stats.assert_called_once()

    def test_health_check_returns_false_on_connection_error(self):
        """Verifies health_check returns False when an exception occurs."""
        store = PineconeVectorStore(api_key="mock-key", index_name="test-index")

        with patch.object(store, "_get_index", side_effect=Exception("Connection refused")):
            assert store.health_check() is False

    def test_upsert_chunks_with_hard_namespace_isolation(self, sample_embedded_chunks):
        """Validates that vectors are upserted into Pinecone with exact metadata and namespace=chatbot_id."""
        store = PineconeVectorStore(api_key="mock-key", index_name="test-index")
        mock_index = MagicMock()

        chunks = sample_embedded_chunks

        with patch.object(store, "_get_index", return_value=mock_index):
            result = store.upsert_chunks(chatbot_id="bot_abc_123", chunks=chunks)

        assert result.success is True
        assert result.chatbot_id == "bot_abc_123"
        assert result.upserted_count == 2

        # Check call arguments to mock_index.upsert
        mock_index.upsert.assert_called_once()
        _, kwargs = mock_index.upsert.call_args
        assert kwargs["namespace"] == "bot_abc_123"

        records = kwargs["vectors"]
        assert len(records) == 2

        # Inspect first record
        r0 = records[0]
        assert r0["id"] == "chk_001"
        assert len(r0["values"]) == 1024
        assert r0["metadata"]["chatbot_id"] == "bot_abc_123"
        assert r0["metadata"]["chunk_id"] == "chk_001"
        assert r0["metadata"]["text"] == "Our pro plan is $10/month with unlimited messages."
        assert r0["metadata"]["source_url"] == "https://example.com/pricing"
        assert r0["metadata"]["title"] == "Pricing Plans"
        assert r0["metadata"]["category"] == "pricing"

    def test_upsert_empty_chunks_returns_immediately(self):
        """Empty chunk list returns upserted_count=0 without calling Pinecone."""
        store = PineconeVectorStore(api_key="mock-key")
        mock_index = MagicMock()

        with patch.object(store, "_get_index", return_value=mock_index):
            result = store.upsert_chunks(chatbot_id="bot_123", chunks=[])

        assert result.success is True
        assert result.upserted_count == 0
        mock_index.upsert.assert_not_called()

    def test_upsert_invalid_chatbot_id_raises_value_error(self, sample_embedded_chunks):
        """Empty or whitespace chatbot_id must be rejected."""
        store = PineconeVectorStore(api_key="mock-key")
        with pytest.raises(ValueError):
            store.upsert_chunks(chatbot_id="", chunks=sample_embedded_chunks)
        with pytest.raises(ValueError):
            store.upsert_chunks(chatbot_id="   ", chunks=sample_embedded_chunks)

    def test_query_similar_with_tenant_isolation_and_score_threshold(self):
        """Verifies semantic similarity search strictly targets the chatbot's namespace."""
        store = PineconeVectorStore(api_key="mock-key", index_name="test-index")
        mock_index = MagicMock()

        # Mock matches: one high score (0.89) and one low score (0.45)
        mock_index.query.return_value = DummyQueryResponse(
            matches=[
                DummyMatch(
                    match_id="chk_001",
                    score=0.89,
                    metadata={
                        "chatbot_id": "bot_999",
                        "chunk_id": "chk_001",
                        "text": "Answer found in pro plan section.",
                        "source_url": "https://example.com/pricing",
                        "canonical_url": "https://example.com/pricing",
                        "title": "Pricing",
                        "chunk_index": 0,
                    },
                ),
                DummyMatch(
                    match_id="chk_002",
                    score=0.45,
                    metadata={
                        "chatbot_id": "bot_999",
                        "text": "Irrelevant text with low similarity score.",
                        "source_url": "https://example.com/other",
                    },
                ),
            ]
        )

        with patch.object(store, "_get_index", return_value=mock_index):
            # Query with score_threshold=0.70 (should filter out score 0.45)
            results = store.query_similar(
                chatbot_id="bot_999",
                query_vector=[0.05] * 1024,
                top_k=5,
                score_threshold=0.70,
            )

        assert len(results) == 1
        res = results[0]
        assert res.chunk_id == "chk_001"
        assert res.chatbot_id == "bot_999"
        assert res.score == 0.89
        assert res.content == "Answer found in pro plan section."
        assert res.source_url == "https://example.com/pricing"
        assert res.title == "Pricing"

        # Check call arguments
        mock_index.query.assert_called_once()
        _, kwargs = mock_index.query.call_args
        assert kwargs["namespace"] == "bot_999"
        assert kwargs["top_k"] == 5
        assert kwargs["include_metadata"] is True

    def test_delete_chatbot_content_cleans_namespace(self):
        """Verifies deleting chatbot content invokes delete_all=True within the chatbot namespace."""
        store = PineconeVectorStore(api_key="mock-key", index_name="test-index")
        mock_index = MagicMock()

        with patch.object(store, "_get_index", return_value=mock_index):
            del_result = store.delete_chatbot_content(chatbot_id="bot_obsolete")

        assert del_result.success is True
        assert del_result.chatbot_id == "bot_obsolete"
        mock_index.delete.assert_called_once_with(delete_all=True, namespace="bot_obsolete")

    def test_api_key_masking(self):
        """Validates that API key masking prevents credential leakage."""
        assert PineconeVectorStore._mask_key(None) == "<not-set>"
        assert PineconeVectorStore._mask_key("") == "<not-set>"
        assert PineconeVectorStore._mask_key("123456") == "***"
        masked = PineconeVectorStore._mask_key("pcsk_1234567890abcdef")
        assert "1234567890" not in masked
        assert masked == "pcsk...cdef"
