"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { HeroDemo } from "@/features/marketing/components/HeroDemo";
import { HeroProductMockup } from "@/features/marketing/components/HeroProductMockup";
import { CodeShowcase } from "@/features/marketing/components/CodeShowcase";
import { FaqAccordion } from "@/features/marketing/components/FaqAccordion";
import { TechMarquee } from "@/features/marketing/components/TechMarquee";

export default function Home() {
  const [copiedNpm, setCopiedNpm] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annually">("monthly");

  const handleCopyNpm = async () => {
    try {
      await navigator.clipboard.writeText("npm i @chatbot-studio/widget");
      setCopiedNpm(true);
      setTimeout(() => setCopiedNpm(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-background text-foreground transition-colors overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section
        aria-labelledby="hero-heading"
        className="relative w-full flex flex-col items-center px-4 pt-14 pb-14 sm:px-6 lg:px-8 sm:pt-20 sm:pb-20 text-center overflow-hidden"
      >
        {/* Dynamic Multi-Stop Floating Ambient Aura Spotlights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-emerald-500/12 via-teal-400/8 to-emerald-300/4 rounded-full blur-3xl pointer-events-none anim-pulse-glow -z-10" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none anim-float-slow -z-10" />
        <div className="absolute top-1/3 right-1/4 w-88 h-88 bg-teal-400/8 rounded-full blur-3xl pointer-events-none anim-float-reverse -z-10" />

        {/* Faint Grid Overlay confined to Hero with radial mask */}
        <div className="absolute inset-0 architect-grid pointer-events-none [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)] -z-10" />

        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
          {/* Release Pill with Live Beacon */}
          <div className="anim-fade-up anim-delay-100 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300 shadow-xs backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 anim-live-pulse ring-2 ring-emerald-500/30" />
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">v1.0 Production Platform</span>
            <span className="text-zinc-300 dark:text-white/20">•</span>
            <span className="text-zinc-600 dark:text-zinc-400">Direct B2 Storage &amp; Vector RAG Live</span>
          </div>

          {/* Hero Title */}
          <h1
            id="hero-heading"
            className="anim-fade-up anim-delay-200 font-display mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.12]"
          >
            Deploy Context-Aware <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
              AI Chatbots at the Edge
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="anim-fade-up anim-delay-300 mt-5 max-w-2xl text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
            Ground conversational assistants in your proprietary documentation. Connect Google Gemini, OpenAI, or Claude, tune similarity thresholds, and drop a zero-dependency widget onto your site in seconds.
          </p>

          {/* CTA Group with Button Shimmer Effect */}
          <div className="anim-fade-up anim-delay-400 mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/register"
              className="btn-shimmer-sweep w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Start Free &rarr;</span>
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/[0.08] transition-all text-sm font-medium shadow-xs"
            >
              Try Interactive Simulator
            </a>
          </div>

          {/* Copyable Terminal Quick Command */}
          <button
            type="button"
            onClick={handleCopyNpm}
            className="anim-fade-up anim-delay-500 mt-6 flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/90 hover:border-emerald-500/50 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-500/40 px-3.5 py-1.5 font-mono text-xs text-zinc-600 dark:text-zinc-400 shadow-xs backdrop-blur-sm transition-all cursor-pointer group"
            title="Click to copy package command"
          >
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">$</span>
            <span className="text-zinc-900 dark:text-zinc-200 font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              npm i @chatbot-studio/widget
            </span>
            <span className="text-zinc-300 dark:text-white/20">•</span>
            {copiedNpm ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500">v1.0.0</span>
            )}
          </button>

          {/* Live Edge Telemetry Micro-Pills */}
          <div className="anim-fade-up anim-delay-500 mt-7 flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 shadow-2xs">
              <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 anim-live-pulse" />
              <span>42ms edge routing</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 shadow-2xs">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Zero-SSRF verified</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 shadow-2xs">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>&lt; 18 KB bundle</span>
            </div>
          </div>
        </div>

        {/* HERO PRODUCT PREVIEW CANVAS (SIGNATURE SAAS SHOWCASE) */}
        <div className="anim-fade-up anim-delay-600 w-full">
          <HeroProductMockup />
        </div>
      </section>

      {/* 2. ENTERPRISE INTEGRATIONS MARQUEE */}
      <TechMarquee />

      {/* 3. INTERACTIVE RUNTIME SIMULATOR */}
      <section
        id="demo"
        className="w-full flex flex-col items-center px-4 py-16 sm:py-20 sm:px-6 lg:px-8 border-b border-zinc-200/80 bg-zinc-50/60 dark:border-white/[0.08] dark:bg-[#0A100D]/60"
      >
        <div className="flex flex-col items-center text-center mb-10 max-w-2xl">
          <Badge variant="lime" className="text-xs font-mono uppercase mb-2.5">
            Runtime Console
          </Badge>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Interactive AI &amp; RAG Simulator
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
            Toggle vector context and switch LLM backends to observe verified source citations, similarity scoring, and response latency.
          </p>
        </div>

        <HeroDemo />
      </section>

      {/* 4. PLATFORM TELEMETRY METRICS STRIP */}
      <section className="w-full border-b border-zinc-200/80 bg-white/90 dark:border-white/[0.08] dark:bg-[#0E1B15]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="flex flex-col border-l-2 border-emerald-500/50 pl-4 sm:pl-5 group hover:border-emerald-500 transition-colors">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">&lt; 120ms</span>
              <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                p95 Edge Latency
              </span>
            </div>
            <div className="flex flex-col border-l-2 border-zinc-200 dark:border-white/10 pl-4 sm:pl-5 group hover:border-emerald-500/50 transition-colors">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">&gt; 0.88</span>
              <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                Cosine Precision
              </span>
            </div>
            <div className="flex flex-col border-l-2 border-zinc-200 dark:border-white/10 pl-4 sm:pl-5 group hover:border-emerald-500/50 transition-colors">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">&lt; 18 KB</span>
              <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                Bundle Size
              </span>
            </div>
            <div className="flex flex-col border-l-2 border-zinc-200 dark:border-white/10 pl-4 sm:pl-5 group hover:border-emerald-500/50 transition-colors">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">100%</span>
              <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                Direct Cloud Storage
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WORKFLOW / ARCHITECTURE SECTION */}
      <section
        id="architecture"
        className="w-full flex flex-col items-center px-4 py-16 sm:py-24 sm:px-6 lg:px-8 max-w-7xl"
      >
        <div className="flex flex-col items-center text-center mb-12 sm:mb-14 max-w-2xl">
          <Badge variant="lime" className="text-xs font-mono uppercase mb-2.5">
            Engineering Workflow
          </Badge>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Three Steps from Knowledge to Production
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
            A developer-first pipeline designed to eliminate manual RAG plumbing and complex frontend widget development.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 w-full">
          {/* Step 1 */}
          <div className="card-studio flex flex-col justify-between p-6 rounded-2xl group hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-200">
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Step 01 / Ingestion
              </span>
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Direct Cloud Storage Uploads
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Upload PDFs, Word docs, Markdown, CSVs, or enter URLs. Files upload directly from client to Backblaze B2 or AWS S3 via signed PUT URLs, bypassing server memory bottlenecks.
              </p>
            </div>
            <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50 dark:border-white/10 dark:bg-[#070D0A] p-3.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-1 font-semibold text-[10px]">
                <span>SUPPORTED SOURCES</span>
                <span>STATUS</span>
              </div>
              <div className="text-zinc-900 dark:text-white font-medium text-xs">PDF, DOCX, TXT, CSV, MD, URL</div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card-studio flex flex-col justify-between p-6 rounded-2xl group hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-200">
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Step 02 / Optimization
              </span>
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Vector Slicing &amp; LLM Tuning
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Tune retrieval parameters: configure top-k chunks, cosine similarity thresholds, system instructions, and temperature. Seamlessly route requests across Gemini, OpenAI, or Claude.
              </p>
            </div>
            <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50 dark:border-white/10 dark:bg-[#070D0A] p-3.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-1 font-semibold text-[10px]">
                <span>TUNABLE PARAMETERS</span>
                <span>RANGE</span>
              </div>
              <div className="text-zinc-900 dark:text-white font-medium text-xs">top_k: 1-20 • threshold: 0.0-1.0</div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="card-studio flex flex-col justify-between p-6 rounded-2xl group hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-200">
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Step 03 / Deployment
              </span>
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                1-Line Client Embedding
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Add a single script tag to any website. The widget mounts inside an isolated Shadow DOM container with zero external CSS conflicts and responsive drawer transitions.
              </p>
            </div>
            <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50 dark:border-white/10 dark:bg-[#070D0A] p-3.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-1 font-semibold text-[10px]">
                <span>INTEGRATION</span>
                <span>RUNTIME</span>
              </div>
              <div className="text-zinc-900 dark:text-white font-medium text-xs">&lt;script defer data-public-id="..."&gt;</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CODE SHOWCASE SECTION */}
      <section
        id="integrations"
        className="w-full flex flex-col items-center px-4 py-16 sm:py-20 sm:px-6 lg:px-8 border-t border-zinc-200/80 bg-zinc-50/70 dark:border-white/[0.08] dark:bg-[#0A100D]/70"
      >
        <div className="flex flex-col items-center text-center mb-10 max-w-2xl">
          <Badge variant="lime" className="text-xs font-mono uppercase mb-2.5">
            Integration Code
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Embed Anywhere with Zero Framework Lock-In
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
            Whether you&apos;re running vanilla HTML, Next.js, a REST client, or a Python script, integration takes under two minutes.
          </p>
        </div>

        <CodeShowcase />
      </section>

      {/* 7. PRICING SECTION WITH MONTHLY / ANNUAL TOGGLE */}
      <section
        id="pricing"
        className="w-full flex flex-col items-center px-4 py-16 sm:py-20 sm:px-6 lg:px-8 max-w-7xl border-t border-zinc-200/80 dark:border-white/[0.08]"
      >
        <div className="flex flex-col items-center text-center mb-10 max-w-2xl">
          <Badge variant="lime" className="text-xs font-mono uppercase mb-2.5">
            Simple Pricing
          </Badge>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Predictable, Transparent Tiers
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
            No surprise overage fees. Scale from proof-of-concept to millions of visitor interactions seamlessly.
          </p>

          {/* Monthly / Annual Billing Toggle */}
          <div className="mt-6 flex items-center p-1 rounded-full border border-zinc-200/90 bg-white/90 dark:border-white/10 dark:bg-white/[0.04] shadow-xs">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                billingInterval === "monthly"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annually")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                billingInterval === "annually"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-stretch">
          {/* Plan 1: Developer */}
          <div className="card-studio flex flex-col justify-between p-6 sm:p-7 rounded-2xl group hover:border-zinc-300 dark:hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-lg text-zinc-900 dark:text-white">Developer</span>
                <Badge variant="outline">Free</Badge>
              </div>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                For developers building personal or prototype assistants.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold text-zinc-900 dark:text-white">$0</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">/ month</span>
              </div>

              <ul className="mt-6 flex flex-col gap-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> 1 Active Chatbot Deployment
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> 50 MB Knowledge Storage
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> 1,000 Queries / Month
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Vector RAG &amp; Cosine Tuning
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Community Support
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.08] text-xs sm:text-sm font-medium transition-all"
              >
                Deploy Free &rarr;
              </Link>
            </div>
          </div>

          {/* Plan 2: Pro (Featured Tier) */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-emerald-600 dark:border-emerald-500 bg-white dark:bg-[#0E1B15] p-6 sm:p-7 shadow-md dark:shadow-[0_16px_36px_rgba(0,0,0,0.5)] ring-1 ring-emerald-500/20 group hover:shadow-lg transition-all">
            <div className="absolute -top-3 right-6 rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-xs uppercase tracking-wider">
              Most Popular
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-lg text-zinc-900 dark:text-white">Pro Team</span>
                <Badge variant="lime">Recommended</Badge>
              </div>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                For growing businesses and production customer support.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                  {billingInterval === "monthly" ? "$29" : "$23"}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">/ month</span>
              </div>

              <ul className="mt-6 flex flex-col gap-2.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-200">
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> 10 Active Chatbot Deployments
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> 2 GB Knowledge Storage (B2/S3)
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> 50,000 Queries / Month
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Custom Branding &amp; Whitelabel
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Unlimited Workspace Members
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Priority Support
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/register"
                className="btn-shimmer-sweep w-full inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                Upgrade to Pro &rarr;
              </Link>
            </div>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="card-studio flex flex-col justify-between p-6 sm:p-7 rounded-2xl group hover:border-zinc-300 dark:hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-lg text-zinc-900 dark:text-white">Enterprise</span>
                <Badge variant="outline">Custom</Badge>
              </div>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                For high-volume operations requiring dedicated VPCs and SLAs.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold text-zinc-900 dark:text-white">Custom</span>
              </div>

              <ul className="mt-6 flex flex-col gap-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Unlimited Deployments
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Dedicated Vector Namespace
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Bring-Your-Own API Keys (BYOK)
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> 99.99% Uptime SLA
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Dedicated Slack Support
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.08] text-xs sm:text-sm font-medium transition-all"
              >
                Contact Enterprise &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section
        id="faq"
        className="w-full flex flex-col items-center px-4 py-16 sm:py-20 sm:px-6 lg:px-8 max-w-7xl border-t border-zinc-200/80 dark:border-white/[0.08]"
      >
        <div className="flex flex-col items-center text-center mb-10 max-w-2xl">
          <Badge variant="lime" className="text-xs font-mono uppercase mb-2.5">
            Engineering FAQ
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
            Technical answers on data privacy, RAG retrieval thresholds, presigned uploads, and widget integration.
          </p>
        </div>

        <FaqAccordion />
      </section>

      {/* 9. BOTTOM FINAL CTA BANNER */}
      <section className="w-full border-t border-zinc-200/80 bg-zinc-50/50 dark:border-white/[0.08] dark:bg-[#070D0A] py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl xl:max-w-6xl rounded-2xl border border-zinc-200/90 bg-white dark:border-white/10 dark:bg-gradient-to-b dark:from-[#0E1B15] dark:to-[#070D0A] p-8 sm:p-12 text-center flex flex-col items-center shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          {/* Ambient light orb */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 size-64 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-5">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 anim-live-pulse ring-2 ring-emerald-500/30" />
            <span>Ready for Production</span>
          </div>

          <h2 className="relative z-10 font-display text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white max-w-xl leading-tight">
            Start Building Production AI Chatbots Today
          </h2>

          <p className="relative z-10 mt-3.5 max-w-md text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Deploy your first assistant in under 60 seconds. Ingest documents, tune similarity thresholds, and paste one line of HTML.
          </p>

          <div className="relative z-10 mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/register"
              className="btn-shimmer-sweep inline-flex items-center justify-center gap-2 h-11 px-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started Free &rarr;
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/[0.08] transition-all text-sm font-medium shadow-xs"
            >
              Sign In to Console
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
