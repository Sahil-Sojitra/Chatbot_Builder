import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from tokenizers import Tokenizer
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.services.content_normalizer import NormalizedPageRecord, NormalizationResult

logger = logging.getLogger(__name__)


class ContentChunk(BaseModel):
    """Represents a bounded, coherent segment of a web page ready for embedding."""

    chunk_id: str = Field(
        ...,
        description="Deterministic stable unique identifier derived from canonical URL, chunk index, and content.",
    )
    source_url: str = Field(..., description="The original source URL of the page.")
    canonical_url: str = Field(..., description="The canonicalized URL of the page.")
    title: Optional[str] = Field(None, description="The title of the page.")
    content: str = Field(..., description="The text/markdown chunk content.")
    chunk_index: int = Field(..., description="Zero-based sequence index of this chunk within its parent page.")
    token_count: int = Field(..., description="Exact token count of this chunk based on the tokenizer.")
    char_count: int = Field(..., description="Character length of this chunk.")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Inherited page metadata and chunk-level indicators.",
    )


class ChunkingStats(BaseModel):
    """Statistical summary of a chunking operation."""

    total_pages_processed: int = Field(0, description="Total input pages provided for chunking.")
    total_chunks_created: int = Field(0, description="Total number of chunks produced.")
    avg_tokens_per_chunk: float = Field(0.0, description="Average token count across all created chunks.")
    min_tokens: int = Field(0, description="Smallest chunk size in tokens (0 if no chunks).")
    max_tokens: int = Field(0, description="Largest chunk size in tokens (0 if no chunks).")
    empty_pages_skipped: int = Field(0, description="Number of empty or sub-threshold pages skipped.")


class ChunkingResult(BaseModel):
    """Result of batch chunking containing all chunks and summary statistics."""

    chunks: List[ContentChunk] = Field(default_factory=list)
    stats: ChunkingStats
    success: bool = True


