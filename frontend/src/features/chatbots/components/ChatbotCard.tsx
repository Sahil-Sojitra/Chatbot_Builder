import Link from "next/link";
import { useState } from "react";

import type { Chatbot } from "@/types/chatbot";

export interface ChatbotCardProps {
  chatbot: Chatbot;
}

export function ChatbotCard({ chatbot }: ChatbotCardProps) {
  const isLive = chatbot.status === "ACTIVE";
  const [copied, setCopied] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(chatbot.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isInstant = chatbot.creationMode === "INSTANT";

  return (
    <div className="group relative rounded-xl border border-zinc-800 bg-[#0b0b0e] p-5 transition-all duration-150 hover:border-zinc-700 hover:bg-[#101014]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Avatar & Info */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Minimalist Monogram Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 font-mono text-sm font-semibold transition-colors group-hover:border-zinc-700 group-hover:text-white">
            {chatbot.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/chatbots/${chatbot.id}`}
                className="truncate font-medium text-sm sm:text-base text-zinc-100 hover:text-white hover:underline transition-colors"
              >
                {chatbot.name}
              </Link>
              <span className="font-mono text-xs text-zinc-500 rounded bg-zinc-900 px-1.5 py-0.5 border border-zinc-800">
                /{chatbot.slug}
              </span>
            </div>

            {chatbot.description ? (
              <p className="line-clamp-2 mt-1 text-xs text-zinc-400 leading-relaxed">
                {chatbot.description}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 italic">No description provided</p>
            )}

            {/* Clean Metadata Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 text-zinc-300 bg-zinc-900/90 border border-zinc-800 rounded px-2 py-0.5 text-[11px] font-medium">
                {isInstant ? "Website Crawler" : "Custom RAG"}
              </span>

              <span className="font-mono text-zinc-400 bg-zinc-900/70 border border-zinc-800/80 rounded px-2 py-0.5 text-[11px]">
                {chatbot.model || "gemini-3.5-flash"}
              </span>

              {chatbot.sessionMessageLimit ? (
                <span className="text-zinc-400 bg-zinc-900/70 border border-zinc-800/80 rounded px-2 py-0.5 text-[11px]">
                  {chatbot.sessionMessageLimit} msg limit
                </span>
              ) : (
                <span className="text-zinc-400 bg-zinc-900/70 border border-zinc-800/80 rounded px-2 py-0.5 text-[11px]">
                  Unlimited chat
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status Pill & Studio CTA */}
        <div className="flex shrink-0 items-center gap-3 sm:self-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-zinc-800 bg-zinc-900/60">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLive
                  ? "bg-emerald-400"
                  : chatbot.status === "PAUSED"
                  ? "bg-amber-400"
                  : "bg-zinc-500"
              }`}
            />
            <span
              className={
                isLive
                  ? "text-emerald-400"
                  : chatbot.status === "PAUSED"
                  ? "text-amber-400"
                  : "text-zinc-400"
              }
            >
              {chatbot.status === "ACTIVE" ? "Active" : chatbot.status === "PAUSED" ? "Paused" : "Draft"}
            </span>
          </div>

          <Link
            href={`/dashboard/chatbots/${chatbot.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-md transition-colors"
          >
            <span>Open</span>
            <svg
              className="w-3.5 h-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Subtle Footer: ID and Date */}
      <div className="border-t border-zinc-800/80 -mx-5 -mb-5 mt-4 px-5 py-2.5 flex items-center justify-between text-xs text-zinc-500 rounded-b-xl bg-zinc-950/40">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-zinc-600">ID:</span>
          <button
            type="button"
            onClick={handleCopyId}
            className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Copy Public ID"
          >
            <span>{chatbot.publicId.slice(0, 16)}…</span>
            {copied ? (
              <span className="text-emerald-400 text-[10px] font-sans font-medium flex items-center gap-0.5">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </span>
            ) : (
              <svg className="w-3 h-3 text-zinc-500 hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        <div className="text-zinc-500 text-[11px]">
          Created {new Date(chatbot.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
