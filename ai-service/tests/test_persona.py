import json
import pytest
from unittest.mock import AsyncMock, patch

from app.services.persona_generator import (
    BotPersona,
    PersonaGeneratorService,
    persona_generator_service,
)


def test_deterministic_fallback_generates_complete_persona():
    """Verify fallback persona includes brand name, tagline, prompt, and questions."""
    service = PersonaGeneratorService(api_key=None)
    persona = service._build_deterministic_fallback(
        website_url="https://docs.stripe.com/payments",
        raw_bot_name="Stripe AI Assistant",
    )

    assert isinstance(persona, BotPersona)
    assert persona.brand_name == "Stripe"
    assert "Stripe" in persona.tagline
    assert len(persona.starter_questions) >= 3
    assert any("pricing" in q.lower() or "started" in q.lower() for q in persona.starter_questions)
    assert "representative and assistant for Stripe" in persona.suggested_system_prompt


@pytest.mark.asyncio
async def test_agenerate_persona_with_mocked_gemini():
    """Verify parsing of valid Gemini response."""
    mock_payload = {
        "brand_name": "Acme Cloud",
        "tagline": "Next-Gen Telemetry for Modern Infrastructure",
        "company_description": "Acme Cloud delivers real-time observability and anomaly alerting.",
        "suggested_system_prompt": "You are Acme Cloud's technical AI representative. Assist developers with architecture and pricing.",
        "starter_questions": [
            "How do I install the Acme agent?",
            "What cloud providers are supported?",
            "What are your enterprise pricing tiers?",
            "How does latency alerting work?",
        ],
    }

    mock_gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": json.dumps(mock_payload)}],
                }
            }
        ]
    }

    service = PersonaGeneratorService(api_key="mock-key-123")

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: mock_gemini_response
        mock_post.return_value = mock_resp

        persona = await service.agenerate_persona(
            homepage_text="# Acme Cloud\nNext-Gen Telemetry platform.",
            website_url="https://acmecloud.io",
            raw_bot_name="acme",
        )

    assert persona.brand_name == "Acme Cloud"
    assert persona.tagline == "Next-Gen Telemetry for Modern Infrastructure"
    assert len(persona.starter_questions) == 4
    assert persona.starter_questions[0] == "How do I install the Acme agent?"