class ContentChunker:
    """Service responsible for splitting normalized web content into semantically coherent,

    bounded chunks optimized for dense vector embedding and retrieval (RAG).

    Uses LangChain's industry-standard RecursiveCharacterTextSplitter parameterized
    with Google's official local Gemini 256k BPE tokenizer.
    """

    DEFAULT_CHUNK_SIZE: int = 500  # Target tokens per chunk
    DEFAULT_CHUNK_OVERLAP: int = 100  # Overlap tokens between consecutive chunks
    MIN_CHUNK_TOKENS: int = 5  # Discard negligible fragments

    # Hierarchical boundary separators preserving markdown structure and natural language
    SEPARATORS: List[str] = [
        "\n# ",
        "\n## ",
        "\n### ",
        "\n#### ",
        "\n\n",
        "\n",
        ". ",
        "? ",
        "! ",
        "; ",
        " ",
        "",
    ]

    def __init__(self):
        """Initializes the local Google Gemini 256k BPE tokenizer

        (identical to text-embedding-004, gemini-1.5, and gemini-2.0).
        """
        self._gemini_tokenizer: Optional[Tokenizer] = None

        local_path = Path(__file__).resolve().parent.parent / "data" / "gemini_tokenizer.json"
        if local_path.exists():
            try:
                self._gemini_tokenizer = Tokenizer.from_file(str(local_path))
            except Exception as exc:
                logger.warning(f"Failed to load local Gemini tokenizer from {local_path}: {exc}")

        if self._gemini_tokenizer is None:
            try:
                self._gemini_tokenizer = Tokenizer.from_pretrained("alpindale/gemma-2b")
                # Cache locally for offline usage
                local_path.parent.mkdir(parents=True, exist_ok=True)
                self._gemini_tokenizer.save(str(local_path))
            except Exception as exc:
                logger.error(f"Failed to initialize Google Gemini tokenizer: {exc}")

    def count_tokens(self, text: str) -> int:
        """Counts tokens using the local Google Gemini 256k BPE tokenizer."""
        if not text:
            return 0
        if self._gemini_tokenizer is not None:
            return len(self._gemini_tokenizer.encode(text, add_special_tokens=False).ids)
        # Fallback approximation only if tokenizer failed to initialize (1 token ~= 4 characters in English)
        return max(1, len(text) // 4)

    def generate_chunk_id(self, canonical_url: str, chunk_index: int, content: str) -> str:
        """Generates a stable, deterministic, collision-resistant identifier for a chunk.

        Format: chk_<sha256(canonical_url + index + content)[:20]>
        Ensures idempotent upserts into vector databases.
        """
        seed = f"{canonical_url.strip()}::{chunk_index}::{content.strip()}"
        digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:20]
        return f"chk_{digest}"

    def get_splitter(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> RecursiveCharacterTextSplitter:
        """Returns a configured RecursiveCharacterTextSplitter instance."""
        return RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=self.count_tokens,
            separators=self.SEPARATORS,
            is_separator_regex=False,
        )

    def chunk_page(
        self,
        page: Union[NormalizedPageRecord, Dict[str, Any]],
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> List[ContentChunk]:
        """Splits a single normalized page into bounded chunks."""
        # 1. Extract fields
        if isinstance(page, NormalizedPageRecord):
            source_url = page.source_url
            canonical_url = page.canonical_url
            title = page.title
            content = page.content
            page_meta = dict(page.metadata)
        elif isinstance(page, dict):
            source_url = page.get("source_url") or page.get("url") or ""
            canonical_url = page.get("canonical_url") or source_url
            title = page.get("title")
            content = page.get("content") or page.get("markdown") or ""
            page_meta = dict(page.get("metadata", {}))
        else:
            return []

        if not content or not content.strip():
            return []

        # 2. Run recursive splitting
        splitter = self.get_splitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        raw_chunks = splitter.split_text(content.strip())

        chunks: List[ContentChunk] = []
        valid_idx = 0

        for raw_chunk in raw_chunks:
            cleaned = raw_chunk.strip()
            tokens = self.count_tokens(cleaned)

            # Skip empty or negligible fragments
            if not cleaned or tokens < self.MIN_CHUNK_TOKENS:
                continue

            chunk_id = self.generate_chunk_id(
                canonical_url=canonical_url,
                chunk_index=valid_idx,
                content=cleaned,
            )

            chunk = ContentChunk(
                chunk_id=chunk_id,
                source_url=source_url,
                canonical_url=canonical_url,
                title=title,
                content=cleaned,
                chunk_index=valid_idx,
                token_count=tokens,
                char_count=len(cleaned),
                metadata={
                    **page_meta,
                    "chunk_index": valid_idx,
                    "token_count": tokens,
                },
            )
            chunks.append(chunk)
            valid_idx += 1

        return chunks

    def chunk_pages(
        self,
        pages: Union[NormalizationResult, List[NormalizedPageRecord], List[Dict[str, Any]]],
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    ) -> ChunkingResult:
        """Splits a collection of normalized pages into chunks and computes summary statistics."""
        # Normalize input to list of items
        page_list: List[Any] = []
        if isinstance(pages, NormalizationResult):
            page_list = pages.records
        elif isinstance(pages, list):
            page_list = pages
        elif pages is not None:
            page_list = [pages]

        all_chunks: List[ContentChunk] = []
        empty_pages = 0

        for page in page_list:
            page_chunks = self.chunk_page(
                page=page,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
            if not page_chunks:
                empty_pages += 1
            else:
                all_chunks.extend(page_chunks)

        # Compute statistics
        total_chunks = len(all_chunks)
        if total_chunks > 0:
            token_counts = [c.token_count for c in all_chunks]
            avg_tokens = round(sum(token_counts) / total_chunks, 1)
            min_tokens = min(token_counts)
            max_tokens = max(token_counts)
        else:
            avg_tokens = 0.0
            min_tokens = 0
            max_tokens = 0

        stats = ChunkingStats(
            total_pages_processed=len(page_list),
            total_chunks_created=total_chunks,
            avg_tokens_per_chunk=avg_tokens,
            min_tokens=min_tokens,
            max_tokens=max_tokens,
            empty_pages_skipped=empty_pages,
        )

        return ChunkingResult(
            chunks=all_chunks,
            stats=stats,
            success=True,
        )


# Global singleton instance
chunker_service = ContentChunker()
