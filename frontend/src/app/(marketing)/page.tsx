import Link from "next/link";
import { Badge, Card, CardContent, buttonVariants } from "@/components/ui";
import { HeroDemo } from "@/features/marketing/components/HeroDemo";
import { CodeShowcase } from "@/features/marketing/components/CodeShowcase";
import { FaqAccordion } from "@/features/marketing/components/FaqAccordion";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full architect-grid overflow-hidden">
      {/* 1. HERO SECTION */}
      <section
        aria-labelledby="hero-heading"
        className="relative flex flex-col items-center px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 text-center max-w-5xl"
      >
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-1 text-xs font-medium text-zinc-300 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="font-semibold text-white">v1.0 Production Platform</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">Direct B2 Storage & Vector RAG is Live</span>
        </div>

        {/* Hero Title */}
        <h1
          id="hero-heading"
          className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]"
        >
          Deploy Context-Aware <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            AI Chatbots at the Edge
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
          Ground assistants in your company&apos;s private documentation. Configure OpenAI, Anthropic, or Gemini LLMs, tune vector retrieval thresholds, and embed a high-speed client widget in 60 seconds.
        </p>

        {/* CTA Group */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/register"
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "w-full sm:w-auto text-sm font-medium h-10 px-6",
            })}
          >
            Start Deploying Free &rarr;
          </Link>
          <a
            href="#demo"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto text-sm font-medium h-10 px-6",
            })}
          >
            Try Interactive Simulator
          </a>
        </div>

        {/* Terminal Quick Command */}
        <div className="mt-6 flex items-center gap-2 rounded-md border border-zinc-800 bg-[#0a0a0a] px-3.5 py-1.5 font-mono text-xs text-zinc-400">
          <span className="text-emerald-400">$</span>
          <span className="text-zinc-300">npm i @chatbot-studio/widget</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-500">v1.0.0</span>
        </div>
      </section>

      {/* 2. INTERACTIVE DEMO & RUNTIME BENCHMARK SECTION */}
      <section
        id="demo"
        className="w-full flex flex-col items-center px-4 py-12 border-t border-zinc-800/80 bg-[#000000]/60"
      >
        <div className="flex flex-col items-center text-center mb-8 max-w-2xl">
          <Badge variant="default" className="text-xs font-mono uppercase mb-2">
            Runtime Console
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Interactive AI & RAG Simulator
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Toggle vector context and switch LLM backends to observe verified source citations, similarity scoring, and response latency.
          </p>
        </div>

        <HeroDemo />
      </section>

      {/* 3. PLATFORM TELEMETRY METRICS STRIP */}
      <section className="w-full border-y border-zinc-800 bg-[#0a0a0a]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="flex flex-col border-l border-zinc-800 pl-4">
              <span className="font-mono text-3xl font-bold text-white">&lt; 120ms</span>
              <span className="mt-1 text-xs text-zinc-400 uppercase tracking-wider font-medium">
                p95 Edge Routing Latency
              </span>
            </div>
            <div className="flex flex-col border-l border-zinc-800 pl-4">
              <span className="font-mono text-3xl font-bold text-white">&gt; 0.88</span>
              <span className="mt-1 text-xs text-zinc-400 uppercase tracking-wider font-medium">
                Cosine Similarity Precision
              </span>
            </div>
            <div className="flex flex-col border-l border-zinc-800 pl-4">
              <span className="font-mono text-3xl font-bold text-white">&lt; 18 KB</span>
              <span className="mt-1 text-xs text-zinc-400 uppercase tracking-wider font-medium">
                Embed Client Bundle Size
              </span>
            </div>
            <div className="flex flex-col border-l border-zinc-800 pl-4">
              <span className="font-mono text-3xl font-bold text-white">100%</span>
              <span className="mt-1 text-xs text-zinc-400 uppercase tracking-wider font-medium">
                Direct Presigned Cloud Storage
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WORKFLOW / ARCHITECTURE SECTION */}
      <section
        id="architecture"
        className="w-full flex flex-col items-center px-4 py-20 sm:px-6 max-w-6xl"
      >
        <div className="flex flex-col items-center text-center mb-14 max-w-2xl">
          <Badge variant="default" className="text-xs font-mono uppercase mb-2">
            Engineering Workflow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Three Steps from Knowledge to Production
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            A developer-first pipeline designed to eliminate manual RAG plumbing and complex frontend widget development.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Step 1 */}
          <Card className="flex flex-col justify-between border-zinc-800 bg-[#0a0a0a] p-6 hover:border-zinc-700 transition-colors">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs font-semibold text-emerald-400 uppercase">
                Step 01 / Ingestion
              </span>
              <h3 className="text-lg font-bold text-white">
                Direct Presigned Storage Uploads
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Upload PDFs, Word docs, Markdown, CSVs, or enter URLs. Files upload directly from client to Backblaze B2 or AWS S3 via signed PUT URLs, bypassing server memory bottlenecks.
              </p>
            </div>
            <div className="mt-6 rounded-md border border-zinc-800 bg-[#000000] p-3 font-mono text-xs text-zinc-400">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span>SUPPORTED SOURCES</span>
                <span>STATUS</span>
              </div>
              <div className="text-zinc-300">PDF, DOCX, TXT, CSV, MD, URL</div>
            </div>
          </Card>

          {/* Step 2 */}
          <Card className="flex flex-col justify-between border-zinc-800 bg-[#0a0a0a] p-6 hover:border-zinc-700 transition-colors">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs font-semibold text-emerald-400 uppercase">
                Step 02 / Optimization
              </span>
              <h3 className="text-lg font-bold text-white">
                Vector Slicing & LLM Tuning
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Tune retrieval parameters: configure top-k chunks, cosine similarity thresholds, system instructions, and temperature. Seamlessly route requests across OpenAI, Anthropic, or Gemini.
              </p>
            </div>
            <div className="mt-6 rounded-md border border-zinc-800 bg-[#000000] p-3 font-mono text-xs text-zinc-400">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span>TUNABLE PARAMETERS</span>
                <span>RANGE</span>
              </div>
              <div className="text-zinc-300">top_k: 1-100 • threshold: 0.0-1.0</div>
            </div>
          </Card>

          {/* Step 3 */}
          <Card className="flex flex-col justify-between border-zinc-800 bg-[#0a0a0a] p-6 hover:border-zinc-700 transition-colors">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs font-semibold text-emerald-400 uppercase">
                Step 03 / Deployment
              </span>
              <h3 className="text-lg font-bold text-white">
                1-Line Client Embedding
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Add a single script tag or import our React component. The widget mounts inside an isolated Shadow DOM container, preventing any host CSS conflicts or layout shifts.
              </p>
            </div>
            <div className="mt-6 rounded-md border border-zinc-800 bg-[#000000] p-3 font-mono text-xs text-zinc-400">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span>INTEGRATION</span>
                <span>RUNTIME</span>
              </div>
              <div className="text-zinc-300">&lt;script defer data-public-id="..."&gt;</div>
            </div>
          </Card>
        </div>
      </section>

      {/* 5. CODE SHOWCASE SECTION */}
      <section
        id="integrations"
        className="w-full flex flex-col items-center px-4 py-16 border-t border-zinc-800/80 bg-[#000000]"
      >
        <div className="flex flex-col items-center text-center mb-10 max-w-2xl">
          <Badge variant="default" className="text-xs font-mono uppercase mb-2">
            Integration Code
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Embed Anywhere with Zero Framework Lock-In
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Whether you&apos;re running vanilla HTML, Next.js, a REST client, or a Python script, integration takes under two minutes.
          </p>
        </div>

        <CodeShowcase />
      </section>

      {/* 6. DEEP PLATFORM FEATURES GRID */}
      <section
        id="features"
        className="w-full flex flex-col items-center px-4 py-20 sm:px-6 max-w-6xl border-t border-zinc-800/80"
      >
        <div className="flex flex-col items-center text-center mb-14 max-w-2xl">
          <Badge variant="default" className="text-xs font-mono uppercase mb-2">
            Core Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Engineered for Production Resilience
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Every layer of the stack is built for high availability, enterprise data isolation, and low latency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {/* Feature 1 */}
          <div className="flex flex-col gap-2.5 rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">Semantic Vector Chunking</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Documents are processed with semantic sentence splitters and sliding token overlap to preserve contextual continuity.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col gap-2.5 rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">Multi-Tenant RBAC Workspaces</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Collaborate securely with team members. Assign granular Owner, Admin, and Member permissions per organization.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col gap-2.5 rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">Direct-to-Storage Presigned Uploads</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Upload large knowledge assets directly to Backblaze B2 / AWS S3 buckets without loading server memory or triggering request timeouts.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="flex flex-col gap-2.5 rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">Shadow DOM CSS Isolation</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The embed widget renders within an encapsulated browser shadow root, guaranteeing your site&apos;s CSS styles will never bleed or conflict.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="flex flex-col gap-2.5 rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">Multi-Model LLM Routing</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Switch seamlessly between OpenAI, Anthropic Claude, and Google Gemini with automatic parameter normalization.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="flex flex-col gap-2.5 rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">Audit Trails & Telemetry</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Track token consumption, chunk similarity hit rates, and query latency across every deployment in real time.
            </p>
          </div>
        </div>
      </section>

      {/* 7. PRICING SECTION */}
      <section
        id="pricing"
        className="w-full flex flex-col items-center px-4 py-20 sm:px-6 max-w-6xl border-t border-zinc-800/80 bg-[#000000]"
      >
        <div className="flex flex-col items-center text-center mb-14 max-w-2xl">
          <Badge variant="default" className="text-xs font-mono uppercase mb-2">
            Pricing Plans
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Transparent Developer Pricing
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Start on the free hobby tier, then scale your assistant deployments as traffic and knowledge base size grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Plan 1: Hobby */}
          <Card className="flex flex-col justify-between border-zinc-800 bg-[#0a0a0a] p-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-white">Developer</span>
                <Badge variant="default">Free</Badge>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                For developers building personal or prototype assistants.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold text-white">$0</span>
                <span className="text-xs text-zinc-500 font-mono">/ month</span>
              </div>

              <ul className="mt-6 flex flex-col gap-2.5 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 1 Active Chatbot Deployment
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 50 MB Knowledge Storage
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 1,000 Queries / Month
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Vector RAG & Cosine Tuning
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Community Support
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/register"
                className={buttonVariants({
                  variant: "secondary",
                  className: "w-full text-sm font-medium",
                })}
              >
                Deploy Free &rarr;
              </Link>
            </div>
          </Card>

          {/* Plan 2: Pro (Featured) */}
          <Card className="relative flex flex-col justify-between border-white/40 bg-[#0f0f14] p-6 shadow-xl">
            <div className="absolute -top-3 right-6 rounded-md bg-white px-2.5 py-0.5 text-xs font-semibold text-black uppercase tracking-wider">
              Most Popular
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-white">Pro Team</span>
                <Badge variant="success">Recommended</Badge>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                For growing businesses and production customer support.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold text-white">$29</span>
                <span className="text-xs text-zinc-500 font-mono">/ month</span>
              </div>

              <ul className="mt-6 flex flex-col gap-2.5 text-sm text-zinc-200">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 10 Active Chatbot Deployments
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 2 GB Knowledge Storage (B2/S3)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 50,000 Queries / Month
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Custom Domain & CSS Widget Whitelist
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Unlimited Workspace Team Members
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Priority Email Support
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/register"
                className={buttonVariants({
                  variant: "default",
                  className: "w-full text-sm font-semibold",
                })}
              >
                Upgrade to Pro &rarr;
              </Link>
            </div>
          </Card>

          {/* Plan 3: Enterprise */}
          <Card className="flex flex-col justify-between border-zinc-800 bg-[#0a0a0a] p-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-white">Enterprise</span>
                <Badge variant="default">Custom</Badge>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                For high-volume operations requiring dedicated VPCs and SLAs.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold text-white">Custom</span>
              </div>

              <ul className="mt-6 flex flex-col gap-2.5 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Unlimited Chatbot Deployments
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Dedicated Vector VPC / On-Premise
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Bring-Your-Own API Keys & Buckets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 99.99% Uptime SLA Guarantee
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Dedicated Slack Channel Support
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/register"
                className={buttonVariants({
                  variant: "secondary",
                  className: "w-full text-sm font-medium",
                })}
              >
                Contact Enterprise &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section
        id="faq"
        className="w-full flex flex-col items-center px-4 py-20 sm:px-6 max-w-6xl border-t border-zinc-800/80"
      >
        <div className="flex flex-col items-center text-center mb-12 max-w-2xl">
          <Badge variant="default" className="text-xs font-mono uppercase mb-2">
            Engineering FAQ
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Technical answers on data privacy, RAG retrieval thresholds, presigned uploads, and widget integration.
          </p>
        </div>

        <FaqAccordion />
      </section>

      {/* 9. BOTTOM FINAL CTA BANNER */}
      <section className="w-full border-t border-zinc-800 bg-[#000000] py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-md border border-zinc-800 bg-[#0a0a0a] p-8 sm:p-12 text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-[#000000] px-3 py-1 text-xs font-medium text-zinc-300 mb-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Ready for Production</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-xl">
            Start Building Production AI Chatbots Today
          </h2>

          <p className="mt-4 max-w-lg text-sm sm:text-base text-zinc-400 leading-relaxed">
            Deploy your first assistant in under 60 seconds. Ingest documents, tune similarity thresholds, and paste one line of HTML.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/register"
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className: "text-sm font-semibold h-10 px-8",
              })}
            >
              Get Started Free &rarr;
            </Link>
            <Link
              href="/login"
              className={buttonVariants({
                variant: "secondary",
                size: "lg",
                className: "text-sm font-medium h-10 px-6",
              })}
            >
              Sign In to Console
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
