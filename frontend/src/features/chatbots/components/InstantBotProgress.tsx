"use client";

import Link from "next/link";
import type { InstantBotStage, InstantBotStatus } from "../instantBotTypes";
import { Button } from "@/components/ui";

interface InstantBotProgressProps {
  websiteUrl: string;
  chatbotName: string;
  chatbotId?: string;
  status: InstantBotStatus;
  stages: InstantBotStage[];
  onCancel?: () => void;
}

export function InstantBotProgress({
  websiteUrl,
  chatbotName,
  chatbotId,
  stages,
  onCancel,
}: InstantBotProgressProps) {
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  return (
    <div className="relative max-w-xl mx-auto">
      {/* Ambient Radial Glow */}
      <div className="absolute -top-16 -right-16 size-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative rounded-[26px] border border-zinc-200/80 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#111218]/90 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl p-6 sm:p-8">
        {/* Header Info */}
        <div className="flex flex-col gap-1 pb-5 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="size-1.5 rounded-full bg-emerald-600 anim-live-pulse" />
              Pipeline Ingestion
            </span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {progressPercent}% Complete
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-2">{chatbotName}</h2>
          <div className="flex items-center gap-2 text-xs text-zinc-400 truncate mt-0.5">
            <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate">{websiteUrl}</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="py-5">
          <div className="h-2 w-full bg-zinc-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 rounded-full shadow-[0_0_12px_rgba(5, 150, 105, 0.4)] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progressPercent, 10)}%` }}
            />
          </div>
        </div>

        {/* Multi-stage Checklist */}
        <div className="space-y-3 pt-1">
          {stages.map((stage, idx) => {
            const isDone = stage.status === "completed";
            const isCurrent = stage.status === "current";
            const isFailed = stage.status === "failed";

            return (
              <div
                key={stage.id}
                className={`flex items-start gap-3.5 p-3.5 rounded-[18px] border transition-all ${
                  isCurrent
                    ? "border-emerald-500/40 bg-emerald-600/[0.04] shadow-[0_0_20px_rgba(5, 150, 105, 0.1)]"
                    : isDone
                    ? "border-zinc-200 bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02]"
                    : isFailed
                    ? "border-rose-500/40 bg-rose-500/5"
                    : "border-transparent bg-transparent opacity-40"
                }`}
              >
                {/* Icon badge */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <div className="size-6 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isCurrent ? (
                    <div className="size-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                      <svg
                        className="animate-spin size-3.5 text-emerald-600 dark:text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                      </svg>
                    </div>
                  ) : isFailed ? (
                    <div className="size-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="size-6 rounded-full border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-[10px] font-mono text-zinc-500">
                      {idx + 1}
                    </div>
                  )}
                </div>

                {/* Text info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-sm font-semibold ${
                        isCurrent
                          ? "text-white"
                          : isDone
                          ? "text-zinc-200"
                          : isFailed
                          ? "text-rose-300"
                          : "text-zinc-500"
                      }`}
                    >
                      {stage.label}
                    </h4>
                    {isCurrent && (
                      <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 animate-pulse">
                        Processing...
                      </span>
                    )}
                    {isDone && (
                      <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bot workspace created info card if bot ID is known */}
        {chatbotId && (
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-[18px] bg-emerald-600/[0.06] border border-emerald-500/25 text-xs">
            <div className="flex items-center gap-2.5 text-white">
              <span className="size-2 rounded-full bg-emerald-600 anim-live-pulse" />
              <span>Assistant initialized! Indexing runs autonomously in the background.</span>
            </div>
            <Link
              href={`/dashboard/chatbots/${chatbotId}`}
              className="btn-volt inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-[0_6px_20px_rgba(5, 150, 105, 0.3)] hover:bg-emerald-700 shrink-0"
            >
              Open Studio now &rarr;
            </Link>
          </div>
        )}

        {/* Footer action */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-500">
          <span>You can safely refresh or navigate away — indexing will complete automatically.</span>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="rounded-full text-zinc-400 hover:text-white"
            >
              Cancel and Return
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
