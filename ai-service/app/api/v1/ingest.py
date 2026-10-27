import os
import base64
import logging
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Header, status, File, UploadFile, Form
from pydantic import BaseModel, Field

from app.core.internal_auth import verify_internal_api_key
from app.schemas.ingestion import WebsiteIngestionRequest
from app.services.crawler import crawler_service, get_url_priority
from app.services.content_normalizer import content_normalizer
from app.services.chunker import chunker_service, ContentChunk
from app.services.embedding import embedding_service, EmbeddingError
from app.services.vector_store import vector_store, VectorStoreError, VectorDeleteResult
from app.services.persona_generator import persona_generator_service, BotPersona
from app.services.document_parser import document_parser_service, DocumentParsingError, ParsedDocumentResult

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ingest",
    tags=["Ingestion (v1)"],
    dependencies=[Depends(verify_internal_api_key)],
)


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


class DocumentIngestionResponse(BaseModel):
    """Result of parsing and indexing an uploaded document into a chatbot's vector store."""

    chatbot_id: str = Field(..., description="Target chatbot identifier.")
    filename: str = Field(..., description="Original filename of the ingested document.")
    file_type: str = Field(..., description="Detected document format (pdf, docx, pptx, csv, txt, md, image).")
    title: Optional[str] = Field(None, description="Extracted document title.")
    total_pages_or_slides: int = Field(1, description="Total pages in PDF, slides in PPTX, or sections in doc.")
    chunks_indexed: int = Field(0, description="Total content chunks indexed into the vector database.")
    char_count: int = Field(0, description="Total characters extracted from the document.")
    success: bool = Field(True, description="Whether the document was successfully parsed, embedded, and indexed.")
    error_message: Optional[str] = Field(None, description="Safe error details if ingestion failed.")


class DocumentBase64IngestionRequest(BaseModel):
    """Payload for direct base64-encoded document ingestion."""

    chatbot_id: str = Field(..., description="Target chatbot identifier.")
    filename: str = Field(..., description="Original filename with extension (e.g. guide.pdf, data.csv).")
    content_base64: str = Field(..., description="Base64 encoded file binary content.")
    mime_type: Optional[str] = Field(None, description="Optional MIME type override.")
    source_name: Optional[str] = Field(None, description="Optional custom source name.")
    llm_api_key: Optional[str] = Field(None, description="Optional BYOK API key for vision OCR.")
    llm_model: Optional[str] = Field(None, description="Optional LLM model override for vision OCR.")


@router.post(
    "/website",
    response_model=IngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest website content into chatbot knowledge base",
    description="Crawls a website, extracts text, chunks, embeds with Voyage AI, and indexes into Pinecone.",
)
async def ingest_website(
    payload: WebsiteIngestionRequest,
) -> IngestionResponse:
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
            raw_bot_name=None,
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


