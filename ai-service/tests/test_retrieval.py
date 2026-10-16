import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.services.vector_store import (
    VectorStoreAdapter,
    VectorSearchResult,
    VectorStoreError,
)
from app.services.embedding import (
    VoyageEmbeddingService,
    QueryEmbeddingResult,
    EmbeddingError,
    EmbeddingGenerationError,
)
from app.services.retrieval import (
    KnowledgeRetrievalService,
    RetrievedChunk,
    RetrievalResult,
    RetrievalError,
    InvalidQueryError,
    DEFAULT_TOP_K,
)


class DummyVectorStore(VectorStoreAdapter):
    """In-memory dummy vector store adapter for testing."""

    def __init__(self):
        self.query_similar_mock = MagicMock()
        self.health_check_mock = MagicMock(return_value=True)
        self.upsert_mock = MagicMock()
        self.delete_mock = MagicMock()

    def health_check(self) -> bool:
        return self.health_check_mock()

    def upsert_chunks(self, chatbot_id, chunks):
        return self.upsert_mock(chatbot_id, chunks)

    def query_similar(self, chatbot_id, query_vector, top_k=5, score_threshold=None):
        return self.query_similar_mock(
            chatbot_id=chatbot_id,
            query_vector=query_vector,
            top_k=top_k,
            score_threshold=score_threshold,
        )

    def delete_chatbot_content(self, chatbot_id):
        return self.delete_mock(chatbot_id)


