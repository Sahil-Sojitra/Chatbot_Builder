"use client";

import Link from "next/link";
import { useState } from "react";

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
import { chatbotsApi } from "@/lib/api/chatbots";
import { ApiRequestError } from "@/lib/api/client";
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
}

export default function ChatbotOverviewPage() {
  const { chatbot, setChatbot } = useChatbotDetail();
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Simulator state
  const [deviceMode, setDeviceMode] = useState<"widget" | "mobile">("widget");
  const [activeCodeTab, setActiveCodeTab] = useState<"script" | "curl" | "json">("script");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-1",
      sender: "bot",
      text: `Hello! I'm ${chatbot?.name || "your assistant"}. How can I help you today?`,
      time: "Just now",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSimulatingResponse, setIsSimulatingResponse] = useState(false);

  if (!chatbot) {
    return null;
  }

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSimulatingResponse) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsSimulatingResponse(true);

    // Simulator response
    setTimeout(() => {
      let botResponse = `I received your question: "${trimmed}".`;
      if (chatbot.systemPrompt) {
        botResponse += ` I am configured with instructions to answer based on: "${chatbot.systemPrompt.slice(0, 80)}..."`;
      }
      if (chatbot.ragEnabled) {
        botResponse += `\n\n[RAG Retrieval Simulated]: Searched linked knowledge base (top K: ${chatbot.ragTopK || 5}).`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsSimulatingResponse(false);
    }, 800);
  };

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
                  className={`h-2 w-2 rounded-full ${
                    chatbot.status === "ACTIVE"
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
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
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
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    deviceMode === "mobile"
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
                className={`flex flex-col rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl transition-all duration-200 overflow-hidden ${
                  deviceMode === "widget"
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
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-sm">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      <div
                        className={`rounded-md p-3.5 leading-relaxed text-sm ${
                          msg.sender === "user"
                            ? "bg-zinc-800 border border-zinc-700 text-white font-normal"
                            : "bg-[#141414] border border-zinc-800 text-zinc-100 font-normal"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-xs text-zinc-500 mt-1 px-1 font-mono">{msg.time}</span>
                    </div>
                  ))}

                  {isSimulatingResponse ? (
                    <div className="self-start flex items-center gap-2 rounded-md bg-[#141414] border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-400 font-mono">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Generating response via {chatbot.model || "gpt-4o-mini"}…</span>
                    </div>
                  ) : null}
                </div>

                {/* Interactive Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-zinc-800 bg-[#0e0e0e] p-2.5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask a test question…"
                    className="flex-1 rounded-md border border-zinc-800 bg-[#000000] px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
                  />
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() || isSimulatingResponse}
                    size="default"
                    className="h-9 px-3.5"
                  >
                    Send
                  </Button>
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
                  className={`rounded px-2 py-0.5 cursor-pointer transition-colors ${
                    activeCodeTab === "script"
                      ? "bg-zinc-800 text-white font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("curl")}
                  className={`rounded px-2 py-0.5 cursor-pointer transition-colors ${
                    activeCodeTab === "curl"
                      ? "bg-zinc-800 text-white font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  cURL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("json")}
                  className={`rounded px-2 py-0.5 cursor-pointer transition-colors ${
                    activeCodeTab === "json"
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
                  className={`h-2 w-2 rounded-full ${
                    chatbot.ragEnabled ? "bg-emerald-400" : "bg-zinc-500"
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
