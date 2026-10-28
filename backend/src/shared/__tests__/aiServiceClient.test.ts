import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { AIServiceClient, AIServiceError } from "../aiServiceClient.js";

describe("AIServiceClient (Node.js -> FastAPI)", () => {
  const originalFetch = globalThis.fetch;
  let client: AIServiceClient;

  beforeEach(() => {
    client = new AIServiceClient("http://127.0.0.1:8000", "test-internal-key-123");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("successfully calls ingestWebsite and returns structured response", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = "";

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedUrl = String(input);
      capturedMethod = init?.method ?? "";
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = String(init?.body ?? "");

      const mockResponse = {
        chatbot_id: "bot_test_123",
        website_url: "https://example.com",
        pages_crawled: 3,
        chunks_indexed: 15,
        success: true,
        error_message: null,
      };

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await client.ingestWebsite({
      chatbotId: "bot_test_123",
      websiteUrl: "https://example.com",
      maxPages: 5,
    });

    assert.equal(capturedUrl, "http://127.0.0.1:8000/api/v1/ingest/website");
    assert.equal(capturedMethod, "POST");
    assert.equal(capturedHeaders["x-api-key"], "test-internal-key-123");
    assert.equal(capturedHeaders["Content-Type"], "application/json");

    const parsedBody = JSON.parse(capturedBody);
    assert.equal(parsedBody.chatbot_id, "bot_test_123");
    assert.equal(parsedBody.website_url, "https://example.com");
    assert.equal(parsedBody.max_pages, 5);

    assert.equal(result.success, true);
    assert.equal(result.pages_crawled, 3);
    assert.equal(result.chunks_indexed, 15);
  });

  it("handles FastAPI HTTP 400 validation error (e.g. SSRF violation) cleanly", async () => {
    globalThis.fetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({ detail: "SSRF Security Violation: Access to 127.0.0.1 is blocked." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    await assert.rejects(
      async () => {
        await client.ingestWebsite({
          chatbotId: "bot_test_123",
          websiteUrl: "http://127.0.0.1/admin",
        });
      },
      (err: unknown) => {
        assert(err instanceof AIServiceError);
        assert.equal(err.status, 400);
        assert.equal(err.code, "AI_SERVICE_ERROR");
        assert(err.message.includes("SSRF Security Violation"));
        return true;
      },
    );
  });

  it("handles FastAPI HTTP 502 / upstream provider error safely", async () => {
    globalThis.fetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({ detail: "Voyage AI rate limit exceeded" }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    await assert.rejects(
      async () => {
        await client.ingestWebsite({
          chatbotId: "bot_test_123",
          websiteUrl: "https://example.com",
        });
      },
      (err: unknown) => {
        assert(err instanceof AIServiceError);
        assert.equal(err.status, 502);
        assert(err.message.includes("Voyage AI rate limit"));
        return true;
      },
    );
  });

  it("handles client timeout when AI service takes longer than timeout limit", async () => {
    globalThis.fetch = async (): Promise<Response> => {
      const abortError = new Error("The operation was aborted.");
      abortError.name = "AbortError";
      throw abortError;
    };

    await assert.rejects(
      async () => {
        await client.ingestWebsite({
          chatbotId: "bot_test_123",
          websiteUrl: "https://example.com",
        });
      },
      (err: unknown) => {
        assert(err instanceof AIServiceError);
        assert.equal(err.status, 504);
        assert.equal(err.code, "AI_SERVICE_TIMEOUT");
        assert(err.message.includes("timed out"));
        return true;
      },
    );
  });

  it("successfully calls askQuestion and parses grounded answer and citations", async () => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      assert.equal(String(input), "http://127.0.0.1:8000/api/v1/chat/ask");
      assert.equal(init?.method, "POST");

      const mockResponse = {
        chatbot_id: "bot_test_123",
        question: "What is your refund policy?",
        answer: "You can return items within 30 days [Source 1].",
        sources: [
          {
            chunk_id: "chk_01",
            source_url: "https://example.com/refunds",
            canonical_url: "https://example.com/refunds",
            title: "Refund Policy",
            score: 0.94,
            snippet: "Our return window is 30 days from purchase.",
          },
        ],
        has_grounded_evidence: true,
        stats: {
          retrieval_duration_ms: 15.0,
          generation_duration_ms: 250.0,
          total_duration_ms: 265.0,
          model_used: "gemini-3.5-flash-lite",
          chunks_retrieved: 1,
        },
      };

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await client.askQuestion({
      chatbotId: "bot_test_123",
      question: "What is your refund policy?",
      topK: 4,
    });

    assert.equal(result.chatbot_id, "bot_test_123");
    assert.equal(result.has_grounded_evidence, true);
    assert.equal(result.answer, "You can return items within 30 days [Source 1].");
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0]?.chunk_id, "chk_01");
    assert.equal(result.sources[0]?.source_url, "https://example.com/refunds");
  });

  it("forwards up to 10 chatHistory items (5 turns) to the AI service", async () => {
    let capturedBody = "";
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          chatbot_id: "bot_test_123",
          question: "Follow-up question",
          answer: "Answer with context",
          sources: [],
          has_grounded_evidence: true,
          stats: {
            retrieval_duration_ms: 5,
            generation_duration_ms: 50,
            total_duration_ms: 55,
            model_used: "gemini",
            chunks_retrieved: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const twelveMessages = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i + 1}`,
    }));

    await client.askQuestion({
      chatbotId: "bot_test_123",
      question: "Follow-up question",
      chatHistory: twelveMessages,
    });

    const parsed = JSON.parse(capturedBody);
    assert.equal(parsed.chat_history.length, 10);
    assert.equal(parsed.chat_history[0].content, "Message 3");
    assert.equal(parsed.chat_history[9].content, "Message 12");
  });

  it("checkHealth returns true on 200 and false on network failure", async () => {
    // 1. Success case
    globalThis.fetch = async () => new Response("OK", { status: 200 });
    const isHealthy = await client.checkHealth();
    assert.equal(isHealthy, true);

    // 2. Failure case
    globalThis.fetch = async () => {
      throw new Error("Connection refused");
    };
    const isUnhealthy = await client.checkHealth();
    assert.equal(isUnhealthy, false);
  });
});
