import { env } from "../config/env.js";

export class AIServiceError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AIServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface IngestWebsitePayload {
  chatbotId: string;
  websiteUrl: string;
  maxPages?: number;
}

export interface IngestWebsiteResponse {
  chatbot_id: string;
  website_url: string;
  pages_crawled: number;
  chunks_indexed: number;
  success: boolean;
  error_message: string | null;
}

export interface AskQuestionPayload {
  chatbotId: string;
  question: string;
  topK?: number;
}

export interface SourceReference {
  chunk_id: string;
  source_url: string;
  canonical_url: string;
  title: string | null;
  score: number;
  snippet: string;
}

export interface AskQuestionResponse {
  chatbot_id: string;
  question: string;
  answer: string;
  sources: SourceReference[];
  has_grounded_evidence: boolean;
  stats: {
    retrieval_duration_ms: number;
    generation_duration_ms: number;
    total_duration_ms: number;
    model_used: string;
    chunks_retrieved: number;
  };
}

const DEFAULT_INGEST_TIMEOUT_MS = 60_000; // 60 seconds for web crawl + chunk + embed + pinecone
const DEFAULT_QA_TIMEOUT_MS = 20_000;     // 20 seconds for retrieval + Gemini answer

export class AIServiceClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl ?? env.AI_SERVICE_URL).replace(/\/+$/, "");
    this.apiKey = apiKey ?? env.AI_SERVICE_API_KEY;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }
    return headers;
  }

  /**
   * Triggers synchronous crawling, normalization, chunking, embedding, and vector indexing
   * in the FastAPI AI service for a chatbot's website.
   */
  async ingestWebsite(
    payload: IngestWebsitePayload,
    timeoutMs: number = DEFAULT_INGEST_TIMEOUT_MS,
  ): Promise<IngestWebsiteResponse> {
    const url = `${this.baseUrl}/api/v1/ingest/website`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          chatbot_id: payload.chatbotId,
          website_url: payload.websiteUrl,
          max_pages: payload.maxPages ?? 10,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let safeErrorMessage = `AI service returned HTTP ${response.status}`;
        try {
          const errorJson = (await response.json()) as { detail?: string };
          if (errorJson.detail) {
            safeErrorMessage = String(errorJson.detail);
          }
        } catch {
          // Response body was not JSON
        }
        throw new AIServiceError(response.status, "AI_SERVICE_ERROR", safeErrorMessage);
      }

      return (await response.json()) as IngestWebsiteResponse;
    } catch (err: unknown) {
      if (err instanceof AIServiceError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new AIServiceError(504, "AI_SERVICE_TIMEOUT", `AI service ingestion timed out after ${timeoutMs}ms`);
      }
      const message = err instanceof Error ? err.message : "Unknown network error communicating with AI service";
      throw new AIServiceError(502, "AI_SERVICE_UNAVAILABLE", `Failed to connect to AI service: ${message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Submits a question to the FastAPI AI service for RAG retrieval and grounded answer synthesis.
   */
  async askQuestion(
    payload: AskQuestionPayload,
    timeoutMs: number = DEFAULT_QA_TIMEOUT_MS,
  ): Promise<AskQuestionResponse> {
    const url = `${this.baseUrl}/api/v1/chat/ask`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          chatbot_id: payload.chatbotId,
          question: payload.question,
          top_k: payload.topK ?? 4,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let safeErrorMessage = `AI service returned HTTP ${response.status}`;
        try {
          const errorJson = (await response.json()) as { detail?: string };
          if (errorJson.detail) {
            safeErrorMessage = String(errorJson.detail);
          }
        } catch {
          // Response body was not JSON
        }
        throw new AIServiceError(response.status, "AI_SERVICE_ERROR", safeErrorMessage);
      }

      return (await response.json()) as AskQuestionResponse;
    } catch (err: unknown) {
      if (err instanceof AIServiceError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new AIServiceError(504, "AI_SERVICE_TIMEOUT", `AI service question answering timed out after ${timeoutMs}ms`);
      }
      const message = err instanceof Error ? err.message : "Unknown network error communicating with AI service";
      throw new AIServiceError(502, "AI_SERVICE_UNAVAILABLE", `Failed to connect to AI service: ${message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Verifies connectivity to the FastAPI AI service.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const aiServiceClient = new AIServiceClient();
