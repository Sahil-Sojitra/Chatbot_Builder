"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui";
import { useLogout } from "@/features/auth/useLogout";
import { useAppSelector } from "@/lib/hooks";
import { cn } from "@/lib/utils";

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
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-15 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand & Organization context */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-zinc-950 font-bold text-xs shadow-xs transition-opacity group-hover:opacity-90">
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z" />
                </svg>
              </div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100 hidden sm:inline">
                Chatbot Studio
              </span>
            </Link>

            <span className="text-zinc-800 font-light select-none">/</span>

            {organization ? (
              <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="max-w-[140px] truncate font-medium text-zinc-200">{organization.name}</span>
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
                    "rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150",
                    isActive
                      ? "bg-white/[0.1] text-white shadow-xs font-semibold"
                      : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200",
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
          <Link
            href="/dashboard/chatbots/new"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-black shadow-sm transition-all hover:bg-zinc-200 active:scale-95"
          >
            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chatbot</span>
          </Link>

          {user ? (
            <Link
              href="/dashboard/account"
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-900/60 py-1 pl-1.5 pr-3 text-xs text-zinc-300 hover:border-white/[0.16] hover:bg-zinc-900 transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/[0.1] text-[11px] font-semibold text-zinc-100">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate hidden md:inline text-xs font-medium">{user.name}</span>
            </Link>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            disabled={isLoggingOut}
            onClick={() => void logout()}
            className="text-xs text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg h-8 px-2.5"
          >
            {isLoggingOut ? "Exiting…" : "Log out"}
          </Button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden border-t border-white/[0.05] overflow-x-auto px-4 py-1.5 gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
