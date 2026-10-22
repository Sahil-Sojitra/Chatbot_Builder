import { Agent, setGlobalDispatcher } from "undici";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const DEFAULT_INGEST_TIMEOUT_MS = 900_000; // 15 minutes for thorough crawling and embedding without premature timeout
const DEFAULT_QA_TIMEOUT_MS = 45_000;     // 45 seconds for retrieval + Gemini answer

// Configure global dispatcher so undici fetch doesn't abort long crawl/index operations
setGlobalDispatcher(
  new Agent({
    headersTimeout: DEFAULT_INGEST_TIMEOUT_MS,
    bodyTimeout: DEFAULT_INGEST_TIMEOUT_MS,
    connectTimeout: 30_000,
  }),
);

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

export interface BotPersona {
  brand_name: string;
  tagline?: string;
  company_description?: string;
  suggested_system_prompt?: string;
  starter_questions?: string[];
}

export interface IngestWebsiteResponse {
  chatbot_id: string;
  website_url: string;
  pages_crawled: number;
  chunks_indexed: number;
  pages_discovered?: number;
  pages_failed?: number;
  persona?: BotPersona;
  success: boolean;
  error_message: string | null;
}

export interface AskQuestionPayload {
  chatbotId: string;
  question: string;
  botName?: string | undefined;
  websiteUrl?: string | undefined;
  systemPrompt?: string | undefined;
  topK?: number | undefined;
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
    const start = performance.now();

    logger.info("AI-CLIENT", `-> POST /api/v1/ingest/website [bot=${payload.chatbotId}, url=${payload.websiteUrl}]`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          chatbot_id: payload.chatbotId,
          website_url: payload.websiteUrl,
          ...(payload.maxPages !== undefined ? { max_pages: payload.maxPages } : {}),
        }),
        signal: controller.signal,
      });

      const elapsed = ((performance.now() - start) / 1000).toFixed(2);

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
        let errorCode = "AI_SERVICE_ERROR";
        if (response.status === 422 || safeErrorMessage.toLowerCase().includes("bot security verification")) {
          errorCode = "BOT_PROTECTION_BLOCKED";
        }
        logger.error("AI-CLIENT", `<- ${response.status} Error on /ingest/website (${elapsed}s): ${safeErrorMessage}`);
        throw new AIServiceError(response.status, errorCode, safeErrorMessage);
      }

      const result = (await response.json()) as IngestWebsiteResponse;
      logger.info(
        "AI-CLIENT",
        `<- 200 OK /ingest/website (${elapsed}s): crawled=${result.pages_crawled}, indexed=${result.chunks_indexed} chunks`,
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof AIServiceError) {
        throw err;
      }
      const elapsed = ((performance.now() - start) / 1000).toFixed(2);
      if (err instanceof Error && err.name === "AbortError") {
        logger.error("AI-CLIENT", `<- Ingestion timed out after ${timeoutMs}ms (${elapsed}s)`);
        throw new AIServiceError(504, "AI_SERVICE_TIMEOUT", `AI service ingestion timed out after ${timeoutMs}ms`);
      }
      logger.error("AI-CLIENT", `<- Ingestion failed (${elapsed}s):`, err);
      const causeMsg = (err as any)?.cause?.message ? ` (${(err as any).cause.message})` : "";
      const message = err instanceof Error ? `${err.message}${causeMsg}` : "Unknown network error communicating with AI service";
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
    const start = performance.now();

    const shortQ = payload.question.length > 50 ? `${payload.question.substring(0, 50)}...` : payload.question;
    logger.info("AI-CLIENT", `-> POST /api/v1/chat/ask [bot=${payload.chatbotId}] "${shortQ}"`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          chatbot_id: payload.chatbotId,
          question: payload.question,
          bot_name: payload.botName,
          website_url: payload.websiteUrl,
          system_prompt: payload.systemPrompt,
          top_k: payload.topK ?? 8,
        }),
        signal: controller.signal,
      });

      const elapsed = ((performance.now() - start) / 1000).toFixed(2);

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
        logger.error("AI-CLIENT", `<- ${response.status} Error on /chat/ask (${elapsed}s): ${safeErrorMessage}`);
        throw new AIServiceError(response.status, "AI_SERVICE_ERROR", safeErrorMessage);
      }

      const result = (await response.json()) as AskQuestionResponse;
      logger.info(
        "AI-CLIENT",
        `<- 200 OK /chat/ask (${elapsed}s): answerLen=${result.answer?.length || 0}, sources=${result.sources?.length || 0}`,
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof AIServiceError) {
        throw err;
      }
      const elapsed = ((performance.now() - start) / 1000).toFixed(2);
      if (err instanceof Error && err.name === "AbortError") {
        logger.error("AI-CLIENT", `<- /chat/ask timed out after ${timeoutMs}ms (${elapsed}s)`);
        throw new AIServiceError(504, "AI_SERVICE_TIMEOUT", `AI service question answering timed out after ${timeoutMs}ms`);
      }
      logger.error("AI-CLIENT", `<- /chat/ask failed (${elapsed}s):`, err);
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

  /**
   * Cleans up all indexed vector embeddings and chunks for a chatbot.
   */
  async deleteChatbotContent(chatbotId: string): Promise<boolean> {
    const urls = [
      `${this.baseUrl}/api/v1/ingest/chatbot/${encodeURIComponent(chatbotId)}`,
      `${this.baseUrl}/vector-store/${encodeURIComponent(chatbotId)}`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: "DELETE",
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) return true;
      } catch {
        // Continue to fallback or ignore if endpoint is not mounted
      }
    }
    return false;
  }
}

export const aiServiceClient = new AIServiceClient();
