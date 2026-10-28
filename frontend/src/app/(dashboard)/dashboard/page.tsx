"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Badge,
  Button,
  EmptyState,
  Spinner,
} from "@/components/ui";
import { ChatbotCard } from "@/features/chatbots/components/ChatbotCard";
import { useChatbots } from "@/features/chatbots/useChatbots";
import { OrganizationEmptyState } from "@/features/organizations/components/OrganizationEmptyState";
import { useOrganization } from "@/features/organizations/useOrganization";
import { useAppSelector } from "@/lib/hooks";

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { status, organization, error, refetch } = useOrganization();
  const chatbotsState = useChatbots(status === "loaded");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner label="Loading workspace…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Unable to load organization"
        description={error ?? "Something went wrong loading your workspace. Please retry."}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  if (status === "none" || !organization) {
    return <OrganizationEmptyState />;
  }

  const activeChatbotsCount = chatbotsState.chatbots.filter(
    (c) => c.status === "ACTIVE",
  ).length;

  const pausedChatbotsCount = chatbotsState.chatbots.filter(
    (c) => c.status === "PAUSED" || c.status === "DRAFT",
  ).length;

  // Filter bots by search query and status filter
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
      {/* 1. CREATIVE WORKSPACE STUDIO BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 p-6 sm:p-7 shadow-xs dark:border-white/[0.08] dark:bg-gradient-to-br dark:from-[#0E1B15] dark:via-[#09120E] dark:to-[#070D0A]">
        {/* Soft background ambient glow */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-gradient-to-br from-emerald-400/15 via-teal-400/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xl shadow-xs shadow-emerald-600/30 ring-2 ring-emerald-500/20">
              {organization.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 dark:text-emerald-400">
                <span className="font-semibold uppercase tracking-wider">Workspace</span>
                <span>•</span>
                <span className="text-zinc-500 dark:text-zinc-400 font-sans">/{organization.slug || "default"}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {organization.name}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Manage your context-aware assistants, knowledge pipelines, and live widget integrations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Link
              href="/dashboard/organization"
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-950 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-zinc-300 px-4 py-2 text-xs font-medium transition-all shadow-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>
            <Link
              href="/dashboard/chatbots/new"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chatbot</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. CREATIVE SAAS METRICS ROW */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs hover:border-emerald-500/30 hover:shadow-sm dark:border-white/[0.08] dark:bg-[#0E1B15] transition-all">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Total Assistants</span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/30 uppercase tracking-wider font-semibold">
              ALL
            </span>
          </div>
          <div className="mt-3 text-3xl font-mono font-bold text-zinc-900 dark:text-white tracking-tight">
            {chatbotsState.chatbots.length}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Instant crawlers and custom assistants</p>
        </div>

        {/* Metric 2: Hero Active Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/20 p-5 shadow-xs hover:border-emerald-500/50 hover:shadow-sm dark:border-emerald-500/30 dark:bg-gradient-to-br dark:from-[#0E1B15] dark:to-[#0A1A12] transition-all">
          <div className="flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300 font-medium">
            <span className="font-semibold">Active &amp; Serving</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 anim-live-pulse" />
              LIVE
            </span>
          </div>
          <div className="mt-3 text-3xl font-mono font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
            {activeChatbotsCount}
          </div>
          <p className="mt-1 text-xs text-emerald-800/70 dark:text-emerald-300/70">Answering customer queries in real-time</p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs hover:border-zinc-300 hover:shadow-sm dark:border-white/[0.08] dark:bg-[#0E1B15] transition-all">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Paused / Staging</span>
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full dark:text-zinc-300 dark:bg-white/[0.05] dark:border-white/10 uppercase tracking-wider font-semibold">
              OFFLINE
            </span>
          </div>
          <div className="mt-3 text-3xl font-mono font-bold text-zinc-900 dark:text-white tracking-tight">
            {pausedChatbotsCount}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Offline, in staging, or drafts</p>
        </div>
      </div>

      {/* 3. CHATBOTS SECTION & FILTER BAR */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Chatbot Assistants
            </h2>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300 font-mono font-semibold">
              {filteredChatbots.length}
            </span>
          </div>

          {/* Search & Filter Controls */}
          {chatbotsState.chatbots.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input */}
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

              {/* Status filter pills */}
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
          )}
        </div>

        {/* 4. CHATBOT LIST / EMPTY STATE */}
        {chatbotsState.status === "loading" && chatbotsState.chatbots.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Spinner label="Loading chatbots…" />
          </div>
        ) : filteredChatbots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] p-12 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-base text-zinc-900 dark:text-white">
              {searchQuery ? "No matching assistants found" : "No chatbots deployed yet"}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
              {searchQuery
                ? `No assistants matched "${searchQuery}". Clear your search query or change filters.`
                : "Create your first instant or custom chatbot to start answering visitor queries."}
            </p>
            <Link
              href="/dashboard/chatbots/new"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-semibold shadow-xs transition-all"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Assistant</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredChatbots.map((bot) => (
              <ChatbotCard key={bot.id} chatbot={bot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
