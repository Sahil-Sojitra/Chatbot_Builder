"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from "@/components/ui";
import { useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";
import { useKnowledgeSources } from "@/features/knowledge-sources/useKnowledgeSources";
import { chatbotsApi } from "@/lib/api/chatbots";
import { knowledgeSourcesApi } from "@/lib/api/knowledgeSources";
import { ApiRequestError } from "@/lib/api/client";
import { logger } from "@/lib/logger";
import { ChatMessageContent } from "@/features/chatbots/components/ChatMessageContent";
import { ChatSourcesPills } from "@/features/chatbots/components/ChatSourcesPills";
import type { Chatbot } from "@/types/chatbot";

const STATUS_BADGE_VARIANT: Record<Chatbot["status"], "default" | "success" | "warning"> = {
  DRAFT: "default",
  ACTIVE: "success",
  PAUSED: "warning",
};

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  sources?: Array<{
    chunk_id: string;
    source_url: string;
    canonical_url: string;
    title: string | null;
    score: number;
    snippet: string;
  }>;
  hasGroundedEvidence?: boolean;
  isError?: boolean;
  isStreaming?: boolean;
}

export default function ChatbotOverviewPage() {
  const router = useRouter();
  const { chatbot, refetch: refetchChatbot, setChatbot } = useChatbotDetail();
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Deletion state
  const [isDeletingChatbot, setIsDeletingChatbot] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Playground chat state
  const [deviceMode, setDeviceMode] = useState<"widget" | "mobile">("widget");
  const [activeCodeTab, setActiveCodeTab] = useState<"script" | "curl" | "json">("script");

  const brandName = chatbot?.name
    ? chatbot.name.replace(/\s+(?:AI\s+)?(?:Assistant|Bot|Chatbot|Agent)$/i, "").trim() || chatbot.name
    : "our team";

  // Initial messages start empty so the custom Persona Welcome Card and Starter Questions render immediately
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [inputValue, setInputValue] = useState("");
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [thinkingStage, setThinkingStage] = useState("Searching indexed website knowledge…");

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      if (behavior === "auto") {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      } else {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior,
        });
      }
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  };

  // Rotating realistic thinking / retrieval stages while awaiting RAG generation
  useEffect(() => {
    if (!isLoadingResponse) {
      setThinkingStage("Searching indexed website knowledge…");
      return;
    }

    const stages = [
      "Searching indexed website embeddings…",
      "Retrieving relevant content passages…",
      "Cross-referencing verified facts…",
      "Synthesizing grounded answer with Gemini…",
    ];

    let current = 0;
    const timer = setInterval(() => {
      current = (current + 1) % stages.length;
      setThinkingStage(stages[current]);
    }, 1200);

    return () => clearInterval(timer);
  }, [isLoadingResponse]);

  // Clean up any streaming intervals on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll whenever messages update, response arrives, or streaming advances
  useEffect(() => {
    scrollToBottom("smooth");
    const timer = setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isLoadingResponse, isStreaming]);

  const handleStopStreaming = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg)),
    );
    setIsStreaming(false);
  };


  // Instant Bot specific knowledge source & retry state
  const isInstant = chatbot?.creationMode === "INSTANT";
  const {
    knowledgeSources,
    status: ksStatus,
    refetch: refetchKs,
  } = useKnowledgeSources(chatbot && isInstant ? chatbot.id : "");

  const [isRetryingIngestion, setIsRetryingIngestion] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  if (!chatbot) {
    return null;
  }

  const websiteSource =
    knowledgeSources.find((s) => (s.type === "URL" || s.type === "WEBPAGE") && s.status === "READY") ||
    knowledgeSources.find((s) => (s.type === "URL" || s.type === "WEBPAGE") && (s.status === "PROCESSING" || s.status === "PENDING")) ||
    knowledgeSources.find((s) => s.type === "URL" || s.type === "WEBPAGE") ||
    knowledgeSources[0];

  const websiteUrl =
    websiteSource?.sourceUrl ||
    (chatbot.description?.startsWith("Instant AI Assistant created from ")
      ? chatbot.description.replace("Instant AI Assistant created from ", "")
      : "");

  const isReady = websiteSource?.status === "READY";
  const isProcessing =
    ksStatus === "loading" ||
    websiteSource?.status === "PENDING" ||
    websiteSource?.status === "PROCESSING";
  const isFailed = websiteSource?.status === "FAILED";

  // Auto-refresh chatbot details once when ingestion transitions to READY to sync newly synthesized persona & starter questions
  const hasRefetchedOnReadyRef = useRef(false);
  useEffect(() => {
    if (isReady && !hasRefetchedOnReadyRef.current) {
      hasRefetchedOnReadyRef.current = true;
      refetchChatbot();
    }
  }, [isReady, refetchChatbot]);

  const handleRetryIngestion = async () => {
    if (!websiteUrl || isRetryingIngestion) return;
    setIsRetryingIngestion(true);
    setRetryError(null);
    setSyncNotice(null);

    try {
      await knowledgeSourcesApi.create(chatbot.id, {
        type: "URL",
        name: `${chatbot.name} Knowledge Base`,
        sourceUrl: websiteUrl,
      });
      refetchKs();
      setSyncNotice("Re-sync pipeline initiated! Scanning website for updated content.");
      setTimeout(() => setSyncNotice(null), 6000);
    } catch (err: unknown) {
      setRetryError(
        err instanceof Error ? err.message : "Failed to re-sync website ingestion.",
      );
    } finally {
      setIsRetryingIngestion(false);
    }
  };

  const embedScriptCode = `<script\n  src="https://chatbot-builder-pearl-sigma.vercel.app/widget.js"\n  data-chatbot-id="${chatbot.publicId}"\n  defer\n></script>`;

  const curlCode = `curl -X POST https://api.chatbotstudio.io/v1/chatbots/${chatbot.publicId}/query \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Hello from API"}'`;

  const jsonConfigCode = JSON.stringify(
    {
      id: chatbot.id,
      publicId: chatbot.publicId,
      slug: chatbot.slug,
      provider: chatbot.provider || "openai",
      model: chatbot.model || "gpt-4o-mini",
      temperature: chatbot.temperature ?? 0.7,
      maxTokens: chatbot.maxTokens ?? 2048,
      rag: {
        enabled: Boolean(chatbot.ragEnabled),
        topK: chatbot.ragTopK ?? 5,
        similarityThreshold: chatbot.ragSimilarityThreshold ?? 0.7,
      },
      status: chatbot.status,
    },
    null,
    2,
  );

  const handleCopyPublicId = async () => {
    try {
      await navigator.clipboard.writeText(chatbot.publicId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(embedScriptCode);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleTogglePublish = async () => {
    setIsPublishing(true);
    setActionError(null);

    try {
      if (chatbot.status === "ACTIVE") {
        const response = await chatbotsApi.unpublish(chatbot.id);
        setChatbot(response.chatbot);
      } else {
        const response = await chatbotsApi.publish(chatbot.id);
        setChatbot(response.chatbot);
      }
    } catch (err) {
      setActionError(
        err instanceof ApiRequestError
          ? err.message
          : `Failed to ${chatbot.status === "ACTIVE" ? "unpublish" : "publish"} chatbot.`,
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteChatbot = async () => {
    setIsDeletingChatbot(true);
    setActionError(null);
    try {
      await chatbotsApi.delete(chatbot.id);
      router.push("/dashboard/chatbots");
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiRequestError ? err.message : "Failed to delete chatbot.",
      );
      setIsDeletingChatbot(false);
      setIsConfirmingDelete(false);
    }
  };

  const sendQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isLoadingResponse || isStreaming) return;

    if (isInstant && !isReady) {
      setChatError(
        isFailed
          ? "Website ingestion failed. Please retry ingestion above to enable testing."
          : "Website indexing is in progress. Please wait until indexing completes.",
      );
      return;
    }

    setChatError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoadingResponse(true);

    logger.info("PLAYGROUND", `User asked: "${trimmed}"`);

    try {
      const response = await chatbotsApi.chat(chatbot.id, trimmed);
      setIsLoadingResponse(false);
      logger.info(
        "PLAYGROUND",
        `Received answer (${response.answer.length} chars, ${response.sources?.length || 0} sources, grounded=${response.hasGroundedEvidence})`,
      );

      const botMsgId = `b-${Date.now()}`;
      const fullAnswer = response.answer;
      const sources = response.sources;
      const hasGroundedEvidence = response.hasGroundedEvidence;
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // Add streaming placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: "",
          time,
          sources: [],
          hasGroundedEvidence,
          isStreaming: true,
        },
      ]);
      setIsStreaming(true);

      // Tokenize by word / space boundaries for natural typing cadence
      const tokens = fullAnswer.split(/(\s+)/);
      let currentIdx = 0;
      let streamedText = "";

      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }

      await new Promise<void>((resolve) => {
        streamIntervalRef.current = setInterval(() => {
          // Advance by 2 tokens per tick (e.g. word + space)
          const chunkSize = Math.min(2, tokens.length - currentIdx);
          for (let i = 0; i < chunkSize; i++) {
            streamedText += tokens[currentIdx + i];
          }
          currentIdx += chunkSize;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId ? { ...msg, text: streamedText } : msg,
            ),
          );

          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }

          if (currentIdx >= tokens.length) {
            if (streamIntervalRef.current) {
              clearInterval(streamIntervalRef.current);
              streamIntervalRef.current = null;
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? {
                      ...msg,
                      text: fullAnswer,
                      sources,
                      isStreaming: false,
                    }
                  : msg,
              ),
            );
            setIsStreaming(false);
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
            resolve();
          }
        }, 16);
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to communicate with chatbot.";

      setChatError(errorMessage);

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "bot",
          text: `[Error]: ${errorMessage}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(inputValue);
  };

  /* -------------------------------------------------------------------------- */
  /* INSTANT BOT VIEW: Focused, Full-Width Playground Layout                   */
  /* -------------------------------------------------------------------------- */
  if (isInstant) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
        {actionError ? (
          <div
            role="alert"
            className="rounded-md border border-red-900/60 bg-red-950/40 p-3.5 text-sm text-red-300 font-mono"
          >
            [ERROR]: {actionError}
          </div>
        ) : null}

        {/* Instant Bot Header & Ingestion Status Banner */}
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-[#0a0a0a] p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  Instant Bot Playground
                </span>
                <span className="text-xs text-zinc-500 font-mono">ID: {chatbot.publicId}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">{chatbot.name}</h1>
              {websiteUrl ? (
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  Target Website:{" "}
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:underline"
                  >
                    {websiteUrl}
                  </a>
                </p>
              ) : null}
            </div>

            {/* Ingestion Status Indicator & Delete Bot Action */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              {isReady ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-800/60 bg-emerald-950/40 text-xs font-medium text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Knowledge Base Ready</span>
                </div>
              ) : isProcessing ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-amber-800/60 bg-amber-950/40 text-xs font-medium text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Indexing Website…</span>
                </div>
              ) : isFailed ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-rose-800/60 bg-rose-950/40 text-xs font-medium text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span>Ingestion Failed</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-400">
                  <span>Checking status…</span>
                </div>
              )}

              {/* Sync Latest Website Button (Available even when READY so users can pull updated website data) */}
              {websiteUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessing || isRetryingIngestion}
                  onClick={() => void handleRetryIngestion()}
                  className="h-8 text-xs border-zinc-700 bg-zinc-900/90 hover:bg-violet-950/40 hover:border-violet-500/50 text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Re-crawl and update knowledge base with the latest changes from your website"
                >
                  <svg
                    className={`w-3.5 h-3.5 text-violet-400 ${
                      isRetryingIngestion || isProcessing ? "animate-spin" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <span>
                    {isRetryingIngestion || isProcessing
                      ? "Syncing Pipeline…"
                      : "Sync Latest Website"}
                  </span>
                </Button>
              ) : null}

              {isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 rounded-md border border-red-900/60 bg-red-950/40 px-2 py-1">
                  <span className="text-xs text-red-300 font-mono">Delete?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 text-[11px] px-2 font-mono"
                    disabled={isDeletingChatbot}
                    onClick={() => void handleDeleteChatbot()}
                  >
                    {isDeletingChatbot ? "Deleting…" : "Confirm"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-1.5 text-zinc-400 hover:text-white font-mono"
                    disabled={isDeletingChatbot}
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-zinc-400 hover:text-red-400 font-mono"
                  disabled={isDeletingChatbot}
                  onClick={() => setIsConfirmingDelete(true)}
                  title="Delete this Instant Bot"
                >
                  Delete Bot
                </Button>
              )}
            </div>
          </div>

          {/* Ingestion Failure Banner & Retry Button */}
          {isFailed ? (
            <div className="mt-2 rounded-md border border-rose-800/50 bg-rose-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 shrink-0 text-rose-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  {retryError ||
                    websiteSource?.error ||
                    "We were unable to crawl or index your website pages. Click retry to run the pipeline again."}
                </span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={isRetryingIngestion}
                onClick={() => void handleRetryIngestion()}
                className="shrink-0"
              >
                {isRetryingIngestion ? "Retrying…" : "Retry Ingestion"}
              </Button>
            </div>
          ) : null}

          {/* Ingestion in Progress / Retrying Card */}
          {(isProcessing || isRetryingIngestion) ? (
            <div className="mt-3 rounded-lg border border-violet-500/30 bg-[#0d0d12] p-4 shadow-lg text-xs space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
                  </span>
                  <span className="font-semibold text-white">
                    {isRetryingIngestion ? "Retrying Ingestion Pipeline…" : "Indexing Knowledge Base in Progress…"}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                  Live Pipeline
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-400 animate-pulse rounded-full w-3/4 transition-all duration-700" />
              </div>

              {/* Pipeline stages badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">Sitemap & Discovery</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-violet-950/30 border border-violet-800/40 text-violet-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping shrink-0" />
                  <span className="truncate">Crawling & Anti-Bot</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-zinc-900/50 border border-zinc-800 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
                  <span className="truncate">Chunk & Vector Index</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-zinc-900/50 border border-zinc-800 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
                  <span className="truncate">Persona & Prompts</span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 pt-0.5 leading-relaxed">
                We are actively processing <span className="text-zinc-200 font-mono">{websiteUrl}</span>. Testing in the playground below will automatically unlock the moment indexing completes.
              </p>
            </div>
          ) : null}

          {/* Re-sync success notice banner */}
          {syncNotice && (
            <div className="mt-2 rounded-md border border-violet-500/30 bg-violet-950/20 px-3.5 py-2.5 text-xs text-violet-200 flex items-center justify-between gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span>{syncNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncNotice(null)}
                className="text-violet-400 hover:text-white cursor-pointer font-bold text-sm"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Focused Full-Width Playground Card */}
        <Card className="flex flex-col h-[650px] overflow-hidden p-0 rounded-md border border-zinc-800 bg-[#000000] shadow-xl">
          {/* Playground Header & Controls */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-[#0a0a0a] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-2 w-2 rounded-full ${isReady ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                  }`}
              />
              <span className="font-medium text-sm text-zinc-200">Interactive Runtime Preview</span>
              <span className="text-xs text-zinc-500 bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800 font-mono">
                {isReady ? "Live Test" : "Pending Ingestion"}
              </span>
            </div>

            {/* Viewport switchers & Quick Sync */}
            <div className="flex items-center gap-1.5">
              {websiteUrl && (
                <button
                  type="button"
                  disabled={isProcessing || isRetryingIngestion}
                  onClick={() => void handleRetryIngestion()}
                  className="rounded px-2 py-1 text-xs font-medium text-zinc-400 hover:text-violet-300 hover:bg-violet-950/30 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Website content changed? Re-run the ingestion pipeline to refresh knowledge base"
                >
                  <svg
                    className={`w-3 h-3 text-violet-400 ${
                      isRetryingIngestion || isProcessing ? "animate-spin" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <span className="hidden sm:inline">Sync Changes</span>
                </button>
              )}
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (streamIntervalRef.current) {
                      clearInterval(streamIntervalRef.current);
                      streamIntervalRef.current = null;
                    }
                    setIsStreaming(false);
                    setIsLoadingResponse(false);
                    setMessages([]);
                    setInputValue("");
                    setChatError(null);
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                  title="Reset conversation and show persona starter prompts"
                >
                  <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">New Chat</span>
                </button>
              )}
              <div className="h-3 w-px bg-zinc-800 hidden sm:block" />
              <button
                type="button"
                onClick={() => setDeviceMode("widget")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${deviceMode === "widget"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                  }`}
              >
                Widget View
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode("mobile")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${deviceMode === "mobile"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                  }`}
              >
                Full Dock
              </button>
            </div>
          </div>

          {/* Chat Stage */}
          <div className="flex-1 flex items-center justify-center p-5 bg-[#050505] architect-grid overflow-hidden">
            <div
              className={`flex flex-col rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl transition-all duration-200 overflow-hidden ${deviceMode === "widget"
                  ? "w-full max-w-[500px] h-[530px]"
                  : "w-full max-w-[640px] h-[550px]"
                }`}
            >
              {/* Chat Widget Top Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 bg-[#111111] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-violet-600/30 border border-violet-500/40 text-violet-300 font-semibold text-xs">
                    {chatbot.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">{chatbot.name}</p>
                    <p className="text-xs text-zinc-400">
                      {isReady ? "Ready · Testing assistant" : isProcessing ? "Indexing knowledge…" : "Ingestion Pending"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Stream */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-sm scroll-smooth"
              >
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                    <div className="h-10 w-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold mb-3 shadow-inner text-sm">
                      {chatbot.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      Welcome to {chatbot.name}!
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">
                      {chatbot.description ||
                        "Ask any question about our website and products, or click a prompt below to test:"}
                    </p>

                    {/* Starter questions */}
                    <div className="mt-4 flex flex-col gap-2 w-full max-w-md">
                      {(chatbot.starterQuestions && chatbot.starterQuestions.length > 0
                        ? chatbot.starterQuestions
                        : [
                          "What products or services do you offer?",
                          "How do I contact customer support?",
                          "Where can I find pricing or subscription plans?",
                        ]
                      ).map((question, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isReady || isLoadingResponse || isStreaming}
                          onClick={() => void sendQuestion(question)}
                          className="text-left text-xs text-zinc-300 bg-[#121212]/80 hover:bg-violet-950/30 hover:text-violet-200 border border-zinc-800 hover:border-violet-500/40 rounded-lg px-3.5 py-2.5 transition-all duration-150 hover:translate-x-0.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-between gap-2.5 group shadow-sm hover:shadow-violet-950/20"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="p-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-colors shrink-0">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.874-.75 2.25 2.25 0 01.077-.52 5.955 5.955 0 01-1.39-3.95C3.223 15.75 3 13.924 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                                />
                              </svg>
                            </span>
                            <span className="truncate font-medium">{question}</span>
                          </div>
                          <svg
                            className="w-3.5 h-3.5 text-zinc-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                      }`}
                  >
                    <div
                      className={`rounded-md p-3.5 leading-relaxed text-sm ${msg.sender === "user"
                          ? "bg-violet-600/20 border border-violet-500/30 text-white font-normal"
                          : msg.isError
                            ? "bg-red-950/40 border border-red-800/60 text-red-200 text-xs font-mono"
                            : "bg-[#141414] border border-zinc-800 text-zinc-100 font-normal"
                        }`}
                    >
                      {msg.sender === "user" || msg.isError ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div className="relative">
                          <ChatMessageContent content={msg.text} />
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 ml-1 bg-violet-400 animate-pulse align-middle rounded-sm shadow-sm shadow-violet-400" />
                          )}
                        </div>
                      )}
                      {!msg.isStreaming && <ChatSourcesPills sources={msg.sources} theme="violet" />}
                    </div>
                    <span className="text-xs text-zinc-500 mt-1 px-1 font-mono">{msg.time}</span>
                  </div>
                ))}

                {isLoadingResponse ? (
                  <div className="self-start flex items-center gap-2.5 rounded-lg bg-zinc-900/90 border border-violet-500/30 px-3.5 py-2.5 text-xs text-zinc-300 font-mono shadow-md animate-in fade-in duration-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                    </span>
                    <span className="text-violet-200 font-medium">{thinkingStage}</span>
                  </div>
                ) : null}
                <div ref={messagesEndRef} className="h-0 w-0 shrink-0" />
              </div>

              {chatError ? (
                <div className="px-4 py-2 bg-red-950/40 border-t border-red-900/60 text-xs text-red-300 flex items-center justify-between">
                  <span>{chatError}</span>
                  <button
                    type="button"
                    onClick={() => setChatError(null)}
                    className="text-red-400 hover:text-red-200 cursor-pointer ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}

              {/* Interactive Input Box */}
              <form
                onSubmit={handleSendMessage}
                className="border-t border-zinc-800 bg-[#0e0e0e] p-2.5 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  disabled={!isReady || isLoadingResponse || isStreaming}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    !isReady
                      ? isFailed
                        ? "Ingestion failed — retry above to enable testing"
                        : "Website indexing in progress… testing disabled until ready"
                      : isStreaming
                        ? "Streaming answer…"
                        : "Ask a test question about your website…"
                  }
                  className="flex-1 rounded-md border border-zinc-800 bg-[#000000] px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isStreaming ? (
                  <Button
                    type="button"
                    onClick={handleStopStreaming}
                    size="default"
                    className="h-9 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Stop generation"
                  >
                    <span className="h-2 w-2 rounded-sm bg-violet-400" />
                    <span>Stop</span>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!isReady || !inputValue.trim() || isLoadingResponse}
                    size="default"
                    className="h-9 px-3.5 bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                  >
                    Send
                  </Button>
                )}
              </form>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* CUSTOM BOT VIEW: Existing 2-Column Studio Layout with Embed / Config Cards */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="flex flex-col gap-6">
      {actionError ? (
        <div
          role="alert"
          className="rounded-md border border-red-900/60 bg-red-950/40 p-3.5 text-sm text-red-300 font-mono"
        >
          [ERROR]: {actionError}
        </div>
      ) : null}

      {/* Top Deployment Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-[#0d0d0d] text-zinc-200">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L1 21h22L12 2z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white">{chatbot.name}</h1>
              <Badge variant={STATUS_BADGE_VARIANT[chatbot.status]}>
                <span
                  className={`h-2 w-2 rounded-full ${chatbot.status === "ACTIVE"
                      ? "bg-emerald-400 animate-pulse"
                      : chatbot.status === "PAUSED"
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                    }`}
                />
                {chatbot.status === "ACTIVE" ? "Ready" : chatbot.status}
              </Badge>
              {chatbot.ragEnabled ? (
                <span className="rounded-md bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  RAG Online
                </span>
              ) : null}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
              <span className="font-mono text-zinc-300">/{chatbot.slug}</span>
              <span>&middot;</span>
              <span className="font-mono text-xs text-zinc-500">Public ID: {chatbot.publicId}</span>
              <span>&middot;</span>
              <span className="text-zinc-400 font-mono text-xs">{chatbot.provider || "openai"}:{chatbot.model || "gpt-4o-mini"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard/chatbots/${chatbot.id}/settings`}
            className={buttonVariants({ variant: "secondary", size: "default" })}
          >
            Settings
          </Link>
          <Button
            size="default"
            variant={chatbot.status === "ACTIVE" ? "secondary" : "default"}
            disabled={isPublishing}
            onClick={() => void handleTogglePublish()}
          >
            {isPublishing
              ? "Updating…"
              : chatbot.status === "ACTIVE"
                ? "Pause Deployment"
                : "Deploy to Production"}
          </Button>
        </div>
      </div>

      {/* Main Studio 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Interactive Chat Sandbox Simulator (7 cols) */}
        <div className="flex flex-col gap-3 lg:col-span-7">
          <Card className="flex flex-col h-[650px] overflow-hidden p-0 rounded-md border border-zinc-800 bg-[#000000]">
            {/* Simulator Header & Controls */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-[#0a0a0a] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium text-sm text-zinc-200">Interactive Runtime Preview</span>
                <span className="text-xs text-zinc-500 bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800 font-mono">
                  Live Test
                </span>
              </div>

              {/* Viewport switchers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDeviceMode("widget")}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${deviceMode === "widget"
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  Widget View
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode("mobile")}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${deviceMode === "mobile"
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  Full Dock
                </button>
              </div>
            </div>

            {/* Chat Device Stage */}
            <div className="flex-1 flex items-center justify-center p-5 bg-[#050505] architect-grid overflow-hidden">
              <div
                className={`flex flex-col rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl transition-all duration-200 overflow-hidden ${deviceMode === "widget"
                    ? "w-full max-w-[440px] h-[530px]"
                    : "w-full max-w-[480px] h-[550px]"
                  }`}
              >
                {/* Chat Widget Top Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 bg-[#111111] px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 border border-zinc-700 text-white font-semibold text-xs">
                      {chatbot.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{chatbot.name}</p>
                      <p className="text-xs text-zinc-400">
                        {chatbot.status === "ACTIVE" ? "Ready · Serving queries" : "Preview Sandbox Mode"}
                      </p>
                    </div>
                  </div>

                  <span className="text-zinc-400 text-sm hover:text-zinc-200 cursor-pointer">&times;</span>
                </div>

                {/* Message Stream */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-sm scroll-smooth"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                        }`}
                    >
                      <div
                        className={`rounded-md p-3.5 leading-relaxed text-sm ${msg.sender === "user"
                            ? "bg-zinc-800 border border-zinc-700 text-white font-normal"
                            : msg.isError
                              ? "bg-red-950/40 border border-red-800/60 text-red-200 text-xs font-mono"
                              : "bg-[#141414] border border-zinc-800 text-zinc-100 font-normal"
                          }`}
                      >
                        {msg.sender === "user" || msg.isError ? (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <div className="relative">
                            <ChatMessageContent content={msg.text} />
                            {msg.isStreaming && (
                              <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle rounded-sm shadow-sm shadow-emerald-400" />
                            )}
                          </div>
                        )}
                        {!msg.isStreaming && <ChatSourcesPills sources={msg.sources} theme="emerald" />}
                      </div>
                      <span className="text-xs text-zinc-500 mt-1 px-1 font-mono">{msg.time}</span>
                    </div>
                  ))}

                  {isLoadingResponse ? (
                    <div className="self-start flex items-center gap-2.5 rounded-lg bg-zinc-900/90 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-zinc-300 font-mono shadow-md animate-in fade-in duration-200">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-emerald-200 font-medium">{thinkingStage}</span>
                    </div>
                  ) : null}
                  <div ref={messagesEndRef} className="h-0 w-0 flex-shrink-0" />
                </div>

                {chatError ? (
                  <div className="px-4 py-2 bg-red-950/40 border-t border-red-900/60 text-xs text-red-300 flex items-center justify-between">
                    <span>{chatError}</span>
                    <button
                      type="button"
                      onClick={() => setChatError(null)}
                      className="text-red-400 hover:text-red-200 cursor-pointer ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}

                {/* Interactive Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-zinc-800 bg-[#0e0e0e] p-2.5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputValue}
                    disabled={isLoadingResponse || isStreaming}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isStreaming ? "Streaming answer…" : "Ask a test question…"}
                    className="flex-1 rounded-md border border-zinc-800 bg-[#000000] px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-500 disabled:opacity-50"
                  />
                  {isStreaming ? (
                    <Button
                      type="button"
                      onClick={handleStopStreaming}
                      size="default"
                      className="h-9 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer flex items-center gap-1.5 transition-colors"
                      title="Stop generation"
                    >
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                      <span>Stop</span>
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!inputValue.trim() || isLoadingResponse}
                      size="default"
                      className="h-9 px-3.5"
                    >
                      Send
                    </Button>
                  )}
                </form>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Studio Inspector & Embed Code (5 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Multi-Tab Integration Snippet Card */}
          <Card className="rounded-md border border-zinc-800 bg-[#000000] p-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  Integration & Embed
                </span>
                <span className="text-xs text-zinc-500 font-mono">CLIENT SDK</span>
              </div>

              {/* Snippet format switcher */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("script")}
                  className={`rounded px-2 py-0.5 cursor-pointer transition-colors ${activeCodeTab === "script"
                      ? "bg-zinc-800 text-white font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("curl")}
                  className={`rounded px-2 py-0.5 cursor-pointer transition-colors ${activeCodeTab === "curl"
                      ? "bg-zinc-800 text-white font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  cURL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("json")}
                  className={`rounded px-2 py-0.5 cursor-pointer transition-colors ${activeCodeTab === "json"
                      ? "bg-zinc-800 text-white font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  JSON
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 pt-3.5">
              {/* Public ID Token Box */}
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-[#0a0a0a] p-3">
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Public Identifier</span>
                  <span className="font-mono text-sm font-semibold text-zinc-200 mt-0.5">{chatbot.publicId}</span>
                </div>
                <Button size="sm" variant="secondary" className="h-7 text-xs font-mono" onClick={() => void handleCopyPublicId()}>
                  {copiedId ? "Copied!" : "Copy ID"}
                </Button>
              </div>

              {/* Code Snippet Box */}
              <div className="relative rounded-md border border-zinc-800 bg-[#0a0a0a] p-3">
                <pre className="font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed max-h-40">
                  {activeCodeTab === "script"
                    ? embedScriptCode
                    : activeCodeTab === "curl"
                      ? curlCode
                      : jsonConfigCode}
                </pre>
                <Button
                  size="default"
                  variant="secondary"
                  className="mt-3 w-full text-xs font-medium"
                  onClick={() => void handleCopyScript()}
                >
                  {copiedScript ? "✓ Copied to Clipboard" : "Copy Embed Snippet"}
                </Button>
              </div>
            </div>
          </Card>

          {/* AI Model Parameters */}
          <Card className="rounded-md border border-zinc-800 bg-[#000000] p-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-sm font-semibold text-white">
                Runtime Parameters
              </span>
              <Link
                href={`/dashboard/chatbots/${chatbot.id}/settings`}
                className="text-xs text-zinc-400 hover:text-white font-medium"
              >
                Edit Parameters &rarr;
              </Link>
            </div>
            <div className="flex flex-col divide-y divide-zinc-800/80 pt-1 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-400">LLM Provider</span>
                <span className="text-zinc-100 font-medium capitalize">{chatbot.provider || "OpenAI"}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-400">Model Name</span>
                <span className="text-zinc-100 font-mono font-medium">{chatbot.model || "gpt-4o-mini"}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-400">Sampling Temperature</span>
                <span className="text-zinc-100 font-mono">{chatbot.temperature ?? 0.7}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-400">Max Generation Tokens</span>
                <span className="text-zinc-100 font-mono">{chatbot.maxTokens ?? 2048}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-400">Storage Backend</span>
                <span className="text-zinc-100 font-mono text-xs">Backblaze B2 / S3</span>
              </div>
            </div>
          </Card>

          {/* Knowledge & RAG Readiness */}
          <Card className="rounded-md border border-zinc-800 bg-[#000000] p-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-sm font-semibold text-white">
                RAG Knowledge Retrieval
              </span>
              <Badge variant={chatbot.ragEnabled ? "success" : "default"}>
                <span
                  className={`h-2 w-2 rounded-full ${chatbot.ragEnabled ? "bg-emerald-400" : "bg-zinc-500"
                    } mr-1`}
                />
                {chatbot.ragEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <p className="pt-2.5 text-sm text-zinc-400 leading-relaxed">
              {chatbot.ragEnabled
                ? `Vector search connected: Retrieves top ${chatbot.ragTopK || 5} chunks with similarity threshold ${chatbot.ragSimilarityThreshold || 0.7}.`
                : "Vector search offline. Ground your assistant with private documentation."}
            </p>
            <div className="pt-3.5">
              <Link
                href={`/dashboard/chatbots/${chatbot.id}/knowledge-sources`}
                className={buttonVariants({ variant: "secondary", size: "default" }) + " w-full text-sm"}
              >
                Manage Knowledge Sources &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
