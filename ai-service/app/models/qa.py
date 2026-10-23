"""Pydantic data models for Question-Answering (QA) requests and responses."""

from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.generator import SourceReference


class ChatHistoryItem(BaseModel):
    """Single turn of conversational history."""

    role: str = Field(..., description="Role of the sender ('user' or 'assistant').")
    content: str = Field(..., description="Text content of the message.")


class QARequest(BaseModel):
    """Input payload for asking a question against a chatbot's indexed knowledge base."""

    chatbot_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique identifier for the chatbot whose knowledge base to query.",
        examples=["bot_ecommerce_123"],
    )
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="The user's natural language question.",
        examples=["What is your return policy?"],
    )
    bot_name: Optional[str] = Field(
        default=None,
        description="Optional name or persona label for the chatbot.",
    )
    website_url: Optional[str] = Field(
        default=None,
        description="Primary website URL the bot natively represents.",
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="Custom system instructions or guidelines configured by the owner.",
    )
    top_k: int = Field(
        default=8,
        ge=1,
        le=20,
        description="Maximum number of relevant knowledge chunks to retrieve as evidence.",
    )
    score_threshold: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional minimum cosine similarity score cutoff.",
    )
    llm_provider: Optional[str] = Field(
        default=None,
        description="Client-provided LLM provider (openai, google, anthropic, groq).",
    )
    llm_model: Optional[str] = Field(
        default=None,
        description="Client-selected LLM model name.",
    )
    llm_api_key: Optional[str] = Field(
        default=None,
        description="Client's private API key for the chosen LLM provider.",
    )
    chat_history: Optional[List[ChatHistoryItem]] = Field(
        default=None,
        description="Recent conversation turns (up to 5) for multi-turn conversational memory.",
    )


class QAStats(BaseModel):
    """Performance metrics and diagnostic information for a complete RAG request."""

    retrieval_duration_ms: float = Field(0.0, description="Time spent searching and retrieving knowledge chunks.")
    generation_duration_ms: float = Field(0.0, description="Time spent synthesizing the answer with the LLM.")
    total_duration_ms: float = Field(0.0, description="Total end-to-end request latency in milliseconds.")
    model_used: str = Field(..., description="LLM model identifier used to generate the answer.")
    chunks_retrieved: int = Field(0, description="Number of evidence chunks retrieved from the knowledge base.")


class QAResponse(BaseModel):
    """Consistent output payload containing the grounded answer and cited sources."""

    chatbot_id: str = Field(..., description="Chatbot identifier for which the question was answered.")
    question: str = Field(..., description="The original user question.")
    answer: str = Field(..., description="Grounded, natural language response.")
    sources: List[SourceReference] = Field(
        default_factory=list,
        description="List of verified source references cited in the answer.",
    )
    has_grounded_evidence: bool = Field(
        True,
        description="Whether the response is backed by relevant retrieved website passages.",
    )
    stats: QAStats = Field(..., description="Performance and latency diagnostics.")
