"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui";
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
    } catch {
      // Fallback
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(result.embedSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="max-w-2xl mx-auto rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 sm:p-8 shadow-xl">
      {/* Top Banner / Celebration */}
      <div className="flex flex-col items-center text-center pb-6 border-b border-zinc-800/80">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready for Deployment
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
          {result.name} is ready!
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mt-1">
          We crawled <span className="text-zinc-200 font-mono font-medium">{result.websiteUrl}</span>,
          extracted knowledge pages, and generated your ready-to-test chatbot.
        </p>

        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-6 mt-4 py-2 px-4 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs">
          <div>
            <span className="text-zinc-500 block">Pages Found</span>
            <span className="text-white font-semibold font-mono text-sm">{result.pagesDiscovered}</span>
          </div>
          <div className="w-px h-6 bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block">Knowledge Chunks</span>
            <span className="text-white font-semibold font-mono text-sm">{result.documentsIndexed}</span>
          </div>
          <div className="w-px h-6 bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block">Status</span>
            <span className="text-emerald-400 font-semibold text-sm">Active</span>
          </div>
        </div>

        {/* Partial Crawl Notice if some pages failed */}
        {Boolean(result.pagesFailed && result.pagesFailed > 0) && (
          <div className="mt-3 py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-left text-xs text-amber-300 flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-amber-200">Partial Crawl Completed</span>
              <span className="text-amber-300/90 text-[11px]">
                {result.pagesDiscovered - (result.pagesFailed ?? 0)} of {result.pagesDiscovered} pages were successfully indexed. {result.pagesFailed} page(s) were inaccessible or returned an error and were safely skipped.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 pt-6">
        {/* Managed Platform Testing Notice */}
        <div className="rounded-lg border border-violet-500/20 bg-violet-950/20 p-5 text-left flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-sm font-semibold text-white">Platform Testing Ready</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Your Instant Bot is fully indexed and ready for live question answering directly on our platform. 
            All AI parameters and knowledge embeddings are managed automatically.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/dashboard/chatbots"
            className={buttonVariants({ variant: "outline", size: "default" })}
          >
            &larr; Return to Chatbots
          </Link>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 cursor-pointer transition-colors"
            >
              Create another bot
            </button>
            <Link
              href={`/dashboard/chatbots/${result.botId}`}
              className={buttonVariants({ variant: "primary", size: "default" })}
            >
              Test Chatbot in Playground &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
