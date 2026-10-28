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
    <div className="group relative rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs hover:border-emerald-500/40 hover:shadow-md dark:border-white/[0.08] dark:bg-[#0E1B15] dark:hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Avatar & Info */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {/* Monogram Icon */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-display font-extrabold text-base shadow-xs shadow-emerald-600/25 ring-2 ring-emerald-500/15 transition-transform group-hover:scale-105">
            {chatbot.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/chatbots/${chatbot.id}`}
                className="font-display font-bold text-base text-zinc-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors truncate"
              >
                {chatbot.name}
              </Link>
              <span className="font-mono text-xs text-zinc-500 bg-zinc-100 rounded-full px-2.5 py-0.5 border border-zinc-200 dark:text-zinc-400 dark:bg-white/[0.05] dark:border-white/10">
                /{chatbot.slug}
              </span>
            </div>

            {chatbot.description ? (
              <p className="line-clamp-2 mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {chatbot.description}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500 italic">No description provided</p>
            )}

            {/* Metadata Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-zinc-800 bg-zinc-100 border border-zinc-200 dark:text-zinc-200 dark:bg-white/[0.06] dark:border-white/10 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                {isInstant ? "⚡ Instant Crawler" : "🧠 Custom RAG"}
              </span>

              <span className="font-mono text-zinc-600 bg-zinc-50 border border-zinc-200 dark:text-zinc-300 dark:bg-white/[0.04] dark:border-white/10 rounded-full px-2.5 py-0.5 text-[11px]">
                {chatbot.model || "gemini-3.5-flash"}
              </span>

              {chatbot.sessionMessageLimit ? (
                <span className="text-zinc-600 bg-zinc-50 border border-zinc-200 dark:text-zinc-300 dark:bg-white/[0.04] dark:border-white/10 rounded-full px-2.5 py-0.5 text-[11px]">
                  {chatbot.sessionMessageLimit} msg limit
                </span>
              ) : (
                <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/30 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  Unlimited session
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status Pill & Studio CTA */}
        <div className="flex shrink-0 items-center gap-3 sm:self-center">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
              isLive
                ? "border-emerald-500/30 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
                : chatbot.status === "PAUSED"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isLive
                  ? "bg-emerald-600 ring-4 ring-emerald-500/25 anim-live-pulse"
                  : chatbot.status === "PAUSED"
                  ? "bg-amber-500"
                  : "bg-zinc-400"
              }`}
            />
            <span>
              {chatbot.status === "ACTIVE" ? "Active" : chatbot.status === "PAUSED" ? "Paused" : "Draft"}
            </span>
          </div>

          <Link
            href={`/dashboard/chatbots/${chatbot.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-600 dark:hover:text-white px-3.5 py-1.5 rounded-full transition-all duration-150 shadow-2xs group/btn hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Open Studio</span>
            <svg
              className="w-3.5 h-3.5 transition-transform duration-150 group-hover/btn:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Footer: ID and Date */}
      <div className="border-t border-zinc-100 dark:border-white/[0.06] -mx-6 -mb-6 mt-4.5 px-6 py-2.5 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 rounded-b-2xl bg-zinc-50/70 dark:bg-[#070D0A]/60">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-zinc-400 dark:text-zinc-500">ID:</span>
          <button
            type="button"
            onClick={handleCopyId}
            className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            title="Copy Public ID"
          >
            <span>{chatbot.publicId}</span>
            <svg className="w-3 h-3 opacity-60 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {copied && <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">Copied!</span>}
        </div>

        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
          Created {new Date(chatbot.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
