"use client";

import { useState } from "react";

export function HeroProductMockup() {
  const [copiedCode, setCopiedCode] = useState(false);

  const snippet = `<script src="https://cdn.chatbotstudio.io/v1/widget.js" data-chatbot-id="bot_live_8f3a9" defer></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="relative w-full max-w-6xl xl:max-w-7xl mx-auto mt-10 sm:mt-14 hero-3d-window">
      {/* Ambient Radial Spotlight Behind Mockup */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[850px] h-[360px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent rounded-full blur-3xl pointer-events-none anim-pulse-glow -z-10" />

      {/* Main SaaS Window Frame */}
      <div className="hero-3d-card relative rounded-2xl sm:rounded-3xl border border-zinc-200/90 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-[#0B1510] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* macOS Style Window Titlebar */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 bg-zinc-50/95 dark:border-white/[0.08] dark:bg-[#070D0A]/95 px-4 sm:px-5 py-3">
          {/* Left: Traffic Lights & Context */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 inline-block" />
              <span className="size-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 inline-block" />
              <span className="size-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 inline-block" />
            </div>

            <div className="h-4 w-px bg-zinc-200 dark:bg-white/10 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="text-zinc-400 dark:text-zinc-500">assistant:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">ops-v1</span>
            </div>
          </div>

          {/* Center: Deployment URL bar */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white/90 dark:border-white/10 dark:bg-white/[0.04] px-3 py-1 text-xs font-mono text-zinc-600 dark:text-zinc-300 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-zinc-400 dark:text-zinc-500">https://</span>
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">studio.chatbotstudio.io</span>
            <span className="text-zinc-400 dark:text-zinc-500">/assistants/ops-v1</span>
          </div>

          {/* Right: Runtime Telemetry Badges */}
          <div className="flex items-center gap-2">
            {/* Latency Telemetry */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs">
              <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 anim-live-pulse" />
              <span>38ms p95</span>
            </div>

            {/* SSRF Guardrail Telemetry */}
            <div className="hidden sm:inline-flex items-center gap-1 rounded-full border border-zinc-200/90 bg-white dark:border-white/10 dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300 shadow-2xs">
              <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Zero-SSRF</span>
            </div>

            {/* Status Pill */}
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">
              Live
            </span>
          </div>
        </div>

        {/* 2-Column SaaS Studio Interface */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
          {/* Column 1: Document Pipeline (4 cols) */}
          <div className="hidden md:flex md:col-span-4 flex-col border-r border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#070D0A]/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-mono text-[11px]">
                  Knowledge Base
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/80 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                3 Sources
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Source 1: PDF */}
              <div className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs dark:border-white/[0.08] dark:bg-[#0E1B15] transition-all hover:border-emerald-500/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 truncate font-mono">
                      api-spec-v2.pdf
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    0.94
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  <span>84 chunks</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Vector Indexed</span>
                </div>
              </div>

              {/* Source 2: Web Crawler */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/40 p-3 shadow-2xs dark:border-emerald-500/30 dark:bg-emerald-950/20 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 truncate font-mono">
                      https://punchd.cards
                    </span>
                  </div>
                  <span className="size-2 rounded-full bg-emerald-600 anim-live-pulse" />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-800/80 dark:text-emerald-400/80 font-mono">
                  <span>Auto-crawled</span>
                  <span className="font-semibold">Synced</span>
                </div>
              </div>

              {/* Source 3: Markdown */}
              <div className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs dark:border-white/[0.08] dark:bg-[#0E1B15] transition-all hover:border-emerald-500/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-white/10">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 truncate font-mono">
                      faqs-and-refunds.md
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    26 chunks
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  <span>Markdown Guide</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Ready</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span>Backblaze B2 Storage</span>
              </div>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Active</span>
            </div>
          </div>

          {/* Column 2: Live Conversation Stream (8 cols) */}
          <div className="col-span-12 md:col-span-8 flex flex-col justify-between p-4 sm:p-5">
            {/* Assistant Sub-Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-white/[0.06] text-xs">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-600 anim-live-pulse" />
                <span className="font-semibold text-zinc-900 dark:text-white">Customer Ops Assistant</span>
                <span className="text-zinc-300 dark:text-white/20">•</span>
                <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">gemini-2.5-flash</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                min_score ≥ 0.82
              </span>
            </div>

            {/* Conversation Flow */}
            <div className="space-y-4">
              {/* User Bubble */}
              <div className="flex justify-end">
                <div className="max-w-md rounded-2xl rounded-tr-xs bg-emerald-600 text-white px-4 py-3 text-xs sm:text-sm font-medium shadow-xs leading-relaxed">
                  How do our website visitors integrate the AI widget with React or plain HTML?
                </div>
              </div>

              {/* Bot Response with Grounded Citation Pill */}
              <div className="flex items-start gap-3">
                {/* Bot Avatar */}
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-xs mt-1">
                  ⚡
                </div>

                <div className="flex-1 max-w-xl rounded-2xl rounded-tl-xs border border-zinc-200/90 bg-zinc-50/80 dark:border-white/[0.08] dark:bg-[#070D0A] p-4 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 shadow-xs space-y-3">
                  {/* Grounded Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] pb-1 border-b border-zinc-200/60 dark:border-white/10">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                      <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Grounded: api-spec-v2.pdf (Score: 0.94)
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500">latency: 38ms</span>
                  </div>

                  <p className="leading-relaxed">
                    Add one script tag before the closing <code className="px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-white/10 font-mono text-xs text-zinc-900 dark:text-zinc-100">&lt;/body&gt;</code> tag:
                  </p>

                  {/* Code Snippet Box with Copy Button */}
                  <div className="relative group rounded-xl bg-zinc-900 text-zinc-100 p-3 font-mono text-[11px] sm:text-xs overflow-x-auto border border-zinc-800">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[10px] text-zinc-400">
                      <span className="uppercase tracking-wider font-semibold">HTML Embed</span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        title="Copy embed snippet"
                      >
                        {copiedCode ? (
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        ) : (
                          <>
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code className="text-emerald-300 break-all select-all">
                      {snippet}
                    </code>
                  </div>

                  <p className="leading-relaxed text-zinc-600 dark:text-zinc-400 text-xs">
                    The client initializes inside an isolated Shadow DOM container with zero host style bleeding and sub-50ms streaming response times.
                  </p>
                </div>
              </div>
            </div>

            {/* Input Bar inside Mockup */}
            <div className="mt-4 flex items-center gap-2 pt-3 border-t border-zinc-200/70 dark:border-white/[0.08]">
              <div className="flex-1 h-10 rounded-full border border-zinc-200 bg-white px-4 flex items-center text-xs text-zinc-400 dark:border-white/10 dark:bg-[#070D0A]">
                Ask another grounded query or test similarity threshold…
              </div>
              <button
                type="button"
                className="h-10 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 justify-center shrink-0 transition-all cursor-default"
              >
                <span>Send</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
