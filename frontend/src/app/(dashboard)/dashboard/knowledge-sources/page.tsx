"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CustomSelect,
  EmptyState,
  Spinner,
  buttonVariants,
} from "@/components/ui";
import { useChatbots } from "@/features/chatbots/useChatbots";
import { KnowledgeSourceCard } from "@/features/knowledge-sources/components/KnowledgeSourceCard";
import { useKnowledgeSources } from "@/features/knowledge-sources/useKnowledgeSources";
import { useOrganization } from "@/features/organizations/useOrganization";

function ChatbotKnowledgeViewer({ chatbotId }: { chatbotId: string }) {
  const { status, knowledgeSources, error, refetch } = useKnowledgeSources(chatbotId);

  if (status === "loading") {
    return (
      <div className="py-8">
        <Spinner label="Loading knowledge sources…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Couldn't load knowledge sources"
        description={error ?? "Something went wrong."}
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="btn-volt rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-5 py-2 text-xs shadow-md"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (knowledgeSources.length === 0) {
    return (
      <EmptyState
        title="No knowledge sources for this chatbot"
        description="Add files, URLs, or plain text to give this chatbot reference context."
        action={
          <Link
            href={`/dashboard/chatbots/${chatbotId}/knowledge-sources/new`}
            className="btn-volt inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-5 py-2 text-xs shadow-[0_10px_28px_rgba(5, 150, 105, 0.35)]"
          >
            Add Knowledge
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-zinc-400">
          {knowledgeSources.length} {knowledgeSources.length === 1 ? "source" : "sources"} attached
        </span>
        <Link
          href={`/dashboard/chatbots/${chatbotId}/knowledge-sources/new`}
          className="btn-volt inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-4 py-2 text-xs shadow-[0_10px_26px_rgba(5, 150, 105, 0.35)]"
        >
          Add Knowledge
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {knowledgeSources.map((source) => (
          <KnowledgeSourceCard
            key={source.id}
            source={source}
            onDeleted={() => void refetch()}
            onUpdated={() => void refetch()}
          />
        ))}
      </div>
    </div>
  );
}

export default function GlobalKnowledgeSourcesPage() {
  const { status: orgStatus } = useOrganization();
  const { status: chatbotsStatus, chatbots } = useChatbots(orgStatus === "loaded");
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");

  if (orgStatus === "loading" || chatbotsStatus === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner label="Loading knowledge base…" />
      </div>
    );
  }

  if (chatbots.length === 0) {
    return (
      <EmptyState
        title="Create a chatbot first"
        description="Knowledge sources (documents, web pages, and plain text) are organized per chatbot. Once you create a chatbot, you can attach knowledge sources to it."
        action={
          <Link
            href="/dashboard/chatbots/new"
            className="btn-volt inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-5 py-2 text-xs shadow-[0_10px_28px_rgba(5, 150, 105, 0.35)]"
          >
            Create Chatbot
          </Link>
        }
      />
    );
  }

  const currentChatbotId = selectedChatbotId || chatbots[0].id;
  const currentChatbot = chatbots.find((c) => c.id === currentChatbotId) ?? chatbots[0];

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Workspace</span>
            <span className="text-zinc-400 dark:text-zinc-700">/</span>
            <span className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">Knowledge Engine</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
            Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Manage vector documents, websites, and text corpora connected to your assistant runtime.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="chatbot-selector" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
            Target Assistant:
          </label>
          <CustomSelect
            id="chatbot-selector"
            value={currentChatbotId}
            onChange={(val) => setSelectedChatbotId(val)}
            className="w-60 sm:w-68 text-xs font-mono"
            options={chatbots.map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>
      </div>

      <Card className="rounded-[26px] border border-zinc-200/80 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#111218]/90 dark:shadow-2xl backdrop-blur-xl">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <CardTitle className="font-display text-xl font-bold text-zinc-900 dark:text-white">{currentChatbot.name}</CardTitle>
              {currentChatbot.creationMode === "INSTANT" ? (
                <Badge variant="lime">Instant Bot (Auto Indexed)</Badge>
              ) : (
                <Badge
                  variant={
                    currentChatbot.status === "ACTIVE"
                      ? "success"
                      : currentChatbot.status === "PAUSED"
                        ? "warning"
                        : "default"
                  }
                  className="rounded-full"
                >
                  {currentChatbot.status}
                </Badge>
              )}
              {currentChatbot.ragEnabled ? <Badge variant="accent" className="rounded-full">RAG Active</Badge> : null}
            </div>
            <CardDescription className="mt-1.5 text-xs text-zinc-400">
              {currentChatbot.description ?? "No description provided."}
            </CardDescription>
          </div>
          <Link
            href={`/dashboard/chatbots/${currentChatbot.id}`}
            className="rounded-full px-4 py-2 text-xs text-zinc-600 hover:text-zinc-950 border border-zinc-200 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-white dark:border-white/[0.1] dark:hover:border-white/20 transition-all font-mono"
          >
            {currentChatbot.creationMode === "INSTANT" ? "Open Playground →" : "Chatbot Details →"}
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          {currentChatbot.creationMode === "INSTANT" ? (
            <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02] p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-600 anim-live-pulse" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Automated Website Knowledge Engine</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                This assistant was created as an <strong>Instant Bot</strong>. Its knowledge index is crawled, extracted, and indexed directly from its target website through our automated FastAPI RAG service.
              </p>
              <p className="text-xs text-zinc-400">
                Manual document uploads, file attachments, and text sources are reserved for <strong>Custom Bots</strong>. You can test and inspect this chatbot right now in its dedicated playground.
              </p>
              <div className="pt-2">
                <Link
                  href={`/dashboard/chatbots/${currentChatbot.id}`}
                  className="btn-volt inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-5 py-2 text-xs shadow-[0_10px_28px_rgba(5, 150, 105, 0.35)]"
                >
                  Test Chatbot in Playground &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <ChatbotKnowledgeViewer chatbotId={currentChatbot.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
