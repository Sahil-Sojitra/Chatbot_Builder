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
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#09090b]/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand & Organization context */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <svg className="h-5 w-5 text-white fill-current transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2z" />
              </svg>
              <span className="font-semibold text-sm tracking-tight text-white hidden sm:inline">Chatbot Studio</span>
            </Link>

            <span className="text-zinc-600 font-light text-lg">/</span>

            {organization ? (
              <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-[#0a0a0a] px-2.5 py-1 text-sm text-zinc-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="max-w-[130px] truncate font-medium">{organization.name}</span>
                <span className="rounded bg-zinc-800 px-1 py-0.2 text-[10px] text-zinc-400 uppercase font-mono">Hobby</span>
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
                    "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-zinc-800/80 text-white font-semibold"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/chatbots/new"
            className={buttonVariants({ variant: "default", size: "sm" }) + " hidden sm:inline-flex"}
          >
            Deploy Bot
          </Link>

          {user ? (
            <Link
              href="/dashboard/account"
              className="flex items-center gap-2 rounded-md border border-zinc-800 bg-[#0a0a0a] py-1 pl-2 pr-3 text-sm text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-medium text-zinc-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate hidden md:inline text-sm">{user.name}</span>
            </Link>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            disabled={isLoggingOut}
            onClick={() => void logout()}
            className="text-sm text-zinc-400 hover:text-white"
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
