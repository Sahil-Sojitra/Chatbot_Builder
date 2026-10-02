"use client";

import { useState } from "react";
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
      "Add a single script tag: <script src=\"https://cdn.chatbotstudio.io/v1/widget.js\" data-public-id=\"bot_live_8f3a9\"></script>. The widget initializes an isolated Shadow DOM container with zero host CSS conflicts and automatic responsive layout.",
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

  const currentAnswer = customResponse
    ? customResponse
    : ragEnabled
      ? selectedPreset.ragAnswer
      : selectedPreset.noRagAnswer;

  return (
    <div className="w-full max-w-4xl overflow-hidden rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-2xl">
      {/* Console Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-[#000000] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-800 border border-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-800 border border-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-800 border border-zinc-700" />
          </div>
          <span className="font-mono text-xs text-zinc-400">
            deployment: <span className="text-white font-medium">customer-ops-v1</span>
          </span>
          <span className="hidden sm:inline-block font-mono text-xs text-zinc-600">/</span>
          <span className="hidden sm:inline-block font-mono text-xs text-zinc-400">
            publicId: <span className="text-zinc-300">bot_live_8f3a9</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider Selector */}
          <div className="flex items-center rounded-md border border-zinc-800 bg-[#0a0a0a] p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setProvider("openai")}
              className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${
                provider === "openai"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              OpenAI
            </button>
            <button
              type="button"
              onClick={() => setProvider("anthropic")}
              className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${
                provider === "anthropic"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Claude
            </button>
            <button
              type="button"
              onClick={() => setProvider("gemini")}
              className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${
                provider === "gemini"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Gemini
            </button>
          </div>

          {/* RAG Toggle */}
          <button
            type="button"
            onClick={() => setRagEnabled(!ragEnabled)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-mono font-medium transition-colors cursor-pointer ${
              ragEnabled
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                ragEnabled
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                  : "bg-zinc-500"
              }`}
            />
            <span>RAG: {ragEnabled ? "ACTIVE" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* Preset Question Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-[#0a0a0a]/60 px-4 py-2.5">
        <span className="shrink-0 text-xs font-medium text-zinc-400">Sample Inquiries:</span>
        {PRESETS.map((preset) => {
          const isActive = selectedPreset.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "border-white bg-white text-black font-semibold shadow-sm"
                  : "border-zinc-800 bg-[#000000] text-zinc-300 hover:border-zinc-700 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Dialogue Surface */}
      <div className="flex flex-col gap-4 p-5">
        {/* User Question Bubble */}
        <div className="ml-auto max-w-xl rounded-md border border-zinc-700 bg-zinc-800/90 p-3.5 text-sm text-zinc-100 shadow-sm leading-relaxed">
          <p className="font-medium">{userQuery}</p>
        </div>

        {/* AI Assistant Bubble with RAG provenance */}
        <div className="flex flex-col gap-2 max-w-2xl">
          {ragEnabled && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-emerald-400">
              <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Retrieved Chunk ({selectedPreset.similarity} similarity)
              </span>
              <span className="text-zinc-500">source:</span>
              <span className="text-zinc-400">{selectedPreset.source}</span>
            </div>
          )}

          <div className="rounded-md border border-zinc-800 bg-[#000000] p-4 text-sm text-zinc-200 leading-relaxed shadow-inner">
            <p className="whitespace-pre-line">{currentAnswer}</p>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs font-mono text-zinc-500">
              <div className="flex items-center gap-2">
                <span>runtime: {provider}</span>
                <span>•</span>
                <span>latency: {selectedPreset.latency}</span>
                <span>•</span>
                <span>tokens: 184</span>
              </div>
              <Badge variant="success" className="text-[10px]">
                200 OK
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bottom Prompt Bar */}
      <div className="flex items-center gap-2 border-t border-zinc-800 bg-[#000000] p-3">
        <input
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask anything about Backblaze B2, vector RAG, or widget embedding…"
          className="flex-1 rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
        <Button
          type="button"
          onClick={handleSend}
          className="shrink-0 text-sm font-medium"
        >
          Execute Query &rarr;
        </Button>
      </div>
    </div>
  );
}
