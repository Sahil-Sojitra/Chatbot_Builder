import os
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.retrieval import (
    RetrievedChunk,
    RetrievalResult,
    RetrievalStats,
    RetrievalError,
    InvalidQueryError,
)
from app.services.generator import (
    GeneratedAnswer,
    GenerationStats,
    SourceReference,
    GenerationTimeoutError,
    GenerationProviderError,
    LLMGenerationAdapter,
)
from app.services.qa import (
    RAGQuestionAnsweringService,
    QARequest,
    QAResponse,
    qa_service,
)


@pytest.fixture
def mock_evidence_chunks():
    return [
        RetrievedChunk(
            chunk_id="chk_refund_001",
            chatbot_id="bot_store_1",
            score=0.91,
            content="Our return window is 30 days from purchase for all unworn footwear.",
            source_url="https://example.com/returns",
            canonical_url="https://example.com/returns",
            title="Return Policy",
            chunk_index=0,
            metadata={"category": "returns"},
        ),
        RetrievedChunk(
            chunk_id="chk_refund_002",
            chatbot_id="bot_store_1",
            score=0.86,
            content="Refunds are credited to the original payment method within 5 business days.",
            source_url="https://example.com/refunds",
            canonical_url="https://example.com/refunds",
            title="Refund Processing",
            chunk_index=1,
            metadata={"category": "refunds"},
        ),
    ]


@pytest.fixture
def mock_retrieval_service(mock_evidence_chunks):
    service = MagicMock()
    service.retrieve.return_value = RetrievalResult(
        chatbot_id="bot_store_1",
        query="what is the return policy?",
        chunks=mock_evidence_chunks,
        stats=RetrievalStats(
            total_retrieved=2,
            top_k_requested=4,
            duration_ms=12.5,
            embedding_model="voyage-4",
        ),
        success=True,
    )
    service.aretrieve = AsyncMock(
        return_value=RetrievalResult(
            chatbot_id="bot_store_1",
            query="what is the return policy?",
            chunks=mock_evidence_chunks,
            stats=RetrievalStats(
                total_retrieved=2,
                top_k_requested=4,
                duration_ms=12.5,
                embedding_model="voyage-4",
            ),
            success=True,
        )
    )
    return service


@pytest.fixture
def mock_generator_service():
    service = MagicMock(spec=LLMGenerationAdapter)
    service.model = "gemini-3.5-flash-lite"
    dummy_answer = GeneratedAnswer(
        answer="You can return unworn footwear within 30 days of purchase for a full refund [Source 1].",
        sources=[
            SourceReference(
                chunk_id="chk_refund_001",
                source_url="https://example.com/returns",
                canonical_url="https://example.com/returns",
                title="Return Policy",
                score=0.91,
                snippet="Our return window is 30 days from purchase for all unworn footwear.",
            )
        ],
        has_grounded_evidence=True,
        stats=GenerationStats(
            model_name="gemini-3.5-flash-lite",
            duration_ms=210.0,
            total_evidence_chunks=2,
        ),
    )
    service.generate_answer.return_value = dummy_answer
    service.agenerate_answer = AsyncMock(return_value=dummy_answer)
    return service


@pytest.fixture
def test_client():
    key = os.getenv("INTERNAL_API_KEY", "test-internal-secret-key-12345")
    return TestClient(app, headers={"X-API-Key": key})


