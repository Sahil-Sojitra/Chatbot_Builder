import Link from "next/link";

import { buttonVariants } from "@/components/ui";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-zinc-700/80 bg-zinc-900 text-zinc-200 transition-colors group-hover:border-zinc-500 group-hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tracking-tight text-zinc-100">Chatbot Studio</span>
            <span className="rounded-[2px] border border-zinc-700 bg-zinc-800/70 px-1 py-0.2 font-mono text-[9px] font-medium text-zinc-300">
              v1.0
            </span>
          </div>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" }) + " text-zinc-300 hover:text-white"}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            Get started &rarr;
          </Link>
        </nav>
      </div>
    </header>
  );
}
