"use client";

import { useState, useEffect, useRef } from "react";
import { Badge, Button } from "@/components/ui";

interface PresetQnA {
  id: string;
  label: string;
  question: string;
  ragAnswer: string;
  noRagAnswer: string;
  source: string;
  similarity: string;
  latency: string;
}

const PRESETS: PresetQnA[] = [
  {
    id: "b2-upload",
    label: "Direct B2 Storage Uploads",
    question: "How does direct presigned B2 document upload work?",
    ragAnswer:
      "Chatbot Studio generates a presigned Backblaze B2 PUT URL on the backend. The client uploads large PDFs or Word documents directly to cloud storage with SHA-256 integrity verification, bypassing backend server memory. Once uploaded, background workers extract text, slice chunks, and index vectors.",
    noRagAnswer:
      "You can generally upload files to cloud object storage using presigned URLs provided by your S3 or B2 compatible storage provider.",
    source: "docs/architecture/storage-pipeline.md (Chunk #3)",
    similarity: "0.942",
    latency: "42ms",
  },
  {
    id: "widget-embed",
    label: "1-Line Client Embed",
    question: "How do I embed the chatbot onto my website?",
    ragAnswer:
      "Add a single script tag: <script src=\"https://cdn.chatbotstudio.io/v1/widget.js\" data-public-id=\"bot_live_8f3a9\" defer></script>. The widget initializes an isolated Shadow DOM container with zero host CSS conflicts and automatic responsive drawer transitions.",
    noRagAnswer:
      "Most chatbots provide an iframe or a JavaScript snippet you can paste into your website's HTML before the closing body tag.",
    source: "docs/integration/client-widget.md (Chunk #1)",
    similarity: "0.968",
    latency: "38ms",
  },
  {
    id: "rag-threshold",
    label: "Cosine Similarity Tuning",
    question: "How does similarity threshold filtering prevent hallucinations?",
    ragAnswer:
      "When a query arrives, it is embedded and matched against your knowledge base using cosine distance. If similarity falls below your configured threshold (e.g. 0.75), irrelevant chunks are discarded. The LLM is instructed only to answer with validated context, eliminating hallucinations.",
    noRagAnswer:
      "Vector search uses cosine similarity to find closest matching text chunks and passes them to the model context.",
    source: "docs/rag/vector-retrieval.md (Chunk #4)",
    similarity: "0.915",
    latency: "46ms",
  },
];

