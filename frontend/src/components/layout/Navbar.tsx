import Link from "next/link";

import { buttonVariants } from "@/components/ui";

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            C
          </span>
          <span className="text-sm font-semibold text-foreground">
            Chatbot Builder
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
