"""Hybrid keyword re-ranking algorithm for semantic vector search results."""

import re
from typing import List

from app.models.retrieval import RetrievedChunk

# Common conversational stop words to ignore during keyword extraction
STOPWORDS = {
    "the", "and", "for", "with", "about", "are", "you", "guys", "who", "what",
    "where", "how", "can", "your", "give", "tell", "please", "some", "this", "that",
}


def boost_chunks_by_keywords(
    query: str,
    chunks: List[RetrievedChunk],
    top_k: int,
) -> List[RetrievedChunk]:
    """Applies hybrid keyword re-ranking to boost chunks containing exact query terms.

    Surfaces chunks where terms from the user's inquiry match exact words in content,
    page title, or URL across any website domain or tech stack.

    Scoring weights:
    - Title match: +0.15 boost per keyword match
    - Content match: +0.12 boost per keyword match
    - URL path match: +0.10 boost per keyword match

    Args:
        query: Raw search query entered by the user.
        chunks: List of candidates retrieved via dense vector similarity.
        top_k: Number of final top chunks to return after re-ranking.

    Returns:
        List of chunks sorted by adjusted relevance score, capped at top_k.
    """
    if not chunks:
        return []

    query_lower = query.lower()
    keywords = [
        re.escape(w) for w in re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", query_lower)
        if w not in STOPWORDS
    ]

    if not keywords:
        return chunks[:top_k]

    scored = []
    for chunk in chunks:
        content_lower = chunk.content.lower()
        title_lower = (chunk.title or "").lower()
        url_lower = chunk.canonical_url.lower()

        boost = 0.0
        for kw in keywords:
            pattern = rf"\b{kw}\b"
            if re.search(pattern, content_lower):
                boost += 0.12
            if re.search(pattern, title_lower):
                boost += 0.15
            if re.search(pattern, url_lower):
                boost += 0.10

        effective_score = chunk.score + boost
        scored.append((effective_score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]


__all__ = ["boost_chunks_by_keywords"]
