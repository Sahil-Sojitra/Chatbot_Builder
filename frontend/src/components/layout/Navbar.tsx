import Link from "next/link";

import { buttonVariants } from "@/components/ui";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#000000]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg className="h-5 w-5 text-white fill-current transition-transform group-hover:scale-105" viewBox="0 0 24 24">
              <path d="M12 2L1 21h22L12 2z" />
            </svg>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">Chatbot Studio</span>
              <span className="rounded-md border border-zinc-800 bg-[#0a0a0a] px-1.5 py-0.2 font-mono text-[10px] font-medium text-zinc-400">
                v1.0
              </span>
            </div>
          </Link>

          <nav aria-label="Marketing navigation" className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#architecture" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Architecture
            </Link>
            <Link href="#integrations" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Integrations
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              FAQ
            </Link>
          </nav>
        </div>

        <nav aria-label="Auth actions" className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-300 hover:text-white transition-colors px-2 py-1"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={buttonVariants({ variant: "default", size: "sm" }) + " text-sm font-medium"}
          >
            Deploy Free &rarr;
          </Link>
        </nav>
      </div>
    </header>
  );
}
