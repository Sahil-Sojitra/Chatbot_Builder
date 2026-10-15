from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, HttpUrl, Field

from app.schemas.ingestion import WebsiteIngestionRequest
from app.services.crawler import (
    crawler_service,
    CrawlResult,
    LinkDiscoveryResult,
    MultiPageCrawlResult,
)
from app.services.content_normalizer import (
    content_normalizer,
    NormalizationResult,
)
from app.services.chunker import (
    chunker_service,
    ChunkingResult,
)
from app.services.embedding import (
    embedding_service,
    BatchEmbeddingResult,
    QueryEmbeddingResult,
    EmbeddingError,
)
from app.services.vector_store import (
    vector_store,
    VectorSearchResult,
    VectorUpsertResult,
    VectorDeleteResult,
    VectorStoreError,
)
from app.services.retrieval import (
    retrieval_service,
    RetrievalResult,
    RetrievalError,
    InvalidQueryError,
)

router = APIRouter(prefix="/demo", tags=["Demo / Temporary Testing"])


class SinglePageCrawlRequest(BaseModel):
    url: HttpUrl


class LinkDiscoveryRequest(BaseModel):
    url: HttpUrl
    max_links: int = 20


class MultiPageCrawlRequest(BaseModel):
    url: HttpUrl
    max_pages: int = Field(
        default=10,
        ge=1,
        le=20,
        description="Maximum internal pages to crawl (1 to 20)",
    )


@router.post("/validate-ingestion")
def demo_validate_ingestion(payload: WebsiteIngestionRequest):
    """Temporary endpoint demonstrating request validation for website ingestion.

    Does not trigger crawling or network requests.
    """
    return {
        "message": "Payload is valid",
        "validated_data": {
            "chatbot_id": payload.chatbot_id,
            "website_url": str(payload.website_url),
            "max_pages": payload.max_pages,
        },
    }


@router.post("/crawl-single-page", response_model=CrawlResult)
async def demo_crawl_single_page(payload: SinglePageCrawlRequest):
    """Temporary testing endpoint that runs the single-page crawler on a validated URL."""
    result = await crawler_service.crawl_page(str(payload.url))
    if not result.success and "SSRF Security Violation" in (result.error_message or ""):
        raise HTTPException(status_code=400, detail=result.error_message)

    return result


@router.post("/discover-links", response_model=LinkDiscoveryResult)
async def demo_discover_links(payload: LinkDiscoveryRequest):
    """Temporary testing endpoint to discover eligible internal links from a starting page."""
    result = await crawler_service.discover_internal_links(
        starting_url=str(payload.url),
        max_links=payload.max_links,
    )
    if not result.success and "SSRF Security Violation" in (result.error_message or ""):
        raise HTTPException(status_code=400, detail=result.error_message)

    return result


@router.post("/crawl-multipage", response_model=MultiPageCrawlResult)
async def demo_crawl_multipage(payload: MultiPageCrawlRequest):
    """Temporary testing endpoint executing bounded multi-page crawling."""
    result = await crawler_service.crawl_multipage(
        starting_url=str(payload.url),
        max_pages=payload.max_pages,
    )
    if not result.success and "SSRF Security Violation" in (result.error_message or ""):
        raise HTTPException(status_code=400, detail=result.error_message)

    return result


@router.post("/crawl-and-normalize", response_model=NormalizationResult)
async def demo_crawl_and_normalize(payload: MultiPageCrawlRequest):
    """Convenience testing endpoint: crawls multiple pages and normalizes the output."""
    crawl_result = await crawler_service.crawl_multipage(
        starting_url=str(payload.url),
        max_pages=payload.max_pages,
    )
    if not crawl_result.success and "SSRF Security Violation" in (crawl_result.error_message or ""):
        raise HTTPException(status_code=400, detail=crawl_result.error_message)

    return content_normalizer.normalize_pages(crawl_result)


@router.post("/normalize-content", response_model=NormalizationResult)
def demo_normalize_content(pages: list[dict]):
    """Testing endpoint to normalize a list of raw page objects without triggering network requests."""
    return content_normalizer.normalize_pages(pages)


@router.post("/chunk-pages", response_model=ChunkingResult)
def demo_chunk_pages(pages: list[dict], chunk_size: int = 500, chunk_overlap: int = 100):
    """Testing endpoint to chunk normalized or raw page dictionaries without network calls."""
    normalized = content_normalizer.normalize_pages(pages)
    return chunker_service.chunk_pages(normalized, chunk_size=chunk_size, chunk_overlap=chunk_overlap)


@router.post("/crawl-and-chunk", response_model=ChunkingResult)
async def demo_crawl_and_chunk(payload: MultiPageCrawlRequest, chunk_size: int = 500, chunk_overlap: int = 100):
    """Convenience testing endpoint: crawls, normalizes, and chunks a website end-to-end."""
    crawl_result = await crawler_service.crawl_multipage(
        starting_url=str(payload.url),
        max_pages=payload.max_pages,
    )
    if not crawl_result.success and "SSRF Security Violation" in (crawl_result.error_message or ""):
        raise HTTPException(status_code=400, detail=crawl_result.error_message)

    normalized = content_normalizer.normalize_pages(crawl_result)
    return chunker_service.chunk_pages(normalized, chunk_size=chunk_size, chunk_overlap=chunk_overlap)


class QueryEmbeddingRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query to embed with Voyage AI.")


@router.post("/embed-query", response_model=QueryEmbeddingResult)
def demo_embed_query(payload: QueryEmbeddingRequest):
    """Testing endpoint to generate vector embedding for a search query using Voyage AI."""
    try:
        return embedding_service.embed_query(payload.query)
    except EmbeddingError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/crawl-chunk-embed", response_model=BatchEmbeddingResult)
async def demo_crawl_chunk_embed(payload: MultiPageCrawlRequest):
    """Convenience testing endpoint: crawls, normalizes, chunks, and generates embeddings."""
    crawl_result = await crawler_service.crawl_multipage(
        starting_url=str(payload.url),
        max_pages=payload.max_pages,
    )
    if not crawl_result.success and "SSRF Security Violation" in (crawl_result.error_message or ""):
        raise HTTPException(status_code=400, detail=crawl_result.error_message)

    normalized = content_normalizer.normalize_pages(crawl_result)
    chunking_result = chunker_service.chunk_pages(normalized)

    try:
        return await embedding_service.aembed_chunks(chunking_result.chunks)
    except EmbeddingError as err:
        raise HTTPException(status_code=400, detail=str(err))


class VectorSearchRequest(BaseModel):
    chatbot_id: str = Field(..., min_length=1, description="Chatbot identifier owning the knowledge base.")
    query: str = Field(..., min_length=1, description="Natural language user query.")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of similar chunks to retrieve.")
    score_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Minimum similarity score.")


@router.get("/vector-store/health")
def demo_vector_store_health():
    """Testing endpoint to check vector database (Pinecone) connection and index status."""
    is_healthy = vector_store.health_check()
    return {
        "connected": is_healthy,
        "database": "Pinecone",
        "index_name": vector_store.index_name,
    }


@router.post("/vector-store/query", response_model=list[VectorSearchResult])
def demo_vector_store_query(payload: VectorSearchRequest):
    """Testing endpoint to perform semantic similarity search against Pinecone for a chatbot."""
    try:
        # 1. Embed query using Voyage AI (input_type='query')
        q_result = embedding_service.embed_query(payload.query)

        # 2. Query Pinecone using namespace=chatbot_id
        return vector_store.query_similar(
            chatbot_id=payload.chatbot_id,
            query_vector=q_result.embedding,
            top_k=payload.top_k,
            score_threshold=payload.score_threshold,
        )
    except (EmbeddingError, VectorStoreError) as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.delete("/vector-store/{chatbot_id}", response_model=VectorDeleteResult)
def demo_vector_store_delete(chatbot_id: str):
    """Testing endpoint to delete all vectors belonging to a specific chatbot."""
    try:
        return vector_store.delete_chatbot_content(chatbot_id=chatbot_id)
    except VectorStoreError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/crawl-embed-index", response_model=VectorUpsertResult)
async def demo_crawl_embed_index(payload: WebsiteIngestionRequest):
    """End-to-End Pipeline test: Crawl -> Normalize -> Chunk -> Voyage Embed -> Pinecone Index."""
    # 1. Multi-page crawl
    crawl_result = await crawler_service.crawl_multipage(
        starting_url=str(payload.website_url),
        max_pages=payload.max_pages,
    )
    if not crawl_result.success and "SSRF Security Violation" in (crawl_result.error_message or ""):
        raise HTTPException(status_code=400, detail=crawl_result.error_message)

    # 2. Normalize
    normalized = content_normalizer.normalize_pages(crawl_result)

    # 3. Chunk
    chunking_result = chunker_service.chunk_pages(normalized)

    # 4. Generate Voyage AI embeddings
    try:
        embedding_result = await embedding_service.aembed_chunks(chunking_result.chunks)
    except EmbeddingError as err:
        raise HTTPException(status_code=400, detail=f"Embedding error: {err}")

    # 5. Index into Pinecone under chatbot_id namespace
    try:
        return vector_store.upsert_chunks(
            chatbot_id=payload.chatbot_id,
            chunks=embedding_result.embedded_chunks,
        )
    except VectorStoreError as err:
        raise HTTPException(status_code=400, detail=f"Vector store error: {err}")


class KnowledgeRetrievalRequest(BaseModel):
    chatbot_id: str = Field(..., min_length=1, description="Chatbot identifier owning the knowledge base.")
    query: str = Field(..., min_length=1, description="Question or search query.")
    top_k: int = Field(default=4, ge=1, le=20, description="Conservative default number of chunks to retrieve.")
    score_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Optional minimum score cutoff.")


@router.post("/retrieval", response_model=RetrievalResult)
async def demo_knowledge_retrieval(payload: KnowledgeRetrievalRequest):
    """Testing endpoint to run semantic knowledge retrieval for a chatbot question."""
    try:
        return await retrieval_service.aretrieve(
            chatbot_id=payload.chatbot_id,
            query=payload.query,
            top_k=payload.top_k,
            score_threshold=payload.score_threshold,
        )
    except InvalidQueryError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except RetrievalError as err:
        raise HTTPException(status_code=500, detail=str(err))
