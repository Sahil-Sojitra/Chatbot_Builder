"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { Button, EmptyState, Spinner } from "@/components/ui";
import { ChatbotNav } from "@/features/chatbots/components/ChatbotNav";
import { ChatbotDetailProvider, useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";

function ChatbotDetailShell({ children }: { children: ReactNode }) {
  const { status, chatbot, error, refetch } = useChatbotDetail();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner label="Loading chatbot…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Couldn't load this chatbot"
        description={error ?? "Something went wrong. Please try again."}
        action={<Button onClick={refetch}>Try again</Button>}
      />
    );
  }

  if (!chatbot) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Vercel-style deployment project header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="text-zinc-500">deployments</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-semibold">{chatbot.name.toLowerCase().replace(/\s+/g, "-")}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{chatbot.provider || "openai"}:{chatbot.model || "gpt-4o-mini"}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{chatbot.name}</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-zinc-800 bg-zinc-900/80 text-xs font-medium">
              <span
                className={`h-2 w-2 rounded-full ${
                  chatbot.status === "ACTIVE"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                    : chatbot.status === "PAUSED"
                      ? "bg-amber-400"
                      : "bg-zinc-500"
                }`}
              />
              <span className="text-zinc-300">
                {chatbot.status === "ACTIVE" ? "Production Ready" : chatbot.status === "PAUSED" ? "Paused" : "Draft"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-[#0a0a0a] text-xs font-mono text-zinc-300">
            <span className="text-zinc-500">publicId:</span>
            <span className="font-semibold text-white">{chatbot.publicId}</span>
          </div>
        </div>
      </div>

      <ChatbotNav chatbotId={chatbot.id} />
      {children}
    </div>
  );
}

export default function ChatbotDetailLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();

  return (
    <ChatbotDetailProvider chatbotId={params.id}>
      <ChatbotDetailShell>{children}</ChatbotDetailShell>
    </ChatbotDetailProvider>
  );
}
