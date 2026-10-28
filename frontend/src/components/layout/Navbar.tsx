import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#070D0A]/85 transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
              ⚡
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm tracking-tight text-zinc-900 dark:text-white">
                Chatbot Studio
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 anim-live-pulse" />
                v1.0
              </span>
            </div>
          </Link>

          <nav aria-label="Marketing navigation" className="hidden md:flex items-center gap-5">
            <Link href="#features" className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#demo" className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Simulator
            </Link>
            <Link href="#architecture" className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Architecture
            </Link>
            <Link href="#pricing" className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">
              FAQ
            </Link>
          </nav>
        </div>

        <nav aria-label="Auth actions" className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors px-2.5 py-1.5"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Free</span>
            <span className="text-white/80">&rarr;</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
