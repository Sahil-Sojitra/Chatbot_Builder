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
  CustomSelect,
  Input,
  Label,
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
import { LLM_PROVIDERS, LLM_MODELS_BY_PROVIDER } from "@/features/chatbots/llmCatalog";
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
  const [instantActiveTab, setInstantActiveTab] = useState<"playground" | "integration" | "settings">("playground");
  const [deviceMode, setDeviceMode] = useState<"widget" | "mobile">("widget");
  const [activeCodeTab, setActiveCodeTab] = useState<"script" | "curl" | "json">("script");
  const [instantIntegrationTab, setInstantIntegrationTab] = useState<"html" | "react" | "curl">("html");
  const [copiedIntegration, setCopiedIntegration] = useState(false);
  const [isFloatingWidgetActive, setIsFloatingWidgetActive] = useState(false);

  // In-place Settings State for AI Engine & Parameters
  const [editProvider, setEditProvider] = useState(chatbot?.provider || "google");
  const [editModel, setEditModel] = useState(chatbot?.model || "gemini-3.5-flash");
  const [editApiKey, setEditApiKey] = useState("");
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [editTemperature, setEditTemperature] = useState(
    chatbot?.temperature !== null && chatbot?.temperature !== undefined
      ? String(chatbot.temperature)
      : "0.7",
  );
  const [editMaxTokens, setEditMaxTokens] = useState(
    chatbot?.maxTokens ? String(chatbot.maxTokens) : "2048",
  );
  const [editSessionLimitType, setEditSessionLimitType] = useState<"unlimited" | "custom">(
    chatbot?.sessionMessageLimit && chatbot.sessionMessageLimit > 0 ? "custom" : "unlimited",
  );
  const [editSessionCustomLimit, setEditSessionCustomLimit] = useState(
    chatbot?.sessionMessageLimit && chatbot.sessionMessageLimit > 0
      ? String(chatbot.sessionMessageLimit)
      : "10",
  );

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessNotice, setSettingsSuccessNotice] = useState<string | null>(null);
  const [settingsErrorNotice, setSettingsErrorNotice] = useState<string | null>(null);

  // Sync state when chatbot changes
  useEffect(() => {
    if (chatbot) {
      setEditProvider(chatbot.provider || "google");
      setEditModel(chatbot.model || "gemini-3.5-flash");
      setEditTemperature(
        chatbot.temperature !== null && chatbot.temperature !== undefined
          ? String(chatbot.temperature)
          : "0.7",
      );
      setEditMaxTokens(chatbot.maxTokens ? String(chatbot.maxTokens) : "2048");
      if (chatbot.sessionMessageLimit && chatbot.sessionMessageLimit > 0) {
        setEditSessionLimitType("custom");
        setEditSessionCustomLimit(String(chatbot.sessionMessageLimit));
      } else {
        setEditSessionLimitType("unlimited");
        setEditSessionCustomLimit("10");
      }
    }
  }, [chatbot]);

  const handleEditProviderChange = (newProvider: string) => {
    setEditProvider(newProvider);
    const providerMeta = LLM_PROVIDERS.find((p) => p.value === newProvider);
    const defaultM = providerMeta?.defaultModel || LLM_MODELS_BY_PROVIDER[newProvider]?.[0]?.value || "";
    setEditModel(defaultM);
  };

  const handleSaveEngineSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings || !chatbot) return;
    setSettingsErrorNotice(null);
    setSettingsSuccessNotice(null);

    let resolvedLimit: number | null = null;
    if (editSessionLimitType === "custom") {
      const parsed = Number(editSessionCustomLimit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
        setSettingsErrorNotice("Custom message limit must be an integer between 1 and 1000.");
        return;
      }
      resolvedLimit = parsed;
    }

    const tempVal = Number(editTemperature);
    if (Number.isNaN(tempVal) || tempVal < 0 || tempVal > 2) {
      setSettingsErrorNotice("Temperature must be between 0.0 and 2.0.");
      return;
    }

    const tokensVal = Number(editMaxTokens);
    if (!Number.isInteger(tokensVal) || tokensVal < 1 || tokensVal > 32000) {
      setSettingsErrorNotice("Max tokens must be an integer between 1 and 32000.");
      return;
    }

    setIsSavingSettings(true);
    try {
      const payload = {
        provider: editProvider.trim() || undefined,
        model: editModel.trim() || undefined,
        apiKey: editApiKey.trim() || undefined,
        temperature: tempVal,
        maxTokens: tokensVal,
        sessionMessageLimit: resolvedLimit,
      };

      const res = await chatbotsApi.update(chatbot.id, payload);
      setChatbot(res.chatbot);
      setSettingsSuccessNotice("Engine parameters & session limits updated successfully!");
      if (editApiKey.trim()) {
        setEditApiKey("");
      }
      setTimeout(() => setSettingsSuccessNotice(null), 4000);
    } catch (err) {
      setSettingsErrorNotice(
        err instanceof ApiRequestError ? err.message : "Failed to save settings. Please retry.",
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

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

  // Clear any pending instant bot creation flag once arriving at the chatbot page
  useEffect(() => {
    try {
      localStorage.removeItem("pending_instant_bot");
    } catch {
      // Non-blocking
    }
  }, []);

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

  // Clean up any streaming intervals and live widget simulator on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
      if (typeof window !== "undefined" && (window as any).ChatbotWidget) {
        try {
          (window as any).ChatbotWidget.destroy();
        } catch {}
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


  // Knowledge source & retry state (Instant & Custom bots)
  const isInstant = chatbot?.creationMode === "INSTANT";
  const {
    knowledgeSources,
    status: ksStatus,
    refetch: refetchKs,
  } = useKnowledgeSources(chatbot ? chatbot.id : "");

  const [isRetryingIngestion, setIsRetryingIngestion] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Custom Bot Direct Knowledge Upload & Retry states
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [uploadSourceError, setUploadSourceError] = useState<string | null>(null);
  const [uploadSourceSuccess, setUploadSourceSuccess] = useState<string | null>(null);
  const [retryingSourceId, setRetryingSourceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Cleanly derive human-readable brand name if database name is a raw hex ObjectId
  const botDisplayName = (() => {
    const rawName = chatbot.name || "";
    if (
      /^[0-9a-fA-F]{24}(\s+AI\s+Assistant)?$/i.test(rawName.trim()) ||
      /^[0-9a-fA-F-]{32,36}/i.test(rawName.trim())
    ) {
      if (websiteUrl) {
        try {
          const parsed = new URL(websiteUrl);
          const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
          const parts = host.split(".");
          const brand = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Website";
          return `${brand} Assistant`;
        } catch {}
      }
      return "Website AI Assistant";
    }
    return rawName;
  })();

  const isReady = websiteSource?.status === "READY";
  const isProcessing =
    websiteSource?.status === "PENDING" ||
    websiteSource?.status === "PROCESSING" ||
    isRetryingIngestion;
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

  const handleCustomBotFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatbot) return;
    setIsUploadingSource(true);
    setUploadSourceError(null);
    setUploadSourceSuccess(null);
    try {
      await knowledgeSourcesApi.uploadDirect(chatbot.id, file);
      setUploadSourceSuccess(`"${file.name}" uploaded successfully and indexing started!`);
      refetchKs();
      setTimeout(() => setUploadSourceSuccess(null), 5000);
    } catch (err) {
      setUploadSourceError(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setIsUploadingSource(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRetryCustomSource = async (sourceId: string) => {
    if (!chatbot || retryingSourceId) return;
    setRetryingSourceId(sourceId);
    setUploadSourceError(null);
    try {
      await knowledgeSourcesApi.retry(chatbot.id, sourceId);
      refetchKs();
    } catch (err) {
      setUploadSourceError(err instanceof Error ? err.message : "Failed to retry processing.");
    } finally {
      setRetryingSourceId(null);
    }
  };

  const appOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://chatbot-builder-pearl-sigma.vercel.app";

  const embedScriptCode = `<script\n  src="${appOrigin}/widget.js"\n  data-chatbot-id="${chatbot.publicId}"\n  defer\n></script>`;

  const reactScriptCode = `import Script from "next/script";\n\nexport function ChatWidget() {\n  return (\n    <Script\n      src="${appOrigin}/widget.js"\n      data-chatbot-id="${chatbot.publicId}"\n      strategy="lazyOnload"\n    />\n  );\n}`;

  const curlCode = `curl -X POST "${appOrigin}/api/v1/public/chatbots/${chatbot.publicId}/chat" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Hello from website"}'`;

  const getActiveIntegrationCode = () => {
    switch (instantIntegrationTab) {
      case "html":
        return embedScriptCode;
      case "react":
        return reactScriptCode;
      case "curl":
        return curlCode;
    }
  };

  const handleCopyIntegrationSnippet = async () => {
    try {
      await navigator.clipboard.writeText(getActiveIntegrationCode());
      setCopiedIntegration(true);
      setTimeout(() => setCopiedIntegration(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleToggleFloatingWidget = () => {
    if (isFloatingWidgetActive) {
      setIsFloatingWidgetActive(false);
      if (typeof window !== "undefined" && (window as any).ChatbotWidget) {
        if (typeof (window as any).ChatbotWidget.hide === "function") {
          (window as any).ChatbotWidget.hide();
        } else {
          (window as any).ChatbotWidget.close();
        }
      }
      return;
    }

    setIsFloatingWidgetActive(true);

    if (typeof window !== "undefined") {
      const apiHost =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      if ((window as any).ChatbotWidget) {
        if (typeof (window as any).ChatbotWidget.show === "function") {
          (window as any).ChatbotWidget.show();
        }
        (window as any).ChatbotWidget.init(chatbot.publicId, apiHost);
        setTimeout(() => {
          if ((window as any).ChatbotWidget) {
            (window as any).ChatbotWidget.open();
          }
        }, 100);
        return;
      }

      const existingScript = document.getElementById("cb-live-preview-script");
      if (existingScript) existingScript.remove();

      const script = document.createElement("script");
      script.id = "cb-live-preview-script";
      script.src = "/widget.js";
      script.setAttribute("data-chatbot-id", chatbot.publicId);
      script.setAttribute("data-api-host", apiHost);
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        setTimeout(() => {
          if ((window as any).ChatbotWidget) {
            if (typeof (window as any).ChatbotWidget.show === "function") {
              (window as any).ChatbotWidget.show();
            }
            (window as any).ChatbotWidget.open();
          }
        }, 200);
      };
    }
  };

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

        {/* Unified Clean Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="text-zinc-500">Workspace</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-300 font-medium">Instant Bot</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500 font-mono">ID: {chatbot.publicId}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{botDisplayName}</h1>
              {chatbot.status === "ACTIVE" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live &amp; Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  {chatbot.status === "PAUSED" ? "Paused" : "Draft"}
                </span>
              )}
              {isProcessing && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Indexing Website…
                </span>
              )}
            </div>

            {websiteUrl ? (
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
                <span>Target:</span>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 hover:underline inline-flex items-center gap-1 font-mono max-w-[220px] sm:max-w-md truncate"
                >
                  <span className="truncate">{websiteUrl}</span>
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </p>
            ) : null}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Link
              href={`/dashboard/chatbots/${chatbot.id}/settings`}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-medium border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>

            <Button
              size="default"
              variant={chatbot.status === "ACTIVE" ? "secondary" : "default"}
              disabled={isPublishing || isProcessing}
              onClick={() => void handleTogglePublish()}
              className={`h-9 px-4 text-xs font-medium transition-all cursor-pointer ${
                chatbot.status === "ACTIVE"
                  ? "border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-950/50"
              }`}
            >
              {isPublishing ? (
                "Updating…"
              ) : chatbot.status === "ACTIVE" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  Pause Deployment
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Publish Assistant
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Clean Segmented Tab Control */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-full sm:w-fit overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setInstantActiveTab("playground")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              instantActiveTab === "playground"
                ? "bg-zinc-800 text-white font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Playground</span>
          </button>

          <button
            type="button"
            onClick={() => setInstantActiveTab("integration")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              instantActiveTab === "integration"
                ? "bg-zinc-800 text-white font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span>Embed &amp; Integration</span>
            {chatbot.status === "ACTIVE" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setInstantActiveTab("settings")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              instantActiveTab === "settings"
                ? "bg-zinc-800 text-white font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings &amp; Manage</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PLAYGROUND                                                         */}
        {/* ========================================================================= */}
        {instantActiveTab === "playground" && (
          <div className="flex flex-col gap-4">
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

        {/* Focused Full-Width Playground Card */}
        <div className="flex flex-col h-[580px] sm:h-[650px] overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950/80 shadow-2xl">
          {/* Playground Header & Controls */}
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-zinc-900/60 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex h-2 w-2 rounded-full shrink-0 ${
                  isReady ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                }`}
              />
              <span className="font-semibold text-xs sm:text-sm text-zinc-200 truncate">Runtime Simulator</span>
              <span className="hidden sm:inline-block text-[11px] text-zinc-400 bg-white/[0.04] rounded-md px-2 py-0.5 border border-white/[0.06] font-mono shrink-0">
                {isReady ? "Live Ready" : "Pending Ingestion"}
              </span>
            </div>

            {/* Viewport switchers & Quick Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleFloatingWidget}
                className="rounded px-2.5 py-1 text-xs font-medium border border-violet-500/30 text-violet-300 hover:bg-violet-950/30 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Launch the floating bubble widget directly on this screen to preview it"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="hidden sm:inline">
                  {isFloatingWidgetActive ? "Close Widget" : "Test Floating Widget"}
                </span>
                <span className="sm:hidden">
                  {isFloatingWidgetActive ? "Close" : "Test Widget"}
                </span>
              </button>

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
                  className="rounded px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  title="Reset conversation"
                >
                  <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Clear Chat</span>
                </button>
              )}
              <div className="h-3 w-px bg-zinc-800 hidden md:block" />
              <button
                type="button"
                onClick={() => setDeviceMode("widget")}
                className={`hidden md:inline-block rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  deviceMode === "widget"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Widget View
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode("mobile")}
                className={`hidden md:inline-block rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  deviceMode === "mobile"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Full Dock
              </button>
            </div>
          </div>

          {/* Chat Stage */}
          <div className="flex-1 flex items-center justify-center p-2.5 sm:p-5 bg-[#050507] architect-grid overflow-hidden">
            <div
              className={`flex flex-col rounded-xl border border-white/[0.08] bg-[#0c0c0f] shadow-2xl transition-all duration-200 overflow-hidden ${
                deviceMode === "widget"
                  ? "w-full max-w-[500px] h-full sm:h-[530px]"
                  : "w-full max-w-[640px] h-full sm:h-[550px]"
              }`}
            >
              {/* Chat Widget Top Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-zinc-200 font-semibold text-xs shadow-xs">
                    {botDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white leading-tight">{botDisplayName}</p>
                    <p className="text-[11px] text-zinc-400">
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
                    <div className="h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-200 font-semibold mb-3 shadow-xs text-sm">
                      {botDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      Welcome to {botDisplayName}!
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
                          className="text-left text-xs text-zinc-300 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg px-3.5 py-2.5 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-between gap-2.5 group shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="p-1 rounded-md border border-zinc-800 bg-zinc-850 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
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
                      className={`rounded-lg p-3.5 leading-relaxed text-sm ${
                        msg.sender === "user"
                          ? "bg-zinc-800 border border-zinc-700 text-white font-normal"
                          : msg.isError
                          ? "bg-red-950/40 border border-red-800/60 text-red-200 text-xs font-mono"
                          : "bg-[#131316] border border-zinc-800 text-zinc-100 font-normal"
                      }`}
                    >
                      {msg.sender === "user" || msg.isError ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div className="relative">
                          <ChatMessageContent content={msg.text} />
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 ml-1 bg-zinc-300 animate-pulse align-middle rounded-sm" />
                          )}
                        </div>
                      )}
                      {!msg.isStreaming && <ChatSourcesPills sources={msg.sources} theme="zinc" />}
                    </div>
                    <span className="text-xs text-zinc-500 mt-1 px-1 font-mono">{msg.time}</span>
                  </div>
                ))}

                {isLoadingResponse ? (
                  <div className="self-start flex items-center gap-2 rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 font-mono shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{thinkingStage}</span>
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
                className="border-t border-zinc-800 bg-[#0e0e11] p-2.5 flex items-center gap-2"
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
                        : "Indexing in progress… testing unlocks once ready"
                      : isStreaming
                      ? "Streaming answer…"
                      : "Ask a question about your website…"
                  }
                  className="flex-1 rounded-md border border-zinc-800 bg-[#09090b] px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopStreaming}
                    className="h-9 px-3.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer flex items-center gap-1.5 transition-colors text-xs font-medium"
                    title="Stop generation"
                  >
                    <span className="h-2 w-2 rounded-sm bg-zinc-400" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!isReady || !inputValue.trim() || isLoadingResponse}
                    className="h-9 px-4 rounded-md bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-medium text-xs transition-colors cursor-pointer"
                  >
                    Send
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    )}

        {/* ========================================================================= */}
        {/* TAB 2: EMBED & INTEGRATION                                                */}
        {/* ========================================================================= */}
        {instantActiveTab === "integration" && (
          <div className="flex flex-col gap-5">
            {/* Instant Bot Integration & Embed Hub Card */}
            <Card className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 shadow-xl flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-white">
                      Website Integration &amp; Floating Widget
                    </span>
                    <Badge
                      variant={chatbot.status === "ACTIVE" ? "success" : "default"}
                      className="text-[11px]"
                    >
                      {chatbot.status === "ACTIVE" ? "Ready to Embed" : "Draft (Unpublished)"}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Add the AI floating bubble widget to your website in less than 2 minutes. Works on Shopify, WordPress, Webflow, React, Next.js, and static sites.
                  </p>
                </div>

                {/* Public ID Token Box */}
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md">
                  <span className="text-xs text-zinc-400 font-mono">ID: {chatbot.publicId}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2 text-violet-400 hover:text-violet-300 font-mono"
                    onClick={() => void handleCopyPublicId()}
                  >
                    {copiedId ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Publication notice banner */}
              {chatbot.status !== "ACTIVE" ? (
                <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span>
                      This assistant is currently <strong>{chatbot.status}</strong>. Click &ldquo;Publish Assistant&rdquo; so visitors on your website can receive real-time answers.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={isPublishing || isProcessing}
                    onClick={() => void handleTogglePublish()}
                    className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0 cursor-pointer"
                  >
                    {isPublishing ? "Publishing…" : "Publish Now"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/15 px-4 py-2.5 flex items-center gap-2.5 text-xs text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>
                    <strong>Assistant is Live!</strong> Visitors on any website with this widget script can chat with your assistant in real time.
                  </span>
                </div>
              )}

              {/* Snippet Code Tabs */}
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setInstantIntegrationTab("html")}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        instantIntegrationTab === "html"
                          ? "bg-zinc-800 text-white font-medium shadow-xs"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      HTML / Shopify / WordPress
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstantIntegrationTab("react")}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        instantIntegrationTab === "react"
                          ? "bg-zinc-800 text-white font-medium shadow-xs"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Next.js / React
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstantIntegrationTab("curl")}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        instantIntegrationTab === "curl"
                          ? "bg-zinc-800 text-white font-medium shadow-xs"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      cURL / API
                    </button>
                  </div>

                  <span className="text-[11px] text-zinc-500 font-mono">
                    {instantIntegrationTab === "html"
                      ? "Standard Script Tag"
                      : instantIntegrationTab === "react"
                        ? "React Script Component"
                        : "Public JSON API"}
                  </span>
                </div>

                <div className="relative rounded-lg border border-zinc-800 bg-[#050507] p-4">
                  <pre className="font-mono text-xs text-violet-200/90 overflow-x-auto leading-relaxed max-h-48">
                    {getActiveIntegrationCode()}
                  </pre>
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-zinc-800/60">
                    <span className="text-xs text-zinc-400">
                      {instantIntegrationTab === "html"
                        ? "Paste just before the closing </body> tag of your website."
                        : instantIntegrationTab === "react"
                          ? "Drop into your RootLayout or main page component."
                          : "Direct unauthenticated HTTP endpoint for custom mobile apps or SDKs."}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs font-semibold cursor-pointer shrink-0"
                      onClick={() => void handleCopyIntegrationSnippet()}
                    >
                      {copiedIntegration ? "✓ Copied to Clipboard" : "Copy Code Snippet"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 3-Step Setup Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3.5 flex flex-col gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600/20 text-violet-300 font-mono text-xs font-bold">1</span>
                  <p className="text-xs font-medium text-white">Copy the Snippet</p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Choose HTML or React and click Copy Code Snippet above.
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3.5 flex flex-col gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600/20 text-violet-300 font-mono text-xs font-bold">2</span>
                  <p className="text-xs font-medium text-white">Paste Before &lt;/body&gt;</p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Insert the script tag into your theme or root layout template.
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3.5 flex flex-col gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-300 font-mono text-xs font-bold">3</span>
                  <p className="text-xs font-medium text-white">Instant Floating Bot</p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    The floating chat bubble automatically appears and answers questions.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SETTINGS & MANAGE                                                  */}
        {/* ========================================================================= */}
        {instantActiveTab === "settings" && (
          <div className="flex flex-col gap-5">
            {/* Website Knowledge Source Card */}
            <Card className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Website Knowledge Base</span>
                  <Badge variant={isReady ? "success" : isFailed ? "warning" : "default"}>
                    {isReady ? "Indexed & Ready" : isProcessing ? "Indexing…" : "Ingestion Failed"}
                  </Badge>
                </div>
                {websiteUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isProcessing || isRetryingIngestion}
                    onClick={() => void handleRetryIngestion()}
                    className="h-8 text-xs border-violet-500/30 text-violet-300 hover:bg-violet-950/30 cursor-pointer flex items-center gap-1.5"
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
                    <span>{isRetryingIngestion ? "Re-syncing…" : "Sync Latest Website"}</span>
                  </Button>
                )}
              </div>

              {/* Sync Error / Success Alerts in Settings */}
              {retryError && (
                <div className="rounded-md border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-200 flex items-center justify-between gap-2">
                  <span>{retryError}</span>
                  <button
                    type="button"
                    onClick={() => setRetryError(null)}
                    className="text-rose-400 hover:text-white cursor-pointer font-bold"
                  >
                    &times;
                  </button>
                </div>
              )}
              {syncNotice && (
                <div className="rounded-md border border-violet-500/30 bg-violet-950/20 px-3 py-2 text-xs text-violet-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span>{syncNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSyncNotice(null)}
                    className="text-violet-400 hover:text-white cursor-pointer font-bold"
                  >
                    &times;
                  </button>
                </div>
              )}

              <div className="flex flex-col divide-y divide-zinc-800/80 text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-zinc-400">Target URL</span>
                  <a
                    href={websiteUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:underline font-mono"
                  >
                    {websiteUrl || "No URL specified"}
                  </a>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-zinc-400">Creation Mode</span>
                  <span className="text-zinc-200 font-mono">Instant URL Synthesis</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-zinc-400">Vector Embeddings</span>
                  <span className="text-zinc-200">Gemini Text-Embedding-004 (768-dim)</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-zinc-400">Vector Storage</span>
                  <span className="text-zinc-200">ChromaDB / Qdrant RAG store</span>
                </div>
              </div>
            </Card>

            {/* AI Runtime Configuration & Direct Engine Controls */}
            <Card className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>AI Engine & Parameters</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                      Direct Control
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Update model, API key, and session limits directly without leaving this page.
                  </p>
                </div>
                <Link
                  href={`/dashboard/chatbots/${chatbot.id}/settings`}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1 hover:underline"
                >
                  Advanced Settings
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {settingsSuccessNotice && (
                <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{settingsSuccessNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsSuccessNotice(null)}
                    className="text-zinc-400 hover:text-white text-xs ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {settingsErrorNotice && (
                <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{settingsErrorNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsErrorNotice(null)}
                    className="text-zinc-400 hover:text-white text-xs ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveEngineSettings} className="flex flex-col gap-5">
                {/* Provider and Model selectors */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="inplace-provider" className="text-xs text-zinc-300 font-medium">
                      LLM Provider
                    </Label>
                    <CustomSelect
                      id="inplace-provider"
                      value={editProvider}
                      onChange={handleEditProviderChange}
                      disabled={isSavingSettings}
                      options={LLM_PROVIDERS.map((p) => ({
                        value: p.value,
                        label: p.label,
                      }))}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="inplace-model" className="text-xs text-zinc-300 font-medium">
                      Model Endpoint
                    </Label>
                    <CustomSelect
                      id="inplace-model"
                      value={editModel}
                      onChange={(val) => setEditModel(val)}
                      disabled={isSavingSettings}
                      options={LLM_MODELS_BY_PROVIDER[editProvider] || []}
                    />
                  </div>
                </div>

                {/* API Key field */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inplace-api-key" className="text-xs text-zinc-300 font-medium">
                      Custom Provider API Key (BYOK)
                    </Label>
                    {chatbot.hasApiKey && (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Key configured &amp; active
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="inplace-api-key"
                      type={showEditApiKey ? "text" : "password"}
                      value={editApiKey}
                      onChange={(e) => setEditApiKey(e.target.value)}
                      disabled={isSavingSettings}
                      placeholder={
                        chatbot.hasApiKey
                          ? "Enter new key to replace existing key..."
                          : "Paste your provider API key (sk-...)"
                      }
                      className="pr-20 font-mono text-xs bg-zinc-900/80 border-zinc-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditApiKey(!showEditApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200 px-1 py-0.5 rounded cursor-pointer"
                    >
                      {showEditApiKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Stored securely via AES-256-GCM encryption. Leave blank to keep existing key.
                  </span>
                </div>

                {/* Session Message Limit */}
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3.5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-zinc-200">Session Message Rate Limit</Label>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Cap maximum consecutive queries a visitor can ask per session to prevent API credit exhaustion.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setEditSessionLimitType("unlimited")}
                      className={`px-3 py-2 text-xs font-medium rounded-md border transition-all text-left flex items-center justify-between cursor-pointer ${
                        editSessionLimitType === "unlimited"
                          ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      <span>Unlimited (No Cap)</span>
                      {editSessionLimitType === "unlimited" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSessionLimitType("custom")}
                      className={`px-3 py-2 text-xs font-medium rounded-md border transition-all text-left flex items-center justify-between cursor-pointer ${
                        editSessionLimitType === "custom"
                          ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      <span>Custom Limit</span>
                      {editSessionLimitType === "custom" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      )}
                    </button>
                  </div>

                  {editSessionLimitType === "custom" && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={1000}
                          value={editSessionCustomLimit}
                          onChange={(e) => setEditSessionCustomLimit(e.target.value)}
                          disabled={isSavingSettings}
                          className="w-24 text-xs font-mono bg-zinc-900 border-zinc-800 text-center"
                        />
                        <span className="text-xs text-zinc-400">messages / session</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-zinc-500 mr-1">Presets:</span>
                        {[5, 10, 20, 50].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setEditSessionCustomLimit(String(preset))}
                            className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors cursor-pointer ${
                              editSessionCustomLimit === String(preset)
                                ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Temperature and Max Tokens */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1 border-t border-zinc-800/60">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="inplace-temp" className="text-xs text-zinc-300 font-medium">
                        Temperature
                      </Label>
                      <span className="text-xs text-zinc-400 font-mono">{editTemperature}</span>
                    </div>
                    <Input
                      id="inplace-temp"
                      type="number"
                      step={0.1}
                      min={0}
                      max={2}
                      value={editTemperature}
                      onChange={(e) => setEditTemperature(e.target.value)}
                      disabled={isSavingSettings}
                      className="text-xs font-mono bg-zinc-900/80 border-zinc-800"
                    />
                    <span className="text-[11px] text-zinc-500">0.0 = strict factuality, 1.0 = creative.</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="inplace-tokens" className="text-xs text-zinc-300 font-medium">
                        Max Tokens
                      </Label>
                      <span className="text-xs text-zinc-400 font-mono">{editMaxTokens}</span>
                    </div>
                    <Input
                      id="inplace-tokens"
                      type="number"
                      step={128}
                      min={1}
                      max={32000}
                      value={editMaxTokens}
                      onChange={(e) => setEditMaxTokens(e.target.value)}
                      disabled={isSavingSettings}
                      className="text-xs font-mono bg-zinc-900/80 border-zinc-800"
                    />
                    <span className="text-[11px] text-zinc-500">Upper limit on length of generated responses.</span>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  <span className="text-xs text-zinc-500">
                    Changes take effect immediately for playground and live widgets.
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingSettings}
                    className="h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSavingSettings ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Parameters</span>
                    )}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Danger Zone: Delete Bot */}
            <Card className="rounded-xl border border-red-950/40 bg-red-950/10 p-5 shadow-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-red-300">Danger Zone</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Permanently delete this Instant Bot and its vector knowledge base.
                  </p>
                </div>
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isDeletingChatbot}
                      onClick={() => void handleDeleteChatbot()}
                      className="h-8 text-xs font-semibold cursor-pointer"
                    >
                      {isDeletingChatbot ? "Deleting…" : "Confirm Delete"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isDeletingChatbot}
                      onClick={() => setIsConfirmingDelete(false)}
                      className="h-8 text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="h-8 text-xs font-semibold cursor-pointer"
                  >
                    Delete Assistant
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
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

              {/* Simulator Action Buttons & Viewport switchers */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleFloatingWidget}
                  className="rounded px-2.5 py-1 text-xs font-medium border border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/30 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Launch the floating bubble widget directly on this screen to preview it"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">
                    {isFloatingWidgetActive ? "Close Widget" : "Test Floating Widget"}
                  </span>
                  <span className="sm:hidden">
                    {isFloatingWidgetActive ? "Close" : "Test Widget"}
                  </span>
                </button>

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
                    className="rounded px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="Reset conversation"
                  >
                    <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}

                <div className="h-3 w-px bg-zinc-800 hidden md:block" />

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
                  {messages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-5 my-auto">
                      <div className="h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-200 font-semibold mb-3 shadow-xs text-sm">
                        {chatbot.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="text-sm font-semibold text-white">
                        Welcome to {chatbot.name}!
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
                        {chatbot.description ||
                          "Ask any question about your ingested documents or click a starter question below:"}
                      </p>

                      {/* Interactive Starter Questions Chips */}
                      <div className="mt-4 flex flex-col gap-2 w-full max-w-sm">
                        {(chatbot.starterQuestions && chatbot.starterQuestions.length > 0
                          ? chatbot.starterQuestions
                          : [
                            "Summarize key information from the knowledge base",
                            "What topics and services are documented?",
                            "How do I get started?",
                          ]
                        ).map((question, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={isLoadingResponse || isStreaming}
                            onClick={() => void sendQuestion(question)}
                            className="text-left text-xs text-zinc-300 bg-zinc-900/70 hover:bg-zinc-800 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-between gap-2 group shadow-xs"
                          >
                            <span className="truncate font-medium">{question}</span>
                            <svg
                              className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 shrink-0 transition-colors"
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

          {/* Knowledge Sources & Grounding Studio Hub */}
          <Card className="rounded-md border border-zinc-800 bg-[#000000] p-5 flex flex-col gap-3.5">
            {/* Hidden File Input for Instant Studio Ingestion */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleCustomBotFileUpload}
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.md,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  Knowledge Sources
                </span>
                <span className="font-mono text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                  {knowledgeSources.length} {knowledgeSources.length === 1 ? "source" : "sources"}
                </span>
              </div>
              <Badge variant={chatbot.ragEnabled ? "success" : "default"}>
                <span
                  className={`h-2 w-2 rounded-full ${chatbot.ragEnabled ? "bg-emerald-400" : "bg-zinc-500"
                    } mr-1`}
                />
                {chatbot.ragEnabled ? "RAG Active" : "Disabled"}
              </Badge>
            </div>

            {/* Quick Upload & Add Actions */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isUploadingSource}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 cursor-pointer flex items-center gap-1.5 flex-1"
              >
                {isUploadingSource ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Ingesting Document…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span>Upload Document</span>
                  </>
                )}
              </Button>

              <Link
                href={`/dashboard/chatbots/${chatbot.id}/knowledge-sources/new`}
                className="h-8 px-3 rounded-md text-xs font-medium border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>+ Web URL</span>
              </Link>
            </div>

            {/* Upload Feedback Messages */}
            {uploadSourceSuccess && (
              <div className="p-2.5 rounded-md bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <span>{uploadSourceSuccess}</span>
                <button
                  type="button"
                  onClick={() => setUploadSourceSuccess(null)}
                  className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            {uploadSourceError && (
              <div className="p-2.5 rounded-md bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <span>{uploadSourceError}</span>
                <button
                  type="button"
                  onClick={() => setUploadSourceError(null)}
                  className="text-rose-400 hover:text-white font-bold ml-2 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Ingested Sources List */}
            {ksStatus === "loading" && knowledgeSources.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                Loading knowledge sources…
              </div>
            ) : knowledgeSources.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center">
                <p className="text-xs text-zinc-400">
                  No documents ingested yet. Ground your chatbot by uploading PDF, DOCX, PPTX, CSV, TXT, or Image files.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {knowledgeSources.map((source) => {
                  const ext = source.name.split(".").pop()?.toLowerCase() || "";
                  const isUrl = source.type === "URL" || source.type === "WEBPAGE";
                  const isReady = source.status === "READY";
                  const isProcessing = source.status === "PENDING" || source.status === "PROCESSING";
                  const isFailed = source.status === "FAILED";

                  return (
                    <div
                      key={source.id}
                      className="flex items-center justify-between gap-2.5 rounded-md border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Format Badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          isUrl
                            ? "bg-violet-500/20 text-violet-300"
                            : ext === "pdf"
                            ? "bg-rose-500/20 text-rose-300"
                            : ext === "docx" || ext === "doc"
                            ? "bg-sky-500/20 text-sky-300"
                            : ext === "pptx" || ext === "ppt"
                            ? "bg-amber-500/20 text-amber-300"
                            : ext === "csv"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : ["png", "jpg", "jpeg", "webp"].includes(ext)
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {isUrl ? "URL" : ext.toUpperCase() || "DOC"}
                        </span>

                        <span className="truncate text-zinc-200 font-medium font-mono" title={source.name}>
                          {source.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Ready
                          </span>
                        ) : isProcessing ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Indexing…
                          </span>
                        ) : isFailed ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-rose-400 font-mono">Failed</span>
                            <button
                              type="button"
                              onClick={() => void handleRetryCustomSource(source.id)}
                              disabled={retryingSourceId === source.id}
                              className="px-2 py-0.5 rounded text-[10px] bg-rose-950 border border-rose-800 text-rose-200 hover:bg-rose-900 cursor-pointer disabled:opacity-50"
                            >
                              {retryingSourceId === source.id ? "…" : "Retry"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 font-mono">{source.status}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                Top {chatbot.ragTopK || 5} chunks · Threshold {chatbot.ragSimilarityThreshold || 0.7}
              </span>
              <Link
                href={`/dashboard/chatbots/${chatbot.id}/knowledge-sources`}
                className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1"
              >
                <span>Full Manager</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
