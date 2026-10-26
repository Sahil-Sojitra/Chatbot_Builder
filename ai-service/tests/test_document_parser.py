"""Tests for DocumentParserService across all supported formats."""

import io
import pytest
from PIL import Image
import docx
import pptx
from pypdf import PdfWriter

from app.services.document_parser import (
    document_parser_service,
    DocumentParsingError,
)


@pytest.mark.asyncio
async def test_parse_text_and_markdown():
    """Test plain text and markdown extraction."""
    txt_content = b"Welcome to the knowledge base.\n\nHere is paragraph two with details."
    res = await document_parser_service.parse_document(txt_content, "sample.txt")

    assert res.file_type == "txt"
    assert res.char_count > 0
    assert len(res.sections) == 2
    assert "knowledge base" in res.full_text

    md_content = b"# Product Guide\n\nFeatures of our AI platform.\n\n## Pricing\n\n$10/month"
    md_res = await document_parser_service.parse_document(md_content, "guide.md")
    assert md_res.file_type == "md"
    assert "Pricing" in md_res.full_text


@pytest.mark.asyncio
async def test_parse_csv():
    """Test CSV tabular extraction into Markdown table format."""
    csv_bytes = b"Plan,Price,Tokens\nStarter,$19,50000\nPro,$49,200000\nEnterprise,Custom,Unlimited\n"
    res = await document_parser_service.parse_document(csv_bytes, "pricing.csv")

    assert res.file_type == "csv"
    assert "| Plan | Price | Tokens |" in res.full_text
    assert "| Starter | $19 | 50000 |" in res.full_text
    assert res.metadata["rows_count"] == 4


@pytest.mark.asyncio
async def test_parse_docx():
    """Test Word (.docx) extraction with headings, paragraphs, and tables."""
    doc = docx.Document()
    doc.add_heading("Company Handbook", level=1)
    doc.add_paragraph("Employees must adhere to safety guidelines.")
    doc.add_heading("Departments", level=2)
    table = doc.add_table(rows=2, cols=2)
    table.rows[0].cells[0].text = "Dept"
    table.rows[0].cells[1].text = "Head"
    table.rows[1].cells[0].text = "Engineering"
    table.rows[1].cells[1].text = "Alice"

    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    res = await document_parser_service.parse_document(docx_bytes, "handbook.docx")

    assert res.file_type == "docx"
    assert "Company Handbook" in res.full_text
    assert "safety guidelines" in res.full_text
    assert "| Dept | Head |" in res.full_text
    assert "| Engineering | Alice |" in res.full_text


@pytest.mark.asyncio
async def test_parse_pptx():
    """Test PowerPoint (.pptx) extraction with slides, shapes, and notes."""
    prs = pptx.Presentation()
    slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(slide_layout)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    title.text = "Q3 Earnings Presentation"
    subtitle.text = "Revenue grew by 24% year over year."

    buf = io.BytesIO()
    prs.save(buf)
    pptx_bytes = buf.getvalue()

    res = await document_parser_service.parse_document(pptx_bytes, "earnings.pptx")

    assert res.file_type == "pptx"
    assert res.total_pages_or_slides == 1
    assert "Q3 Earnings Presentation" in res.full_text
    assert "24%" in res.full_text


@pytest.mark.asyncio
async def test_parse_pdf():
    """Test PDF (.pdf) extraction page-by-page."""
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    # Note: pypdf blank page has minimal metadata
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    # Empty page should trigger clean error if no text
    with pytest.raises(DocumentParsingError):
        await document_parser_service.parse_document(pdf_bytes, "empty.pdf")


@pytest.mark.asyncio
async def test_parse_image(monkeypatch):
    """Test image format detection and dimension extraction."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    img = Image.new("RGB", (200, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    # Image parser returns structured result when key is not supplied
    res = await document_parser_service.parse_document(img_bytes, "chart.png")

    assert res.file_type == "image"
    assert res.metadata["width"] == 200
    assert res.metadata["height"] == 100
    assert len(res.sections) == 1
    assert "200x100" in res.full_text


@pytest.mark.asyncio
async def test_chunk_document_preserves_citations():
    """Verify chunk_document preserves document structure and canonical URLs."""
    from app.services.chunker import chunker_service

    csv_bytes = b"Product,Category,Price\nWidget A,Tools,15.99\nGadget B,Electronics,49.99\n"
    res = await document_parser_service.parse_document(csv_bytes, "catalog.csv")
    chunks = chunker_service.chunk_document(res)

    assert len(chunks) >= 1
    chunk = chunks[0]
    assert chunk.source_url == "doc://catalog.csv"
    assert "catalog.csv" in chunk.canonical_url
    assert "Widget A" in chunk.content
    assert chunk.token_count > 0
    assert chunk.metadata["file_type"] == "csv"

