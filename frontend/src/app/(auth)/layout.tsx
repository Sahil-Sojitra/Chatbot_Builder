import Link from "next/link";
import type { ReactNode } from "react";

import { RedirectIfAuthenticated } from "@/components/RedirectIfAuthenticated";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <RedirectIfAuthenticated>
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-background text-foreground px-4 py-16 sm:px-6 overflow-hidden transition-colors">
        {/* Top Right Theme Toggle */}
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        {/* Studio Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-emerald-500/10 dark:bg-emerald-500/12 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mb-6 flex flex-col items-center gap-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
              ⚡
            </span>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-base tracking-tight text-zinc-900 dark:text-white">
                Chatbot Studio
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 anim-live-pulse" />
                v1.0
              </span>
            </div>
          </Link>
        </div>

        <div className="relative w-full max-w-sm">{children}</div>
      </main>
    </RedirectIfAuthenticated>
  );
}
