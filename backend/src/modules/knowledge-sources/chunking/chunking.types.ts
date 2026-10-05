export interface TextChunk {
  content: string;
  chunkIndex: number;
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}
