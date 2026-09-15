import { downloadObject } from "../../../shared/r2.js";
import type { IKnowledgeSource } from "../knowledgeSource.model.js";

/**
 * Output of the acquisition layer: plain normalized text, nothing more.
 * Deliberately minimal and replaceable — the future pipeline
 * (normalized text -> chunking -> embedding -> vector storage) consumes
 * exactly this shape, so it can be swapped for a richer one later without
 * touching the dispatch logic in acquireContent().
 */
export interface AcquiredContent {
  text: string;
}

/**
 * Very small HTML-to-text reduction for URL/WEBPAGE sources: drops
 * script/style/comments, strips remaining tags, unescapes the handful of
 * common entities, and collapses whitespace. This is intentionally not a
 * real HTML parser (no DOM, no cheerio/jsdom dependency) — good enough to
 * hand normalized text to a future chunking step, not a content-fidelity
 * guarantee. Revisit if source pages need structure-aware extraction later.
 */
const stripHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const fetchUrlText = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL (status ${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  return contentType.includes("html") ? stripHtml(body) : body.trim();
};

/**
 * Plain-text-decodable file types are read as UTF-8 directly. PDF and DOCX
 * need real parsing and are handled via `pdf-parse` / `mammoth` — the
 * minimal, standard libraries for each format, loaded lazily so a worker
 * that never touches a PDF/DOCX never pays their startup cost.
 */
const extractFileText = async (source: IKnowledgeSource): Promise<string> => {
  if (!source.storageKey) {
    throw new Error("FILE knowledge source is missing a storageKey");
  }
  if (!source.mimeType) {
    throw new Error("FILE knowledge source is missing a mimeType");
  }

  const buffer = await downloadObject(source.storageKey);

  switch (source.mimeType) {
    case "text/plain":
    case "text/csv":
    case "text/markdown":
      return buffer.toString("utf-8").trim();

    case "application/pdf": {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text.trim();
    }

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }

    default:
      throw new Error(
        `No text-extraction handler for mimeType "${source.mimeType}"`,
      );
  }
};

/**
 * Dispatches on KnowledgeSource.type — not on any file-format assumption —
 * so URL/WEBPAGE/TEXT/FILE are all first-class here. FILE further dispatches
 * on mimeType internally, but that's an implementation detail of the FILE
 * branch, not of this function's shape.
 */
export const acquireContent = async (
  source: IKnowledgeSource,
): Promise<AcquiredContent> => {
  switch (source.type) {
    case "TEXT": {
      if (!source.sourceText) {
        throw new Error("TEXT knowledge source is missing sourceText");
      }
      return { text: source.sourceText.trim() };
    }

    case "URL":
    case "WEBPAGE": {
      if (!source.sourceUrl) {
        throw new Error(`${source.type} knowledge source is missing sourceUrl`);
      }
      return { text: await fetchUrlText(source.sourceUrl) };
    }

    case "FILE":
      return { text: await extractFileText(source) };
  }
};
