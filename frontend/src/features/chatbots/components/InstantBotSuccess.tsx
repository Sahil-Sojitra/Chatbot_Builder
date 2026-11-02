"use client";

import Link from "next/link";
import { useState } from "react";

import type { InstantBotResult } from "../instantBotTypes";

interface InstantBotSuccessProps {
  result: InstantBotResult;
  onReset: () => void;
}

export function InstantBotSuccess({ result, onReset }: InstantBotSuccessProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(result.publicUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {}
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(result.embedSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {}
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Ambient Radial Spotlight */}
      <div className="absolute -top-20 -right-20 size-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative rounded-[26px] border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xl dark:border-white/[0.08] dark:bg-[#111218]/90 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* Top Celebration */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="size-14 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/35 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(5,150,105,0.25)]">
            <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25 shadow-2xs">
              <span className="size-1.5 rounded-full bg-emerald-600 anim-live-pulse" />
              Ready for Deployment
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            {result.name} is ready!
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mt-2 leading-relaxed">
            We crawled <span className="inline-block text-emerald-800 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono text-xs font-semibold">{result.websiteUrl}</span>,
            extracted knowledge pages, and generated your ready-to-test assistant.
          </p>

          {/* Quick Stats Strip */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-6 py-3.5 px-6 sm:px-8 rounded-full bg-zinc-50 border border-zinc-200 dark:bg-white/[0.03] dark:border-white/[0.08] text-xs shadow-2xs">
            <div className="text-center">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px] font-mono uppercase tracking-wider font-semibold">Pages Found</span>
              <span className="text-zinc-950 dark:text-white font-extrabold font-mono text-base sm:text-lg">{result.pagesDiscovered ?? 0}</span>
            </div>
            <div className="w-px h-7 bg-zinc-200 dark:bg-white/[0.08]" />
            <div className="text-center">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px] font-mono uppercase tracking-wider font-semibold">Chunks Indexed</span>
              <span className="text-zinc-950 dark:text-white font-extrabold font-mono text-base sm:text-lg">{result.documentsIndexed ?? 0}</span>
            </div>
            <div className="w-px h-7 bg-zinc-200 dark:bg-white/[0.08]" />
            <div className="text-center">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px] font-mono uppercase tracking-wider font-semibold">Status</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-base flex items-center gap-1.5 justify-center">
                <span className="size-1.5 rounded-full bg-emerald-600 anim-live-pulse" />
                Active
              </span>
            </div>
          </div>

          {/* Partial Crawl Notice if some pages failed */}
          {Boolean(result.pagesFailed && result.pagesFailed > 0) && (
            <div className="mt-4 py-2.5 px-4 rounded-[18px] bg-amber-50 border border-amber-300 text-left text-xs text-amber-950 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-300 flex items-start gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-amber-900 dark:text-amber-200">Partial Crawl Completed</span>
                <span className="text-amber-800 dark:text-amber-300/90 text-[11px]">
                  {result.pagesDiscovered - (result.pagesFailed ?? 0)} of {result.pagesDiscovered} pages were successfully indexed. {result.pagesFailed} page(s) were inaccessible or protected by bot verification and were safely skipped.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 pt-6">
          {/* Managed Platform Testing Ready Notice */}
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-950/20 p-5 text-left flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-600 anim-live-pulse shrink-0" />
              <span className="text-sm font-bold text-emerald-950 dark:text-white">Platform Testing Ready</span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
              Your Instant Bot is fully vectorized and ready for live question answering directly on our platform. 
              All AI parameters and knowledge embeddings are managed automatically with zero setup required.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/20 dark:border-white/[0.08] text-[11px] font-mono text-emerald-900 dark:text-emerald-300">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 border border-emerald-500/25 dark:bg-emerald-900/40">
                <span>⚡</span>
                <span>Sub-50ms Streaming</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 border border-emerald-500/25 dark:bg-emerald-900/40">
                <span>🛡️</span>
                <span>Isolated Shadow DOM</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 border border-emerald-500/25 dark:bg-emerald-900/40">
                <span>📚</span>
                <span>Grounded Citations</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-zinc-200 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/dashboard/chatbots"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold text-zinc-700 bg-white hover:text-zinc-950 border border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:text-white dark:border-white/10 dark:hover:bg-white/[0.08] transition-all shadow-2xs"
            >
              ← Return to Chatbots
            </Link>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white px-3 py-1.5 cursor-pointer transition-colors underline-offset-4 hover:underline"
              >
                Create another bot
              </button>
              <Link
                href={`/dashboard/chatbots/${result.botId}`}
                className="btn-volt inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs sm:text-sm px-6 py-2.5 shadow-[0_10px_28px_rgba(5,150,105,0.35)] hover:shadow-[0_12px_32px_rgba(5,150,105,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Test Chatbot in Playground</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
