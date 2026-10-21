import os
import logging
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, Field

from app.schemas.ingestion import WebsiteIngestionRequest
from app.services.crawler import crawler_service, get_url_priority
from app.services.content_normalizer import content_normalizer
from app.services.chunker import chunker_service, ContentChunk
from app.services.embedding import embedding_service, EmbeddingError
from app.services.vector_store import vector_store, VectorStoreError
from app.services.persona_generator import persona_generator_service, BotPersona

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["Ingestion (v1)"])


def select_balanced_chunks(chunks: List[ContentChunk], max_chunks: int = 60) -> List[ContentChunk]:
    """Selects chunks distributed across all crawled pages, prioritizing foundational pages.

    Ensures core identity and contact pages (Contact Us, About Us, Leadership, Careers)
    receive dedicated chunk representation without getting starved by secondary subpages.
    Uses a priority-ordered round-robin algorithm across distinct canonical URLs.
    """
    if len(chunks) <= max_chunks:
        return chunks

    grouped: Dict[str, List[ContentChunk]] = {}
    for chunk in chunks:
        key = chunk.canonical_url or chunk.source_url
        grouped.setdefault(key, []).append(chunk)

    selected: List[ContentChunk] = []
    max_per_page = max(len(c_list) for c_list in grouped.values())

    # Sort URLs by domain importance (e.g. contact-us and about-us first)
    sorted_urls = sorted(grouped.keys(), key=get_url_priority)

    for chunk_idx in range(max_per_page):
        for url in sorted_urls:
            c_list = grouped[url]
            if chunk_idx < len(c_list):
                selected.append(c_list[chunk_idx])
                if len(selected) >= max_chunks:
                    logger.info(
                        f"Balanced chunk selection reached cap of {max_chunks} chunks "
                        f"across {len(grouped)} distinct pages."
                    )
                    return selected

    return selected


class IngestionResponse(BaseModel):
    """Result of ingesting and indexing a website for a chatbot."""

    chatbot_id: str = Field(..., description="Target chatbot identifier.")
    website_url: str = Field(..., description="Root website URL crawled.")
    pages_crawled: int = Field(0, description="Number of unique pages successfully crawled.")
    chunks_indexed: int = Field(0, description="Total content chunks indexed into the vector database.")
    pages_discovered: int = Field(0, description="Total unique pages discovered on domain.")
    pages_failed: int = Field(0, description="Number of discovered pages that failed to crawl.")
    persona: Optional[BotPersona] = Field(None, description="Auto-generated brand persona and starter questions.")
    success: bool = Field(True, description="Whether the ingestion pipeline completed successfully.")
    error_message: Optional[str] = Field(None, description="Safe error details if ingestion failed.")


def verify_internal_api_key(x_api_key: Optional[str] = Header(None)) -> None:
    """Verifies internal service-to-service API key if configured in the environment."""
    expected_key = os.getenv("INTERNAL_API_KEY", "").strip()
    if expected_key:
        if not x_api_key or x_api_key.strip() != expected_key:
            logger.warning("Unauthorized internal API access attempt to ingestion route.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: invalid or missing internal API key.",
            )


@router.post(
    "/website",
    response_model=IngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest website content into chatbot knowledge base",
    description="Crawls a website, extracts text, chunks, embeds with Voyage AI, and indexes into Pinecone.",
)
async def ingest_website(
    payload: WebsiteIngestionRequest,
    x_api_key: Optional[str] = Header(None),
) -> IngestionResponse:
    verify_internal_api_key(x_api_key)

    clean_bot_id = payload.chatbot_id.strip()
    url_str = str(payload.website_url)

    logger.info(f"Starting website ingestion for chatbot '{clean_bot_id}' from URL '{url_str}'")

    # 1. Multi-page crawl
    try:
        crawl_result = await crawler_service.crawl_multipage(
            starting_url=url_str,
            max_pages=payload.max_pages,
        )
    except Exception as exc:
        logger.error(f"Crawler unhandled exception for '{clean_bot_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Crawling pipeline error: {exc}",
        )

    if not crawl_result.success:
        err_msg = crawl_result.error_message or "Unknown crawling failure"
        if "SSRF Security Violation" in err_msg:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
        if "bot security verification" in err_msg.lower() or "bot protection challenge" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=err_msg,
            )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Crawling failed: {err_msg}")

    pages_crawled = len(crawl_result.successful_pages)
    pages_discovered = crawl_result.total_discovered
    pages_failed = crawl_result.failed_count

    if pages_crawled == 0:
        return IngestionResponse(
            chatbot_id=clean_bot_id,
            website_url=url_str,
            pages_crawled=0,
            chunks_indexed=0,
            pages_discovered=pages_discovered,
            pages_failed=pages_failed,
            success=False,
            error_message="No pages could be extracted from the target website.",
        )

    # 2. Normalize content
    normalized = content_normalizer.normalize_pages(crawl_result)

    # 3. Chunk normalized content
    chunking_result = chunker_service.chunk_pages(normalized)
    if not chunking_result.chunks:
        return IngestionResponse(
            chatbot_id=clean_bot_id,
            website_url=url_str,
            pages_crawled=pages_crawled,
            chunks_indexed=0,
            pages_discovered=pages_discovered,
            pages_failed=pages_failed,
            success=False,
            error_message="Extracted pages contained no usable text chunks to index.",
        )

    # 4. Comprehensive indexing: Index 100% of extracted chunks without artificial caps
    chunks_to_embed = chunking_result.chunks
    logger.info(
        f"Indexing all {len(chunks_to_embed)} chunks from {pages_crawled} pages "
        f"for chatbot '{clean_bot_id}'"
    )

    # 5. Generate Voyage AI embeddings (with rolling TPM pacing to safely handle any batch volume)
    try:
        embedding_result = await embedding_service.aembed_chunks(chunks_to_embed)
    except EmbeddingError as exc:
        logger.error(f"Embedding error during ingestion for '{clean_bot_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Embedding provider failure: {exc}",
        )

    # 5. Index into Pinecone under chatbot_id namespace
    try:
        upsert_result = vector_store.upsert_chunks(
            chatbot_id=clean_bot_id,
            chunks=embedding_result.embedded_chunks,
        )
    except VectorStoreError as exc:
        logger.error(f"Vector store indexing failed for '{clean_bot_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector store indexing error: {exc}",
        )

    # 6. Auto-generate brand persona and starter questions from the homepage
    bot_persona: Optional[BotPersona] = None
    try:
        homepage_crawl = crawl_result.successful_pages[0]
        bot_persona = await persona_generator_service.agenerate_persona(
            homepage_text=homepage_crawl.markdown or homepage_crawl.clean_text,
            website_url=url_str,
            raw_bot_name=clean_bot_id,
        )
    except Exception as persona_err:
        logger.warning(f"Persona generation failed for '{clean_bot_id}': {persona_err}")

    logger.info(
        f"Completed ingestion for chatbot '{clean_bot_id}': "
        f"{pages_crawled} pages crawled ({pages_failed} failed), {upsert_result.upserted_count} chunks indexed."
    )

    return IngestionResponse(
        chatbot_id=clean_bot_id,
        website_url=url_str,
        pages_crawled=pages_crawled,
        chunks_indexed=upsert_result.upserted_count,
        pages_discovered=pages_discovered,
        pages_failed=pages_failed,
        persona=bot_persona,
        success=True,
    )