async def _process_and_index_document(
    chatbot_id: str,
    file_bytes: bytes,
    filename: str,
    mime_type: Optional[str] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
) -> DocumentIngestionResponse:
    """Core pipeline extracting, chunking, embedding, and indexing any supported document."""
    clean_bot_id = chatbot_id.strip()
    clean_filename = filename.strip()

    logger.info(f"Ingesting document '{clean_filename}' for chatbot '{clean_bot_id}' ({len(file_bytes)} bytes)")

    # 1. Parse document into structured sections
    try:
        parsed_doc: ParsedDocumentResult = await document_parser_service.parse_document(
            file_bytes=file_bytes,
            filename=clean_filename,
            mime_type=mime_type,
            api_key=api_key,
            model_name=model_name,
        )
    except DocumentParsingError as exc:
        logger.warning(f"Document parsing error for '{clean_filename}': {exc}")
        return DocumentIngestionResponse(
            chatbot_id=clean_bot_id,
            filename=clean_filename,
            file_type="unknown",
            success=False,
            error_message=str(exc),
        )

    # 2. Chunk document into semantic chunks
    chunks = chunker_service.chunk_document(parsed_doc)
    if not chunks:
        return DocumentIngestionResponse(
            chatbot_id=clean_bot_id,
            filename=clean_filename,
            file_type=parsed_doc.file_type,
            title=parsed_doc.title,
            total_pages_or_slides=parsed_doc.total_pages_or_slides,
            char_count=parsed_doc.char_count,
            chunks_indexed=0,
            success=False,
            error_message=f"Document '{clean_filename}' contained no indexable text fragments.",
        )

    # Hard data isolation: Stamp chatbot_id on every chunk metadata
    for chunk in chunks:
        chunk.metadata["chatbot_id"] = clean_bot_id

    # 3. Generate Voyage AI vector embeddings
    try:
        embedding_result = await embedding_service.aembed_chunks(chunks)
    except EmbeddingError as exc:
        logger.error(f"Embedding error for document '{clean_filename}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Embedding provider failure: {exc}",
        )

    # 4. Upsert into Pinecone under chatbot namespace
    try:
        upsert_result = vector_store.upsert_chunks(
            chatbot_id=clean_bot_id,
            chunks=embedding_result.embedded_chunks,
        )
    except VectorStoreError as exc:
        logger.error(f"Vector store error for document '{clean_filename}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector store indexing failure: {exc}",
        )

    logger.info(
        f"Successfully indexed document '{clean_filename}' for chatbot '{clean_bot_id}': "
        f"{upsert_result.upserted_count} chunks indexed across {parsed_doc.total_pages_or_slides} pages/slides."
    )

    return DocumentIngestionResponse(
        chatbot_id=clean_bot_id,
        filename=clean_filename,
        file_type=parsed_doc.file_type,
        title=parsed_doc.title,
        total_pages_or_slides=parsed_doc.total_pages_or_slides,
        chunks_indexed=upsert_result.upserted_count,
        char_count=parsed_doc.char_count,
        success=True,
    )


@router.post(
    "/document",
    response_model=DocumentIngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest a document file (PDF, Word, PPTX, CSV, TXT, Image) into chatbot vector store",
    description="Parses an uploaded document, chunks by page/slide/heading, embeds with Voyage AI, and upserts to Pinecone.",
)
async def ingest_document(
    chatbot_id: str = Form(...),
    file: UploadFile = File(...),
    source_name: Optional[str] = Form(None),
    llm_api_key: Optional[str] = Form(None),
    llm_model: Optional[str] = Form(None),
) -> DocumentIngestionResponse:
    file_bytes = await file.read()
    filename = source_name or file.filename or "uploaded_document"
    return await _process_and_index_document(
        chatbot_id=chatbot_id,
        file_bytes=file_bytes,
        filename=filename,
        mime_type=file.content_type,
        api_key=llm_api_key,
        model_name=llm_model,
    )


@router.post(
    "/document-raw",
    response_model=DocumentIngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest a base64-encoded document into chatbot vector store",
    description="Programmatic document ingestion accepting base64 binary content.",
)
async def ingest_document_raw(
    payload: DocumentBase64IngestionRequest,
) -> DocumentIngestionResponse:
    try:
        file_bytes = base64.b64decode(payload.content_base64)
    except Exception as b64_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 encoded document content: {b64_err}",
        )
    filename = payload.source_name or payload.filename
    return await _process_and_index_document(
        chatbot_id=payload.chatbot_id,
        file_bytes=file_bytes,
        filename=filename,
        mime_type=payload.mime_type,
        api_key=payload.llm_api_key,
        model_name=payload.llm_model,
    )


@router.delete("/chatbot/{chatbot_id}", response_model=VectorDeleteResult)
async def delete_chatbot_content(chatbot_id: str):
    """Deletes all indexed vectors and knowledge base content associated with a chatbot."""
    clean_bot_id = chatbot_id.strip()
    if not clean_bot_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chatbot ID must not be empty.",
        )
    try:
        result = vector_store.delete_chatbot_content(chatbot_id=clean_bot_id)
        if hasattr(result, "success") and not result.success:
            logger.error(f"Vector store deletion reported failure for chatbot '{clean_bot_id}'")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete chatbot vector store content.",
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to delete chatbot vectors for '{clean_bot_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete chatbot vector store content.",
        )
