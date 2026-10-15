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
      </div>

      <div className="space-y-6 pt-6">
        {/* 1. Public Chatbot URL */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
              Public Chatbot URL (Placeholder)
            </label>
            <span className="text-[11px] text-zinc-500">Share with team members or testers</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={result.publicUrl}
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none select-all"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyUrl}
              className="shrink-0"
            >
              {copiedUrl ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy URL
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* 2. Website Embed Code Snippet */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
              Website Embed Snippet
            </label>
            <span className="text-[11px] text-zinc-500">Paste before the &lt;/body&gt; tag</span>
          </div>
          <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-zinc-300">
              <code>{result.embedSnippet}</code>
            </pre>
            <div className="mt-2.5 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopySnippet}
                className="text-xs h-7 px-3"
              >
                {copiedSnippet ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Snippet Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Snippet
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/dashboard/chatbots"
            className={buttonVariants({ variant: "outline", size: "default" })}
          >
            ← Return to Chatbots Dashboard
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
              href="/dashboard/chatbots"
              className={buttonVariants({ variant: "default", size: "default" })}
            >
              Open Chatbot Studio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
