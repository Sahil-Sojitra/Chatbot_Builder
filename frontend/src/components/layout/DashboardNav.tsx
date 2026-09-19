"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui";
import { useLogout } from "@/features/auth/useLogout";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/chatbots", label: "Chatbots" },
  { href: "/dashboard/knowledge-sources", label: "Knowledge Sources" },
  { href: "/dashboard/invitations", label: "Invitations" },
  { href: "/dashboard/organization", label: "Organization Settings" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useLogout();

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-6">
        <nav aria-label="Dashboard" className="flex items-center gap-1 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          size="sm"
          disabled={isLoggingOut}
          onClick={() => void logout()}
          className="ml-auto shrink-0"
        >
          {isLoggingOut ? "Logging out…" : "Log out"}
        </Button>
      </div>
    </header>
  );
}
