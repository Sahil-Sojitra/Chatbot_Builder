import Link from "next/link";

import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import type { Chatbot } from "@/types/chatbot";

const STATUS_BADGE_VARIANT: Record<Chatbot["status"], "default" | "success" | "warning"> = {
  DRAFT: "default",
  ACTIVE: "success",
  PAUSED: "warning",
};

export interface ChatbotCardProps {
  chatbot: Chatbot;
}

export function ChatbotCard({ chatbot }: ChatbotCardProps) {
  const isLive = chatbot.status === "ACTIVE";

  return (
    <Link href={`/dashboard/chatbots/${chatbot.id}`} className="group block">
      <Card className="rounded-md border border-zinc-800 bg-[#000000] p-5 transition-all hover:border-zinc-700 hover:bg-[#050505]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {/* Deployment Mark */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-[#0d0d0d] text-zinc-300 group-hover:border-zinc-600 group-hover:text-white transition-colors">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L1 21h22L12 2z" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <h3 className="truncate font-semibold text-base text-zinc-100 group-hover:text-white transition-colors">
                  {chatbot.name}
                </h3>
                <span className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  /{chatbot.slug}
                </span>
              </div>

              {chatbot.description ? (
                <p className="line-clamp-2 mt-1 text-sm text-zinc-400 leading-normal">
                  {chatbot.description}
                </p>
              ) : (
                <p className="mt-1 text-xs text-zinc-500 italic">No description provided</p>
              )}

              {/* Deployment Engine Tags */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-zinc-300 bg-[#121212] border border-zinc-800 rounded px-2 py-0.5 font-mono">
                  {chatbot.provider || "openai"}:{chatbot.model || "gpt-4o-mini"}
                </span>

                {chatbot.ragEnabled ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    RAG Active ({chatbot.ragTopK || 5} chunks)
                  </span>
                ) : (
                  <span className="text-zinc-500 bg-[#121212] border border-zinc-800 rounded px-2 py-0.5">
                    Base Model (No RAG)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge & Link */}
          <div className="flex shrink-0 items-center gap-3 self-start">
            <Badge variant={STATUS_BADGE_VARIANT[chatbot.status]}>
              <span
                className={`h-2 w-2 rounded-full ${
                  isLive ? "bg-emerald-400 animate-pulse" : chatbot.status === "PAUSED" ? "bg-amber-400" : "bg-zinc-500"
                }`}
              />
              {chatbot.status === "ACTIVE" ? "Ready" : chatbot.status}
            </Badge>

            <span className="text-zinc-500 group-hover:text-zinc-200 text-sm transition-transform group-hover:translate-x-0.5">
              &rarr;
            </span>
          </div>
        </div>

        {/* Vercel-Style Deployment Footer Strip */}
        <div className="border-t border-zinc-800/80 bg-[#080808] -mx-5 -mb-5 mt-4 px-5 py-2.5 flex items-center justify-between text-xs text-zinc-400 rounded-b-md">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-zinc-500">ID:</span>
            <span className="text-zinc-300">{chatbot.publicId.slice(0, 12)}…</span>
            <span>&middot;</span>
            <span className="text-zinc-400">Production</span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500">
            <span>Created {new Date(chatbot.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
