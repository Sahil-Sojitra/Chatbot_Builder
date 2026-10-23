"use client";

import { useState } from "react";
import Link from "next/link";

import { Button, EmptyState, Spinner } from "@/components/ui";
import { ChatbotCard } from "@/features/chatbots/components/ChatbotCard";
import { useChatbots } from "@/features/chatbots/useChatbots";
import { OrganizationEmptyState } from "@/features/organizations/components/OrganizationEmptyState";
import { useOrganization } from "@/features/organizations/useOrganization";

export default function ChatbotsPage() {
  const organizationState = useOrganization();
  const chatbotsState = useChatbots(organizationState.status === "loaded");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");

  if (organizationState.status === "idle" || organizationState.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner label="Loading your organization…" />
      </div>
    );
  }

  if (organizationState.status === "error") {
    return (
      <EmptyState
        title="Couldn't load your organization"
        description={organizationState.error ?? "Something went wrong. Please try again."}
        action={<Button onClick={() => void organizationState.refetch()}>Try again</Button>}
      />
    );
  }

  if (organizationState.status === "none") {
    return <OrganizationEmptyState />;
  }

  const filteredChatbots = chatbotsState.chatbots.filter((bot) => {
    const matchesSearch =
      bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bot.description && bot.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? bot.status === "ACTIVE" : bot.status !== "ACTIVE";

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-7 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <span>Workspace</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-300 font-medium">Chatbots</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mt-1">
            Chatbots Directory
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Manage your conversational assistants, knowledge bases, and embeddable widgets.
          </p>
        </div>

        <Link
          href="/dashboard/chatbots/new"
          onClick={() => {
            try {
              localStorage.removeItem("pending_instant_bot");
            } catch {}
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-950 shadow-xs hover:bg-zinc-200 transition-colors self-start sm:self-center"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chatbot</span>
        </Link>
      </div>

      {/* Filter and Content */}
      <div className="flex flex-col gap-4">
        {chatbotsState.chatbots.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">
                Assistants
              </span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[11px] text-zinc-400 font-mono">
                {filteredChatbots.length}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search bar */}
              <div className="relative">
                <svg
                  className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name or slug…"
                  className="h-8 pl-8 pr-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-700 w-48 sm:w-56 transition-colors"
                />
              </div>

              {/* Status pills filter */}
              <div className="flex items-center p-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === "ACTIVE"
                      ? "bg-zinc-800 text-emerald-400 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("PAUSED")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === "PAUSED"
                      ? "bg-zinc-800 text-amber-400 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Paused
                </button>
              </div>
            </div>
          </div>
        )}

        {chatbotsState.status === "loading" ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Spinner label="Loading chatbots…" />
          </div>
        ) : chatbotsState.status === "error" ? (
          <EmptyState
            title="Couldn't load your chatbots"
            description={chatbotsState.error ?? "Something went wrong. Please try again."}
            action={<Button onClick={() => chatbotsState.refetch()}>Try again</Button>}
          />
        ) : chatbotsState.chatbots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-[#0b0b0e] p-8 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No chatbots created yet</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1 leading-relaxed">
              Create an AI assistant from your website URL, or configure models and prompts manually.
            </p>
            <Link
              href="/dashboard/chatbots/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-950 hover:bg-zinc-200 transition-colors"
            >
              Create Chatbot
            </Link>
          </div>
        ) : filteredChatbots.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-[#0b0b0e] p-6 text-center text-xs text-zinc-400">
            <p>No chatbots found matching "{searchQuery}".</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-2 text-xs text-zinc-300 hover:underline cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredChatbots.map((chatbot) => (
              <ChatbotCard key={chatbot.id} chatbot={chatbot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
