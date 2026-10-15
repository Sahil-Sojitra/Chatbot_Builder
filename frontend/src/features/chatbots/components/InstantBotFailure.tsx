"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui";

interface InstantBotFailureProps {
  websiteUrl: string;
  errorMessage?: string;
  onRetry: () => void;
  onEditUrl: () => void;
}

export function InstantBotFailure({
  websiteUrl,
  errorMessage,
  onRetry,
  onEditUrl,
}: InstantBotFailureProps) {
  return (
    <div className="max-w-xl mx-auto rounded-xl border border-rose-500/30 bg-[#0a0a0a] p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col items-center text-center pb-6 border-b border-zinc-800">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-2">
          Setup Failed / Needs Attention
        </span>

        <h2 className="text-xl font-bold text-white tracking-tight">
          Couldn&apos;t finish setting up your Instant Bot
        </h2>

        <p className="text-sm text-zinc-400 mt-2 max-w-md">
          {errorMessage ||
            "We were unable to crawl your website pages or extract enough readable text to build your assistant's knowledge base."}
        </p>

        {/* Display preserved URL */}
        <div className="mt-4 w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-left">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
            Target Website URL
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-300 truncate">{websiteUrl}</span>
            <button
              type="button"
              onClick={onEditUrl}
              className="text-xs text-violet-400 hover:text-violet-300 font-medium ml-2 shrink-0 cursor-pointer"
            >
              Change URL
            </button>
          </div>
        </div>
      </div>

      {/* Suggested next steps */}
      <div className="py-4 space-y-2 text-xs text-zinc-400">
        <p className="font-medium text-zinc-300">Common causes:</p>
        <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
          <li>The site requires authentication or blocked our crawler with Cloudflare/WAF.</li>
          <li>The domain was mistyped or does not serve public HTML pages.</li>
          <li>Temporary network timeout while connecting to the target server.</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link
          href="/dashboard/chatbots"
          className={buttonVariants({ variant: "outline", size: "default" })}
        >
          ← Return to Dashboard
        </Link>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={onEditUrl}
            className="w-full sm:w-auto"
          >
            Correct URL
          </Button>
          <Button
            type="button"
            onClick={onRetry}
            className="w-full sm:w-auto bg-[#0052CC] hover:bg-[#0747A6] text-white"
          >
            Retry Pipeline
          </Button>
        </div>
      </div>
    </div>
  );
}
