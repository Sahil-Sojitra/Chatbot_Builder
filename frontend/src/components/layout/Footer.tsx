import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white text-sm text-zinc-600 dark:border-white/[0.08] dark:bg-[#0B0B0F] dark:text-[#9A9AA4] transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 lg:gap-14">
          {/* Brand info */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-[0_2px_10px_rgba(5, 150, 105, 0.4)]">
                ⚡
              </div>
              <span className="font-display font-bold text-base tracking-tight text-zinc-900 dark:text-white">Chatbot Studio</span>
            </div>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-[#9A9AA4] leading-relaxed">
              The developer deployment platform for context-grounded AI chatbots. Ingest documents, connect multi-provider LLMs, tune vector retrieval, and embed anywhere.
            </p>
            <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-700 dark:text-white/70">
              <span className="size-2 rounded-full bg-emerald-600 anim-live-pulse ring-4 ring-emerald-500/25" />
              <span>All Deployment Systems Operational</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="flex flex-col gap-3">
            <p className="font-display font-bold text-xs tracking-wider uppercase text-zinc-900 dark:text-white">Product</p>
            <Link href="#features" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Platform Overview
            </Link>
            <Link href="#architecture" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Vector RAG Engine
            </Link>
            <Link href="#integrations" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Embed Widget
            </Link>
            <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Developer Console
            </Link>
          </div>

          {/* Column 2: Developers */}
          <div className="flex flex-col gap-3">
            <p className="font-display font-bold text-xs tracking-wider uppercase text-zinc-900 dark:text-white">Developers</p>
            <Link href="/login" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              REST API Reference
            </Link>
            <Link href="/login" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              React &amp; Next.js SDK
            </Link>
            <Link href="/login" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Backblaze B2 Uploads
            </Link>
            <Link href="/login" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Self-Host / Private VPC
            </Link>
          </div>

          {/* Column 3: Platform */}
          <div className="flex flex-col gap-3">
            <p className="font-display font-bold text-xs tracking-wider uppercase text-zinc-900 dark:text-white">Platform</p>
            <Link href="#pricing" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Pricing Plans
            </Link>
            <Link href="#faq" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Technical FAQ
            </Link>
            <Link href="/login" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Privacy &amp; Encryption
            </Link>
            <Link href="/login" className="text-zinc-600 hover:text-zinc-950 dark:text-[#9A9AA4] dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200 dark:border-white/[0.08] pt-8 text-xs text-zinc-500 dark:text-white/50">
          <p>© {new Date().getFullYear()} Chatbot Studio. All rights reserved.</p>
          <div className="mt-4 sm:mt-0 flex items-center gap-4">
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Zero-Leakage Multi-Tenancy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
