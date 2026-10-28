"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLogout } from "@/features/auth/useLogout";
import { useAppSelector } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/chatbots", label: "Chatbots" },
  { href: "/dashboard/knowledge-sources", label: "Knowledge" },
  { href: "/dashboard/organization", label: "Workspace" },
  { href: "/dashboard/account", label: "Account" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useLogout();
  const user = useAppSelector((state) => state.auth.user);
  const organization = useAppSelector((state) => state.organization.organization);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 dark:border-white/[0.08] dark:bg-[#070D0A]/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand & Organization context */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
                ⚡
              </div>
              <span className="font-display font-semibold text-sm tracking-tight text-zinc-900 dark:text-white hidden sm:inline">
                Chatbot Studio
              </span>
            </Link>

            <span className="text-zinc-300 dark:text-white/20 select-none">/</span>

            {organization ? (
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-950/40 px-3 py-1 text-xs text-emerald-800 dark:text-emerald-300 transition-colors">
                <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 anim-live-pulse" />
                <span className="max-w-[140px] truncate font-medium">{organization.name}</span>
              </div>
            ) : null}
          </div>

          {/* Nav Tabs */}
          <nav aria-label="Dashboard" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150",
                    isActive
                      ? "bg-emerald-100/80 text-emerald-900 border border-emerald-300 font-semibold shadow-xs dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500/30"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          

          {user ? (
            <Link
              href="/dashboard/account"
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.04] py-1 pl-1.5 pr-3 text-xs text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-all"
            >
              <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate hidden md:inline text-xs font-medium">{user.name}</span>
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="rounded-full border border-zinc-200 dark:border-white/10 p-2 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:border-white/20 dark:hover:bg-white/[0.05] transition-all cursor-pointer"
            title="Log out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
