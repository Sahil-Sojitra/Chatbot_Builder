import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-[#000000] text-sm text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand info */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-white fill-current" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2z" />
              </svg>
              <span className="font-bold text-sm tracking-tight text-white">Chatbot Studio</span>
            </div>
            <p className="max-w-sm text-sm text-zinc-400 leading-relaxed">
              The developer deployment platform for context-grounded AI chatbots. Ingest documents, connect multi-provider LLMs, tune vector retrieval, and embed anywhere.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
              <span>All Deployment Systems Operational</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-xs tracking-wider uppercase text-zinc-200">Product</p>
            <Link href="#features" className="text-zinc-400 hover:text-white transition-colors">
              Platform Overview
            </Link>
            <Link href="#architecture" className="text-zinc-400 hover:text-white transition-colors">
              Vector RAG Engine
            </Link>
            <Link href="#integrations" className="text-zinc-400 hover:text-white transition-colors">
              Embed Widget
            </Link>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              Developer Console
            </Link>
          </div>

          {/* Column 2: Developers */}
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-xs tracking-wider uppercase text-zinc-200">Developers</p>
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
              REST API Reference
            </Link>
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
              React & Next.js SDK
            </Link>
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
              Backblaze B2 Uploads
            </Link>
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
              Self-Host / Private VPC
            </Link>
          </div>

          {/* Column 3: Platform */}
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-xs tracking-wider uppercase text-zinc-200">Platform</p>
            <Link href="#pricing" className="text-zinc-400 hover:text-white transition-colors">
              Pricing Plans
            </Link>
            <Link href="#faq" className="text-zinc-400 hover:text-white transition-colors">
              Security & Privacy
            </Link>
            <Link href="/register" className="text-zinc-400 hover:text-white transition-colors">
              Workspace Access
            </Link>
            <span className="text-xs font-mono text-zinc-500">v1.0.0-prod</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-8 sm:flex-row text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Chatbot Studio AI Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Security Overview
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
