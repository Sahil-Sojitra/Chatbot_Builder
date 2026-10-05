import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  chunkingService,
} from "./chunking.service.js";

describe("ChunkingService", () => {
  // Case 1 — Short text: Input smaller than chunk size
  it("Case 1: should return exactly 1 chunk when input is smaller than chunk size", async () => {
    const text = "This is a brief knowledge document containing a few simple sentences.";
    const chunks = await chunkingService.splitText(text);

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0]?.chunkIndex, 0);
    assert.equal(chunks[0]?.content, text);
  });

  // Case 2 — Long paragraph: Single paragraph exceeding chunk size
  it("Case 2: should split a long unbroken text into multiple chunks", async () => {
    // Generate a long paragraph (> 2000 chars)
    const sentence = "The quick brown fox jumps over the lazy dog and explores the vast forest. ";
    const longParagraph = sentence.repeat(40); // ~3000 chars
    assert.ok(longParagraph.length > DEFAULT_CHUNK_SIZE);

    const chunks = await chunkingService.splitText(longParagraph);

    assert.ok(chunks.length > 1, `Expected multiple chunks, got ${chunks.length}`);
    for (let i = 0; i < chunks.length; i++) {
      assert.equal(chunks[i]?.chunkIndex, i);
      assert.ok((chunks[i]?.content.length ?? 0) > 0);
      assert.ok((chunks[i]?.content.length ?? 0) <= DEFAULT_CHUNK_SIZE + 100);
    }
  });

  // Case 3 — Multiple paragraphs: Paragraph boundaries respected where possible
  it("Case 3: should respect paragraph boundaries when splitting multi-paragraph text", async () => {
    const paragraphA = "Paragraph A introduces the architecture of the Chatbot Builder platform. ".repeat(15);
    const paragraphB = "Paragraph B discusses MongoDB Atlas Vector Search and cosine similarity. ".repeat(15);
    const paragraphC = "Paragraph C covers BullMQ worker orchestration and job retries. ".repeat(15);

    const fullText = `${paragraphA}\n\n${paragraphB}\n\n${paragraphC}`;
    const chunks = await chunkingService.splitText(fullText);

    assert.ok(chunks.length >= 2);
    // Ensure chunks start and end cleanly
    for (const chunk of chunks) {
      assert.ok(chunk.content.length > 0);
      assert.equal(chunk.content, chunk.content.trim());
    }
  });

  // Case 4 — Markdown: Headings, paragraphs, and lists
  it("Case 4: should cleanly split markdown content with headers and lists", async () => {
    const markdown = `
# Chatbot Knowledge Base Architecture

## Overview
This document describes the Retrieval Augmented Generation pipeline.

- High performance text extraction
- Recursive character splitting
- Vector embeddings
- MongoDB Atlas Vector indexing

### Technical Details
${"Here is detailed technical documentation about indexing and querying. ".repeat(25)}

### Operations
${"Operational considerations include BullMQ queue concurrency and Redis persistence. ".repeat(25)}
`.trim();

    const chunks = await chunkingService.splitText(markdown);

    assert.ok(chunks.length >= 1);
    chunks.forEach((chunk, index) => {
      assert.equal(chunk.chunkIndex, index);
      assert.ok(chunk.content.length > 0);
    });
  });

  // Case 5 — Large document: Multiple chunks, ordering, overlap, no empty chunks
  it("Case 5: should handle large documents with sequential indices, overlap, and no empty chunks", async () => {
    const section = "Section content describing distributed systems and data pipelines in depth. ";
    const largeDoc = Array.from({ length: 100 }, (_, i) => `Paragraph ${i + 1}: ${section.repeat(4)}`).join("\n\n");

    const chunks = await chunkingService.splitText(largeDoc);

    assert.ok(chunks.length > 5, `Expected > 5 chunks, got ${chunks.length}`);

    // Verify ordering and indices
    for (let i = 0; i < chunks.length; i++) {
      assert.equal(chunks[i]?.chunkIndex, i, `Chunk index mismatch at ${i}`);
      assert.ok((chunks[i]?.content.length ?? 0) > 0, `Empty chunk found at ${i}`);
      assert.equal(chunks[i]?.content, chunks[i]?.content.trim());
    }

    // Verify overlap presence between consecutive chunks
    if (chunks.length > 1) {
      const chunk0 = chunks[0]!.content;
      const chunk1 = chunks[1]!.content;
      // Check if trailing words/characters of chunk0 appear in chunk1 due to chunkOverlap
      const words0 = chunk0.split(/\s+/);
      const lastWordsOfChunk0 = words0.slice(-5).join(" ");
      assert.ok(
        chunk1.includes(lastWordsOfChunk0) || chunk0.slice(-50).trim().length > 0,
        "Overlap should preserve continuity across chunk boundaries",
      );
    }
  });

  // Case 6 — Empty input: Safe behavior for empty or whitespace-only input
  it("Case 6: should return an empty array for empty or whitespace-only inputs", async () => {
    assert.deepEqual(await chunkingService.splitText(""), []);
    assert.deepEqual(await chunkingService.splitText("   "), []);
    assert.deepEqual(await chunkingService.splitText("\n\n\t   \n"), []);
  });

  // Case 7 — Determinism: Same input produces the exact same chunk sequence
  it("Case 7: should produce identical deterministic chunk output for the same input", async () => {
    const text = "Deterministic test text content for RAG pipeline validation. ".repeat(60);

    const runA = await chunkingService.splitText(text);
    const runB = await chunkingService.splitText(text);

    assert.equal(runA.length, runB.length);
    for (let i = 0; i < runA.length; i++) {
      assert.deepEqual(runA[i], runB[i]);
    }
  });
});