class TestKnowledgeRetrievalService:
    """Unit test suite for Step 12: Knowledge Retrieval Service."""

    @pytest.fixture
    def mock_embedding_service(self):
        service = MagicMock(spec=VoyageEmbeddingService)
        service.model = "voyage-3"
        dummy_vector = [0.05] * 1024
        service.embed_query.return_value = QueryEmbeddingResult(
            query="how much does it cost?",
            embedding=dummy_vector,
            dimensions=1024,
            model_name="voyage-3",
            token_count=6,
        )
        service.aembed_query = AsyncMock(
            return_value=QueryEmbeddingResult(
                query="how much does it cost?",
                embedding=dummy_vector,
                dimensions=1024,
                model_name="voyage-3",
                token_count=6,
            )
        )
        return service

    @pytest.fixture
    def mock_vector_store(self):
        store = DummyVectorStore()
        store.query_similar_mock.return_value = [
            VectorSearchResult(
                chunk_id="chk_pricing_01",
                chatbot_id="bot_123",
                score=0.92,
                content="Our Pro tier is $19/month and includes 10,000 queries.",
                source_url="https://example.com/pricing",
                canonical_url="https://example.com/pricing",
                title="Pricing Plans",
                chunk_index=0,
                metadata={"plan": "pro", "currency": "USD"},
            ),
            VectorSearchResult(
                chunk_id="chk_pricing_02",
                chatbot_id="bot_123",
                score=0.85,
                content="Our Enterprise tier includes dedicated support and SLA.",
                source_url="https://example.com/pricing#enterprise",
                canonical_url="https://example.com/pricing",
                title="Pricing Plans",
                chunk_index=1,
                metadata={"plan": "enterprise"},
            ),
        ]
        return store

    @pytest.fixture
    def retrieval_service(self, mock_vector_store, mock_embedding_service):
        return KnowledgeRetrievalService(
            vector_store=mock_vector_store,
            embedding_service=mock_embedding_service,
            default_top_k=4,
        )

    def test_successful_retrieval_returns_structured_result(
        self, retrieval_service, mock_vector_store, mock_embedding_service
    ):
        """Valid query returns top matching chunks with scores, source URLs, and metadata."""
        result = retrieval_service.retrieve(
            chatbot_id="bot_123",
            query="how much does it cost?",
            top_k=2,
        )

        assert isinstance(result, RetrievalResult)
        assert result.success is True
        assert result.chatbot_id == "bot_123"
        assert result.query == "how much does it cost?"
        assert len(result.chunks) == 2

        # Verify embedding service was invoked with cleaned query
        mock_embedding_service.embed_query.assert_called_once_with("how much does it cost?")

        # Verify vector store was called with tenant isolation
        mock_vector_store.query_similar_mock.assert_called_once()
        call_kwargs = mock_vector_store.query_similar_mock.call_args.kwargs
        assert call_kwargs["chatbot_id"] == "bot_123"
        assert call_kwargs["top_k"] >= 2

        # Verify chunk 1 data integrity
        first_chunk = result.chunks[0]
        assert first_chunk.chunk_id == "chk_pricing_01"
        assert first_chunk.chatbot_id == "bot_123"
        assert first_chunk.score == 0.92
        assert "Pro tier is $19/month" in first_chunk.content
        assert first_chunk.source_url == "https://example.com/pricing"
        assert first_chunk.title == "Pricing Plans"
        assert first_chunk.metadata == {"plan": "pro", "currency": "USD"}

        # Verify stats
        assert result.stats.total_retrieved == 2
        assert result.stats.top_k_requested == 2
        assert result.stats.embedding_model == "voyage-3"
        assert result.stats.duration_ms >= 0.0

    def test_default_top_k_applied_when_not_provided(
        self, retrieval_service, mock_vector_store
    ):
        """When top_k is None, default configured for service must be used."""
        result = retrieval_service.retrieve(
            chatbot_id="bot_123",
            query="what features are available?",
        )

        assert result.stats.top_k_requested == 4
        call_kwargs = mock_vector_store.query_similar_mock.call_args.kwargs
        assert call_kwargs["top_k"] >= 4

    def test_invalid_top_k_raises_invalid_query_error(self, retrieval_service):
        """top_k out of bounds (< 1 or > 100) must raise InvalidQueryError."""
        with pytest.raises(InvalidQueryError) as exc_info_low:
            retrieval_service.retrieve(chatbot_id="bot_123", query="test query", top_k=0)
        assert "top_k must be between 1 and 100" in str(exc_info_low.value)

        with pytest.raises(InvalidQueryError) as exc_info_high:
            retrieval_service.retrieve(chatbot_id="bot_123", query="test query", top_k=105)
        assert "top_k must be between 1 and 100" in str(exc_info_high.value)


    @pytest.mark.parametrize("empty_query", ["", "   ", "\t\n", None])
    def test_empty_query_raises_invalid_query_error(self, retrieval_service, empty_query):
        """Empty or whitespace-only queries must fail fast without calling API."""
        with pytest.raises(InvalidQueryError) as exc_info:
            retrieval_service.retrieve(chatbot_id="bot_123", query=empty_query)
        assert "cannot be empty" in str(exc_info.value)

    @pytest.mark.parametrize("empty_bot_id", ["", "   ", None])
    def test_empty_chatbot_id_raises_invalid_query_error(self, retrieval_service, empty_bot_id):
        """Empty or whitespace-only chatbot_id must fail fast."""
        with pytest.raises(InvalidQueryError) as exc_info:
            retrieval_service.retrieve(chatbot_id=empty_bot_id, query="valid query")
        assert "Chatbot identifier must be a non-empty string" in str(exc_info.value)

    def test_empty_results_handled_cleanly_when_no_matches_exist(
        self, retrieval_service, mock_vector_store
    ):
        """When a chatbot has no indexed chunks or query produces 0 matches, return empty list gracefully."""
        mock_vector_store.query_similar_mock.return_value = []

        result = retrieval_service.retrieve(
            chatbot_id="bot_empty",
            query="unknown topic",
        )

        assert result.success is True
        assert result.chunks == []
        assert result.stats.total_retrieved == 0
        assert result.error_message is None

    def test_tenant_isolation_prevents_cross_chatbot_leakage(
        self, retrieval_service, mock_vector_store
    ):
        """Defense-in-depth: If vector store returns chunks with a mismatched chatbot_id, they are dropped."""
        mock_vector_store.query_similar_mock.return_value = [
            VectorSearchResult(
                chunk_id="chk_valid_bot",
                chatbot_id="bot_tenant_a",
                score=0.95,
                content="Authorized content for tenant A.",
                source_url="https://tenant-a.com",
                canonical_url="https://tenant-a.com",
            ),
            VectorSearchResult(
                chunk_id="chk_leaked_bot",
                chatbot_id="bot_tenant_b",  # Anomalous foreign tenant data
                score=0.99,
                content="LEAKED secret data from tenant B!",
                source_url="https://tenant-b.com/secrets",
                canonical_url="https://tenant-b.com/secrets",
            ),
        ]

        result = retrieval_service.retrieve(
            chatbot_id="bot_tenant_a",
            query="tell me everything",
        )

        # Only bot_tenant_a's chunk is returned
        assert len(result.chunks) == 1
        assert result.chunks[0].chunk_id == "chk_valid_bot"
        assert result.chunks[0].chatbot_id == "bot_tenant_a"
        assert "Authorized" in result.chunks[0].content

    def test_score_threshold_passed_to_vector_store(
        self, retrieval_service, mock_vector_store
    ):
        """Score threshold parameter is forwarded to the vector store adapter."""
        retrieval_service.retrieve(
            chatbot_id="bot_123",
            query="what is the refund policy?",
            score_threshold=0.75,
        )

        call_kwargs = mock_vector_store.query_similar_mock.call_args.kwargs
        assert call_kwargs["score_threshold"] == 0.75

    def test_vector_store_error_raises_retrieval_error(
        self, retrieval_service, mock_vector_store
    ):
        """Vector store errors (e.g. index down or network disconnect) are wrapped in RetrievalError."""
        mock_vector_store.query_similar_mock.side_effect = VectorStoreError("Pinecone connection lost")

        with pytest.raises(RetrievalError) as exc_info:
            retrieval_service.retrieve(chatbot_id="bot_123", query="pricing")

        assert "Vector store" in str(exc_info.value) or "Knowledge search" in str(exc_info.value)

    def test_embedding_generation_error_raises_retrieval_error(
        self, retrieval_service, mock_embedding_service
    ):
        """Embedding API failures are wrapped in RetrievalError."""
        mock_embedding_service.embed_query.side_effect = EmbeddingGenerationError("Rate limit exceeded")

        with pytest.raises(RetrievalError) as exc_info:
            retrieval_service.retrieve(chatbot_id="bot_123", query="pricing")

        assert "Query embedding generation failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_async_retrieval_successful(
        self, retrieval_service, mock_vector_store, mock_embedding_service
    ):
        """Asynchronous aretrieve method operates properly and invokes async query embedding."""
        result = await retrieval_service.aretrieve(
            chatbot_id="bot_123",
            query="how much does it cost?",
            top_k=2,
        )

        assert isinstance(result, RetrievalResult)
        assert result.success is True
        assert len(result.chunks) == 2
        mock_embedding_service.aembed_query.assert_called_once_with("how much does it cost?")

    def test_demo_retrieval_endpoint_validation_and_success(self, mock_vector_store, mock_embedding_service):
        """Validates FastAPI demo retrieval route request schema and execution."""
        from fastapi.testclient import TestClient
        from app.main import app
        from app.services.retrieval import retrieval_service

        client = TestClient(app)

        # 1. Test empty query rejection (HTTP 422)
        resp_empty_query = client.post("/demo/retrieval", json={"chatbot_id": "bot_123", "query": ""})
        assert resp_empty_query.status_code == 422

        # 2. Test empty chatbot_id rejection (HTTP 422)
        resp_empty_bot = client.post("/demo/retrieval", json={"chatbot_id": "", "query": "hello"})
        assert resp_empty_bot.status_code == 422

        # 3. Test successful request with mocked services
        with patch.object(retrieval_service, "_vector_store", mock_vector_store), \
             patch.object(retrieval_service, "_embedding_service", mock_embedding_service):
            resp = client.post(
                "/demo/retrieval",
                json={"chatbot_id": "bot_123", "query": "how much does it cost?", "top_k": 2},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["chatbot_id"] == "bot_123"
            assert data["query"] == "how much does it cost?"
            assert len(data["chunks"]) == 2
            assert data["chunks"][0]["chunk_id"] == "chk_pricing_01"
            assert data["chunks"][0]["score"] == 0.92
            assert data["chunks"][0]["source_url"] == "https://example.com/pricing"
