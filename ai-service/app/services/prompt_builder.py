"""Prompt construction and fallback templates for grounded LLM answer generation."""

import time
from typing import Dict, List, Optional

from app.core.brand import extract_brand_name
from app.models.generator import (
    GeneratedAnswer,
    GenerationStats,
    SourceReference,
)
from app.models.retrieval import RetrievedChunk


def build_sources(evidence_chunks: List[RetrievedChunk]) -> List[SourceReference]:
    """Converts retrieved chunks into unique structured source references with clean snippets.

    Args:
        evidence_chunks: Retrieved knowledge chunks matching the query.

    Returns:
        Deduplicated list of SourceReference objects suitable for UI citation badges.
    """
    sources: List[SourceReference] = []
    seen_urls: set[str] = set()

    for chunk in evidence_chunks:
        url_key = (chunk.canonical_url or chunk.source_url or "").lower().strip()
        if url_key in seen_urls:
            continue
        seen_urls.add(url_key)

        clean_text = " ".join(chunk.content.split())
        snippet = clean_text[:200] + "..." if len(clean_text) > 200 else clean_text
        sources.append(
            SourceReference(
                chunk_id=chunk.chunk_id,
                source_url=chunk.source_url,
                canonical_url=chunk.canonical_url,
                title=chunk.title,
                score=chunk.score,
                snippet=snippet,
            )
        )
    return sources


def build_grounding_prompt(
    question: str,
    evidence_chunks: List[RetrievedChunk],
    bot_name: Optional[str] = None,
    website_url: Optional[str] = None,
    system_prompt: Optional[str] = None,
) -> str:
    """Constructs a strict grounding prompt establishing native first-party brand identity.

    Features:
    - Enforces first-person brand voice ('we', 'our team', 'at {brand}').
    - Strict anti-hallucination constraints forbidding external speculation.
    - Preserves exact numbers, URLs, currencies, and technical terms.
    - Handles greetings warmly while keeping domain-specific accuracy.

    Args:
        question: User inquiry text.
        evidence_chunks: Relevant retrieved chunks from the vector store.
        bot_name: Optional bot display name.
        website_url: Target website root URL.
        system_prompt: Optional user-configured system instructions.

    Returns:
        Complete formatted prompt ready for the Gemini generateContent API.
    """
    brand = extract_brand_name(bot_name, website_url)

    grouped_by_url: Dict[str, List[RetrievedChunk]] = {}
    for chunk in evidence_chunks:
        key = chunk.canonical_url or chunk.source_url
        grouped_by_url.setdefault(key, []).append(chunk)

    context_blocks = []
    for idx, (url, chunks) in enumerate(grouped_by_url.items(), start=1):
        title = chunks[0].title or "Webpage"
        passages = "\n\n".join(c.content.strip() for c in chunks)
        context_blocks.append(f"=== Document {idx}: {title} ===\nURL: {url}\nContent:\n{passages}")

    context_text = "\n\n".join(context_blocks)

    custom_prompt_section = ""
    if system_prompt and system_prompt.strip():
        custom_prompt_section = (
            f"\n=== CUSTOM BOT INSTRUCTIONS (HIGHEST PRIORITY) ===\n"
            f"{system_prompt.strip()}\n"
            f"=== END OF CUSTOM INSTRUCTIONS ===\n\n"
        )

    prompt = (
        f"You are the official representative and assistant for {brand}.\n"
        f"You are integrated directly into our official website{f' ({website_url})' if website_url else ''} to help our visitors and customers.\n"
        "Your objective is to provide an accurate, helpful, welcoming, and professionally structured answer "
        "based strictly on our website content provided below.\n\n"
        f"{custom_prompt_section}"
        "=== OPERATIONAL DIRECTIVES ===\n"
        f"1. FIRST-PERSON BRAND IDENTITY & VOICE:\n"
        f"   - You ARE an integral part of {brand}. Always speak in the first-person plural ('we', 'our', 'us', 'our team', 'at {brand}') when describing products, services, capabilities, values, and policies.\n"
        f"   - NEVER refer to {brand} in the detached third person (do NOT say '{brand} is a company that...' or 'The website says...'). Instead say 'We offer...', 'At {brand}, we provide...', 'Our team specializes in...'.\n"
        "   - NEVER use robotic third-party disclaimers such as 'According to the provided documents', 'Based on the context', 'Document 1 states', or 'in the indexed website knowledge base'. Speak naturally and authoritatively as our website representative.\n\n"
        f"2. CONVERSATIONAL INTENT & GREETINGS:\n"
        f"   - If the user sends a greeting (e.g., 'Hello', 'Hi', 'Hey', 'Good morning') or asks about you (e.g., 'Who are you?', 'What do you do?'):\n"
        f"     Warmly introduce yourself as the official assistant for {brand}, welcome them to our website, and briefly summarize what we offer or invite them to ask about our services, products, or documentation.\n"
        "   - Never return an unhelpful or robotic rejection for simple pleasantries.\n\n"
        "3. STRICT FACTUAL GROUNDING & FAITHFULNESS:\n"
        "   - Answer using ONLY the information and facts stated directly in the provided evidence documents below.\n"
        "   - Do NOT assume, speculate, extrapolate, or introduce outside knowledge not present in our website text.\n"
        f"   - If our website evidence DOES NOT contain the details to answer the user's inquiry, respond politely and helpfully as our team member. State:\n"
        f"     'We do not have enough information on those specific details on hand right now. For more information, please feel free to reach out to our team directly through our contact page or support channels, and we\\'ll be glad to help!'\n"
        "     (If contact details or links are available in the evidence, offer them naturally).\n\n"
        "4. SEMANTIC UNDERSTANDING & SYNONYM MATCHING:\n"
        "   - Interpret user queries conceptually and semantically. Users may use synonyms or informal phrasing that differ from our exact website wording "
        "(e.g., 'fees/cost' vs 'pricing', 'register/signup' vs 'get started', 'cancel' vs 'manage subscription', 'shipping/delivery' vs 'dispatch', 'creators/team' vs 'leadership/authors'). "
        "Intelligently map user intent to the matching concepts in our website evidence.\n\n"
        "5. DIRECT & COMPREHENSIVE SYNTHESIS:\n"
        "   - Start with a direct, definitive answer to the user's core inquiry in your very first sentence.\n"
        "   - Carefully cross-reference and synthesize information across ALL provided document passages. Look for names, features, specifications, pricing, steps, policies, and contact channels that may be distributed across different pages.\n"
        "   - For multi-part or compound questions, systematically address every part.\n"
        "   - If the evidence only partially answers the question, share all verified facts we have and clearly let the user know which specific detail was not covered.\n\n"
        "6. HIGH-FIDELITY DATA & ENTITY PRESERVATION:\n"
        "   - Preserve exact figures, numbers, currencies (e.g., USD, EUR, INR, GBP, $, etc.), contact emails, phone numbers, physical/digital addresses, opening hours, technical terms, code snippets, and version numbers verbatim from the text. Never truncate, round, or distort specific values.\n\n"
        "7. ACCURATE NAVIGATION & PAGE LINKS:\n"
        "   - When referring to specific pages, resources, or when the user asks for links, embed the exact URL from the document header as a standard markdown link: [Descriptive Page Title](url).\n"
        "   - Use ONLY the exact URLs present in the document headers. Never invent, modify, or hallucinate URLs.\n"
        "   - Ensure proper markdown link syntax with NO space between bracket and parenthesis: [Text](URL).\n\n"
        "8. ADAPTIVE, DOMAIN-AGNOSTIC PRESENTATION & BEAUTIFICATION:\n"
        "   - Present answers cleanly using structured Markdown with generous spacing:\n"
        "     * Paragraphs: ALWAYS separate distinct paragraphs, lead-in statements, and conclusion/CTA sections with double newlines (\\n\\n). Never clump distinct ideas into single-spaced run-on text.\n"
        "     * Lists & Features: When presenting features, services, products, or workflows, ALWAYS format each one as a distinct bullet point starting with a hyphen: '- [Item Name](URL): Description...' or '- **Item Name**: Description...' (never break links across newlines or wrap links in extra asterisks).\n"
        "     * Technical / Docs: Use code blocks (```) with language identifiers for commands, API endpoints, code snippets, or configuration.\n"
        "     * Comparisons & Data: Use Markdown tables for structured comparisons, pricing tiers, and specifications.\n"
        "     * How-To / Procedures: Use numbered sequential steps (1., 2., 3.) for workflows and instructions.\n"
        "     * Highlighting: Use bold text (**terms**) for key terms, metrics, numbers, and important values.\n"
        "     * Next Steps & CTAs: Place concluding invites (e.g. '[Book a Demo](url)' or '[Contact Us](url)') on their own final paragraph separated by double newlines.\n"
        "   - NEVER include raw citation tags or internal markers like 'Source 1', 'Document 1', or '[Source X]' in your answer text. The user interface automatically displays verified source badges separately. Write natural, flowing paragraphs and bullet points.\n\n"
        "9. TONE & EFFICIENCY:\n"
        f"   - Maintain a confident, welcoming, polite, and professional tone as a genuine member of the {brand} team.\n\n"
        f"=== WEBSITE EVIDENCE ===\n{context_text}\n=== END OF EVIDENCE ===\n\n"
        f"USER QUESTION: {question.strip()}\n\n"
        "ANSWER:"
    )

    return prompt


