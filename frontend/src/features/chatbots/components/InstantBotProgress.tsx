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
    <div className="max-w-xl mx-auto rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 shadow-xl">
      {/* Header Info */}
      <div className="flex flex-col gap-1 pb-5 border-b border-zinc-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
            Stage 2 of 2 • Pipeline Processing
          </span>
          <span className="text-xs font-mono text-zinc-400 font-medium">
            {progressPercent}% Complete
          </span>
        </div>
        <h2 className="text-lg font-bold text-white mt-2">{chatbotName}</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
          <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <span className="font-mono text-zinc-300 truncate">{websiteUrl}</span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="py-4">
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0052CC] to-[#7D3CE9] transition-all duration-500 ease-out"
            style={{ width: `${Math.max(progressPercent, 10)}%` }}
          />
        </div>
      </div>

      {/* Multi-stage Checklist */}
      <div className="space-y-3 pt-2">
        {stages.map((stage, idx) => {
          const isDone = stage.status === "completed";
          const isCurrent = stage.status === "current";
          const isFailed = stage.status === "failed";

          return (
            <div
              key={stage.id}
              className={`flex items-start gap-3.5 p-3 rounded-lg border transition-all ${
                isCurrent
                  ? "border-violet-500/40 bg-violet-500/5 shadow-xs"
                  : isDone
                  ? "border-zinc-800/80 bg-zinc-950/40 opacity-90"
                  : isFailed
                  ? "border-rose-500/40 bg-rose-500/5"
                  : "border-transparent bg-transparent opacity-45"
              }`}
            >
              {/* Icon badge */}
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/50 flex items-center justify-center">
                    <svg
                      className="animate-spin w-3 h-3 text-violet-400"
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
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-zinc-700 bg-zinc-900/60 flex items-center justify-center text-[10px] font-mono text-zinc-500">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Text info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-white font-semibold"
                        : isDone
                        ? "text-zinc-200"
                        : isFailed
                        ? "text-rose-300"
                        : "text-zinc-400"
                    }`}
                  >
                    {stage.label}
                  </h4>
                  {isCurrent && (
                    <span className="text-[11px] font-medium text-violet-400 animate-pulse">
                      Processing...
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[11px] font-medium text-emerald-400">
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
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-violet-950/20 border border-violet-500/25 text-xs">
          <div className="flex items-center gap-2 text-violet-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            <span>Assistant created! Knowledge base is indexing in background.</span>
          </div>
          <Link
            href={`/dashboard/chatbots/${chatbotId}`}
            className="text-violet-400 hover:text-white font-medium underline flex items-center gap-1 shrink-0"
          >
            Open Playground now &rarr;
          </Link>
        </div>
      )}

      {/* Footer safe action */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>You can safely refresh or leave — your bot is created and indexing continues.</span>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-zinc-400 hover:text-white"
          >
            Cancel and Return
          </Button>
        )}
      </div>
    </div>
  );
}
