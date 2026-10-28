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
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <span>Workspace</span>
            <span className="text-zinc-400 dark:text-zinc-700">/</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Chatbots</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mt-1">
            Chatbots Directory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
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
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-center"
        >
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Assistants
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300 font-mono font-semibold">
                {filteredChatbots.length}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search bar */}
              <div className="relative">
                <svg
                  className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
                  className="h-8.5 pl-9 pr-4 rounded-full bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-white dark:placeholder:text-zinc-500 w-48 sm:w-60 transition-all font-sans shadow-xs"
                />
              </div>

              {/* Status pills filter */}
              <div className="flex items-center p-0.5 rounded-full bg-zinc-100 border border-zinc-200 dark:bg-white/[0.03] dark:border-white/[0.08] text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    statusFilter === "ACTIVE"
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("PAUSED")}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    statusFilter === "PAUSED"
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
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
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] p-12 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-base text-zinc-900 dark:text-white">No chatbots created yet</h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mt-1 leading-relaxed">
              Create an AI assistant from your website URL in 10 seconds, or customize models and instructions manually.
            </p>
            <Link
              href="/dashboard/chatbots/new"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs sm:text-sm font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Assistant</span>
            </Link>
          </div>
        ) : filteredChatbots.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#0b0b0e] p-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
            <p>No chatbots found matching "{searchQuery}".</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline font-medium cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredChatbots.map((chatbot) => (
              <ChatbotCard key={chatbot.id} chatbot={chatbot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