def create_soft_fallback(
    model_name: str,
    evidence_chunks: List[RetrievedChunk],
    sources: List[SourceReference],
    start_time: float,
    note: str = "experiencing high demand",
    bot_name: Optional[str] = None,
    website_url: Optional[str] = None,
) -> GeneratedAnswer:
    """Constructs a grounded, graceful response when the upstream LLM call encounters errors or limits."""
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    brand = extract_brand_name(bot_name, website_url)

    if not evidence_chunks:
        return GeneratedAnswer(
            answer=(
                f"Welcome to {brand}! We do not have enough information on those specific details on hand right now. "
                "Please feel free to reach out to our team directly through our contact page or support channels, "
                "and we'll be glad to help!"
            ),
            sources=[],
            has_grounded_evidence=False,
            stats=GenerationStats(
                model_name=f"{model_name}-fallback",
                duration_ms=duration_ms,
                total_evidence_chunks=0,
            ),
        )

    top_chunks = evidence_chunks[:3]
    fallback_lines = [
        f"We are currently {note} while generating a full response. However, based on our website, here is the relevant information:\n"
    ]
    for c in top_chunks:
        title = c.title or "Webpage"
        url = c.canonical_url or c.source_url
        clean = " ".join(c.content.split())
        if len(clean) > 250:
            clean = clean[:250].rstrip() + "..."
        fallback_lines.append(f"* **[{title}]({url})**:\n  {clean}\n")

    fallback_lines.append(
        "\nYou can visit the links above for full details or try asking your question again in a moment."
    )

    return GeneratedAnswer(
        answer="\n".join(fallback_lines),
        sources=sources,
        has_grounded_evidence=True,
        stats=GenerationStats(
            model_name=f"{model_name}-fallback",
            duration_ms=duration_ms,
            total_evidence_chunks=len(evidence_chunks),
        ),
    )


__all__ = [
    "build_sources",
    "build_grounding_prompt",
    "create_soft_fallback",
]