class TestRAGQuestionAnsweringService:
    """Unit test suite for Step 14 RAG Question-Answering Service."""

    @pytest.mark.asyncio
    async def test_grounded_answer_success(self, mock_retrieval_service, mock_generator_service):
        """Verifies full RAG execution: retrieval first, generation second, returning sources."""
        qa = RAGQuestionAnsweringService(
            retrieval_service=mock_retrieval_service,
            generator_service=mock_generator_service,
        )
        req = QARequest(chatbot_id="bot_store_1", question="what is the return policy?", top_k=4)
        response = await qa.aanswer_question(req)

        assert isinstance(response, QAResponse)
        assert response.chatbot_id == "bot_store_1"
        assert response.has_grounded_evidence is True
        assert "within 30 days" in response.answer
        assert len(response.sources) == 1
        assert response.sources[0].chunk_id == "chk_refund_001"
        assert response.stats.chunks_retrieved == 2
        assert response.stats.model_used == "gemini-3.5-flash-lite"

        # Verify execution order: retrieval called, then generator called with evidence
        mock_retrieval_service.aretrieve.assert_called_once()
        mock_generator_service.agenerate_answer.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_retrieved_results_returns_polite_fallback(
        self, mock_retrieval_service, mock_generator_service
    ):
        """When 0 chunks match, returns clean fallback without wasting LLM generation tokens."""
        mock_retrieval_service.aretrieve.return_value = RetrievalResult(
            chatbot_id="bot_store_1",
            query="unknown query",
            chunks=[],
            stats=RetrievalStats(
                total_retrieved=0,
                top_k_requested=4,
                duration_ms=8.0,
                embedding_model="voyage-4",
            ),
            success=True,
        )

        qa = RAGQuestionAnsweringService(
            retrieval_service=mock_retrieval_service,
            generator_service=mock_generator_service,
        )
        req = QARequest(chatbot_id="bot_store_1", question="do you sell rockets?", top_k=4)
        response = await qa.aanswer_question(req)

        assert response.has_grounded_evidence is False
        assert response.sources == []
        assert "not have enough information" in response.answer
        assert response.stats.chunks_retrieved == 0
        assert response.stats.generation_duration_ms == 0.0

        # Generator must NOT have been called
        mock_generator_service.agenerate_answer.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad_id", ["", "   "])
    async def test_blank_chatbot_id_raises_invalid_query_error(
        self, mock_retrieval_service, mock_generator_service, bad_id
    ):
        qa = RAGQuestionAnsweringService(
            retrieval_service=mock_retrieval_service,
            generator_service=mock_generator_service,
        )
        req = QARequest.model_construct(chatbot_id=bad_id, question="valid question", top_k=4)
        with pytest.raises(InvalidQueryError):
            await qa.aanswer_question(req)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad_q", ["", "   "])
    async def test_blank_question_raises_invalid_query_error(
        self, mock_retrieval_service, mock_generator_service, bad_q
    ):
        qa = RAGQuestionAnsweringService(
            retrieval_service=mock_retrieval_service,
            generator_service=mock_generator_service,
        )
        req = QARequest.model_construct(chatbot_id="bot_1", question=bad_q, top_k=4)
        with pytest.raises(InvalidQueryError):
            await qa.aanswer_question(req)