export function HeroDemo() {
  const [selectedPreset, setSelectedPreset] = useState<PresetQnA>(PRESETS[0]);
  const [provider, setProvider] = useState<"openai" | "anthropic" | "gemini">("openai");
  const [ragEnabled, setRagEnabled] = useState(true);
  const [userQuery, setUserQuery] = useState(PRESETS[0].question);
  const [customResponse, setCustomResponse] = useState<string | null>(null);

  // Streaming text animation effect
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fullTargetAnswer = customResponse
    ? customResponse
    : ragEnabled
      ? selectedPreset.ragAnswer
      : selectedPreset.noRagAnswer;

  useEffect(() => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    setIsStreaming(true);
    setDisplayedText("");

    const target = fullTargetAnswer;
    const words = target.split(" ");
    let wordIdx = 0;

    streamTimerRef.current = setInterval(() => {
      wordIdx += 1;
      if (wordIdx >= words.length) {
        setDisplayedText(target);
        setIsStreaming(false);
        if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      } else {
        setDisplayedText(words.slice(0, wordIdx).join(" "));
      }
    }, 36);

    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [fullTargetAnswer, provider, ragEnabled]);

  const handleSelectPreset = (preset: PresetQnA) => {
    setSelectedPreset(preset);
    setUserQuery(preset.question);
    setCustomResponse(null);
  };

  const handleSend = () => {
    if (!userQuery.trim()) return;
    const match = PRESETS.find(
      (p) => p.question.toLowerCase() === userQuery.trim().toLowerCase(),
    );
    if (match) {
      setSelectedPreset(match);
      setCustomResponse(null);
    } else {
      setCustomResponse(
        ragEnabled
          ? `[Retrieved Context from Workspace Knowledge Base]: "${userQuery}" processed with vector similarity > 0.88. The agent responds with grounded precision using your linked documentation and system parameters.`
          : `Standard response generated from base LLM (${provider.toUpperCase()}) without private organization context.`,
      );
    }
  };

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xl dark:border-white/10 dark:bg-[#0E1B15] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all">
      {/* Console Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 bg-zinc-50/90 dark:border-white/[0.08] dark:bg-[#070D0A]/90 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
          </div>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            deployment: <span className="text-zinc-900 dark:text-white font-medium">customer-ops-v1</span>
          </span>
          <span className="hidden sm:inline-block font-mono text-xs text-zinc-300 dark:text-white/20">/</span>
          <span className="hidden sm:inline-block font-mono text-xs text-zinc-500 dark:text-zinc-400">
            publicId: <span className="text-zinc-800 dark:text-zinc-300 font-mono">bot_live_8f3a9</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider Selector */}
          <div className="flex items-center rounded-full border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/[0.04] p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setProvider("openai")}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                provider === "openai"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              OpenAI
            </button>
            <button
              type="button"
              onClick={() => setProvider("anthropic")}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                provider === "anthropic"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Claude
            </button>
            <button
              type="button"
              onClick={() => setProvider("gemini")}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                provider === "gemini"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Gemini
            </button>
          </div>

          {/* RAG Toggle */}
          <button
            type="button"
            onClick={() => setRagEnabled(!ragEnabled)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono font-semibold transition-all cursor-pointer ${
              ragEnabled
                ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                ragEnabled
                  ? "bg-emerald-600 shadow-[0_0_8px_rgba(5, 150, 105, 0.8)] anim-live-pulse"
                  : "bg-zinc-400"
              }`}
            />
            <span>RAG: {ragEnabled ? "ACTIVE" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* Preset Question Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-200/80 bg-zinc-50 dark:border-white/[0.08] dark:bg-[#0A100D] px-5 py-2.5">
        <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">Sample Inquiries:</span>
        {PRESETS.map((preset) => {
          const isActive = selectedPreset.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "border-emerald-600 bg-emerald-600 text-white font-semibold shadow-xs dark:border-emerald-500"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Dialogue Surface */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 min-h-[220px]">
        {/* User Question Bubble */}
        <div className="ml-auto max-w-xl rounded-2xl rounded-br-xs border border-zinc-200/80 bg-zinc-100 dark:border-white/10 dark:bg-white/[0.06] p-3.5 sm:p-4 text-xs sm:text-sm text-zinc-900 dark:text-white shadow-xs leading-relaxed">
          <p className="font-medium">{userQuery}</p>
        </div>

        {/* AI Assistant Bubble with RAG provenance */}
        <div className="flex flex-col gap-2.5 max-w-2xl">
          {ragEnabled && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 font-semibold text-[11px] dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 anim-live-pulse" />
                Retrieved Context ({selectedPreset.similarity} score)
              </span>
              <span className="text-zinc-400 dark:text-zinc-500 text-[11px]">source:</span>
              <span className="text-zinc-600 dark:text-zinc-300 text-[11px] font-mono">{selectedPreset.source}</span>
            </div>
          )}

          <div className="rounded-2xl rounded-bl-xs border border-zinc-200/90 bg-zinc-50 dark:border-white/[0.08] dark:bg-[#070D0A] p-4 sm:p-5 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed shadow-xs">
            <p className="whitespace-pre-line">
              {displayedText}
              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 bg-emerald-600 dark:bg-emerald-400 ml-1 animate-pulse align-middle" />
              )}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-200/80 dark:border-white/[0.08] pt-3 text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2 text-[11px]">
                <span>runtime: <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{provider}</span></span>
                <span>•</span>
                <span>latency: <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{selectedPreset.latency}</span></span>
                <span>•</span>
                <span>tokens: <span className="text-zinc-800 dark:text-zinc-200">184</span></span>
              </div>
              <Badge variant="lime" className="text-[10px] uppercase font-mono">
                200 OK
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bottom Prompt Bar */}
      <div className="flex items-center gap-2.5 border-t border-zinc-200/80 bg-zinc-50/80 dark:border-white/[0.08] dark:bg-[#070D0A]/80 p-3 sm:p-4">
        <input
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask anything about Backblaze B2, vector RAG, or widget embedding…"
          className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#0E1B15] dark:text-white dark:placeholder-zinc-500 transition-all shadow-xs"
        />
        <button
          type="button"
          onClick={handleSend}
          className="btn-shimmer-sweep shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-xs sm:text-sm shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Execute &rarr;
        </button>
      </div>
    </div>
  );
}
