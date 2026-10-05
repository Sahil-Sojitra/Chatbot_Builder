import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import type { ChunkOptions, TextChunk } from "./chunking.types.js";

/**
 * V1 Chunk configuration:
 * LangChain's RecursiveCharacterTextSplitter measures length in characters by default.
 * Sizing:
 *   - chunkSize: 2000 characters (character-based approximation of ~500 tokens)
 *   - chunkOverlap: 400 characters (character-based approximation of ~100 tokens)
 *   - separators: ["\n\n", "\n", " ", ""]
 *
 * This provides a fast, model-agnostic text splitting abstraction without coupling
 * to specific tokenizers (e.g. cl100k_base) before embedding models are finalized.
 */
export const DEFAULT_CHUNK_SIZE = 2000;
export const DEFAULT_CHUNK_OVERLAP = 400;
export const DEFAULT_SEPARATORS: string[] = ["\n\n", "\n", " ", ""];

export class ChunkingService {
  private readonly defaultSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.defaultSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: DEFAULT_CHUNK_SIZE,
      chunkOverlap: DEFAULT_CHUNK_OVERLAP,
      separators: DEFAULT_SEPARATORS,
    });
  }

  /**
   * Splits extracted text into ordered, application-owned TextChunk objects.
   *
   * @param text Raw or cleaned extracted text.
   * @param options Optional chunk size / overlap overrides.
   * @returns Array of TextChunk objects with content and 0-based chunkIndex.
   */
  async splitText(text: string, options?: ChunkOptions): Promise<TextChunk[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const splitter = options
      ? new RecursiveCharacterTextSplitter({
          chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
          chunkOverlap: options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
          separators: options.separators ?? DEFAULT_SEPARATORS,
        })
      : this.defaultSplitter;

    const rawSplits = await splitter.splitText(text);

    return rawSplits
      .map((content) => content.trim())
      .filter((content) => content.length > 0)
      .map((content, chunkIndex) => ({
        content,
        chunkIndex,
      }));
  }
}

export const chunkingService = new ChunkingService();