class TestChatAPIRoutes:
    """Integration test suite for /api/v1/chat FastAPI routes."""

    def test_post_ask_grounded_success(self, test_client, mock_retrieval_service, mock_generator_service):
        """End-to-end HTTP POST /api/v1/chat/ask returns 200 with answer and sources."""
        with patch.object(qa_service, "_retrieval_service", mock_retrieval_service), \
             patch.object(qa_service, "_generator_service", mock_generator_service):

            resp = test_client.post(
                "/api/v1/chat/ask",
                json={
                    "chatbot_id": "bot_store_1",
                    "question": "what is the return policy?",
                    "top_k": 4,
                },
            )

            assert resp.status_code == 200
            data = resp.json()
            assert data["chatbot_id"] == "bot_store_1"
            assert data["has_grounded_evidence"] is True
            assert "within 30 days" in data["answer"]
            assert len(data["sources"]) == 1
            assert data["sources"][0]["chunk_id"] == "chk_refund_001"
            assert data["sources"][0]["source_url"] == "https://example.com/returns"
            assert "stats" in data
            assert data["stats"]["model_used"] == "gemini-3.5-flash-lite"

    def test_post_message_alias_success(self, test_client, mock_retrieval_service, mock_generator_service):
        """End-to-end HTTP POST /api/v1/chat/message operates identically as alias to /ask."""
        with patch.object(qa_service, "_retrieval_service", mock_retrieval_service), \
             patch.object(qa_service, "_generator_service", mock_generator_service):

            resp = test_client.post(
                "/api/v1/chat/message",
                json={
                    "chatbot_id": "bot_store_1",
                    "question": "what is the return policy?",
                },
            )

            assert resp.status_code == 200
            assert resp.json()["chatbot_id"] == "bot_store_1"

    def test_empty_chatbot_id_returns_422(self, test_client):
        """FastAPI Pydantic validation rejects empty chatbot_id with HTTP 422."""
        resp = test_client.post(
            "/api/v1/chat/ask",
            json={"chatbot_id": "", "question": "hello"},
        )
        assert resp.status_code == 422

    def test_empty_question_returns_422(self, test_client):
        """FastAPI Pydantic validation rejects empty question with HTTP 422."""
        resp = test_client.post(
            "/api/v1/chat/ask",
            json={"chatbot_id": "bot_1", "question": ""},
        )
        assert resp.status_code == 422

    def test_question_exceeding_max_length_returns_422(self, test_client):
        """Questions longer than 1000 characters are rejected with HTTP 422."""
        resp = test_client.post(
            "/api/v1/chat/ask",
            json={"chatbot_id": "bot_1", "question": "a" * 1001},
        )
        assert resp.status_code == 422

    def test_llm_timeout_returns_504_gateway_timeout(
        self, test_client, mock_retrieval_service, mock_generator_service
    ):
        """When the LLM provider times out, the route returns HTTP 504."""
        mock_generator_service.agenerate_answer.side_effect = GenerationTimeoutError("Gemini timed out after 15s")

        with patch.object(qa_service, "_retrieval_service", mock_retrieval_service), \
             patch.object(qa_service, "_generator_service", mock_generator_service):

            resp = test_client.post(
                "/api/v1/chat/ask",
                json={"chatbot_id": "bot_store_1", "question": "what is the return policy?"},
            )

            assert resp.status_code == 504
            assert "timed out" in resp.json()["detail"]

    def test_llm_provider_error_returns_502_bad_gateway(
        self, test_client, mock_retrieval_service, mock_generator_service
    ):
        """When the upstream LLM returns 429/500/503, the route returns HTTP 502."""
        mock_generator_service.agenerate_answer.side_effect = GenerationProviderError("Rate limit exceeded (HTTP 429)")

        with patch.object(qa_service, "_retrieval_service", mock_retrieval_service), \
             patch.object(qa_service, "_generator_service", mock_generator_service):

            resp = test_client.post(
                "/api/v1/chat/ask",
                json={"chatbot_id": "bot_store_1", "question": "what is the return policy?"},
            )

            assert resp.status_code == 502
            assert "Upstream LLM provider failure" in resp.json()["detail"]

    def test_retrieval_failure_returns_500_internal_error(
        self, test_client, mock_retrieval_service, mock_generator_service
    ):
        """When vector retrieval throws an error, the route returns HTTP 500."""
        mock_retrieval_service.aretrieve.side_effect = RetrievalError("Pinecone connection error")

        with patch.object(qa_service, "_retrieval_service", mock_retrieval_service), \
             patch.object(qa_service, "_generator_service", mock_generator_service):

            resp = test_client.post(
                "/api/v1/chat/ask",
                json={"chatbot_id": "bot_store_1", "question": "what is the return policy?"},
            )

            assert resp.status_code == 500
            assert "RAG service error" in resp.json()["detail"]

    def test_prompt_builder_includes_last_5_turns(self):
        """Verify prompt builder formats up to 5 conversation turns (10 messages) for conversational memory."""
        from app.services.prompt_builder import build_grounding_prompt
        from app.models.retrieval import RetrievedChunk

        chunks = [
            RetrievedChunk(
                chunk_id="c1",
                chatbot_id="bot_store_1",
                source_url="https://example.com",
                canonical_url="https://example.com",
                content="Store hours are 9am to 5pm.",
                score=0.9,
            )
        ]
        words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"]
        history = [
            {"role": "user", "content": f"Question {words[i]}"} if i % 2 == 0 else {"role": "assistant", "content": f"Answer {words[i]}"}
            for i in range(12)
        ]

        prompt = build_grounding_prompt(
            question="What about weekends?",
            evidence_chunks=chunks,
            bot_name="SupportBot",
            chat_history=history,
        )

        assert "=== RECENT CONVERSATION HISTORY (LAST 5 TURNS) ===" in prompt
        assert "User: Question zero" not in prompt
        assert "Assistant: Answer one" not in prompt
        assert "User: Question two" in prompt
        assert "Assistant: Answer eleven" in prompt
