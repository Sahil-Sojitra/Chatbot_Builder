"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface ChatbotNavProps {
  chatbotId: string;
}

export function ChatbotNav({ chatbotId }: ChatbotNavProps) {
  const pathname = usePathname();

  const items = [
    { href: `/dashboard/chatbots/${chatbotId}`, label: "Overview" },
    { href: `/dashboard/chatbots/${chatbotId}/knowledge-sources`, label: "Knowledge Sources" },
    { href: `/dashboard/chatbots/${chatbotId}/settings`, label: "Settings" },
  ];

  return (
    <nav aria-label="Chatbot" className="flex items-center gap-1 border-b border-border">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
