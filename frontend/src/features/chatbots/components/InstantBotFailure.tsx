"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

interface InstantBotFailureProps {
  websiteUrl: string;
  chatbotId?: string;
  errorMessage?: string;
  isRetrying?: boolean;
  onRetry: () => void;
  onEditUrl: () => void;
}

export function InstantBotFailure({
  websiteUrl,
  chatbotId,
  errorMessage,
  isRetrying = false,
  onRetry,
  onEditUrl,
}: InstantBotFailureProps) {
  const isBotBlocked = Boolean(
    errorMessage &&
      (errorMessage.toLowerCase().includes("cloudflare") ||
        errorMessage.toLowerCase().includes("bot security verification") ||
        errorMessage.toLowerCase().includes("anti-bot"))
  );

  return (
    <div className="relative max-w-xl mx-auto">
      <div className="relative rounded-[26px] border border-rose-500/40 bg-white dark:bg-[#111218]/90 p-6 sm:p-8 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex flex-col items-center text-center pb-6 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className={`size-14 rounded-full flex items-center justify-center mb-3.5 shadow-lg ${
            isBotBlocked
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
              : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
          }`}>
            {isBotBlocked ? (
              <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : (
              <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2.5 ${
            isBotBlocked
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
          }`}>
            {isBotBlocked ? "Protected Domain Detected" : "Setup Needs Attention"}
          </span>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {isBotBlocked
              ? "Website Protected by Anti-Bot Verification"
              : "Couldn't finish setting up your Instant Bot"}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-md leading-relaxed">
            {errorMessage ||
              "We were unable to crawl your website pages or extract enough readable text to build your assistant's knowledge base."}
          </p>

          {isBotBlocked && (
            <div className="mt-4 w-full p-4 rounded-[18px] bg-amber-500/10 border border-amber-500/25 text-left flex gap-3 items-start">
              <span className="text-amber-400 text-lg mt-0.5">🛡️</span>
              <div>
                <h4 className="text-xs font-bold text-amber-200">Cloudflare Bot Verification Active</h4>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  This domain requires interactive browser challenges, blocking automated scraping. You can still build this assistant by uploading website documents (PDF/TXT) or pasting content directly.
                </p>
              </div>
            </div>
          )}

          {/* Display preserved URL */}
          <div className="mt-4 w-full p-3.5 rounded-[18px] bg-white/[0.02] border border-white/[0.08] text-left">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
              Target Website URL
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-300 truncate">{websiteUrl}</span>
              <button
                type="button"
                onClick={onEditUrl}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium ml-2 shrink-0 cursor-pointer"
              >
                Change URL
              </button>
            </div>
          </div>
        </div>

        {/* Suggested next steps */}
        <div className="py-4 space-y-2 text-xs text-zinc-400">
          <p className="font-semibold text-zinc-300">Common causes:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
            <li>The site requires authentication or blocked our crawler with Cloudflare/WAF.</li>
            <li>The domain was mistyped or does not serve public HTML pages.</li>
            <li>Temporary network timeout while connecting to the target server.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/chatbots"
              className="rounded-full px-4 py-2 text-xs text-zinc-400 hover:text-white border border-white/[0.1] hover:border-white/20 transition-all"
            >
              ← Return to Dashboard
            </Link>
            {chatbotId && (
              <Link
                href={`/dashboard/chatbots/${chatbotId}`}
                className="rounded-full px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
              >
                View Bot Studio &rarr;
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={onEditUrl}
              disabled={isRetrying}
              className="rounded-full px-5 text-xs w-full sm:w-auto"
            >
              Correct URL
            </Button>
            <Button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="btn-volt rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs px-6 shadow-[0_10px_26px_rgba(5, 150, 105, 0.35)] w-full sm:w-auto"
            >
              {isRetrying ? "Retrying..." : "Retry Pipeline"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
