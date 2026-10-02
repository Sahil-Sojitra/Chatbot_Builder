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
  EmptyState,
  Select,
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
            className={buttonVariants({ variant: "default" })}
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
            className={buttonVariants({ variant: "default" })}
          >
            Add Knowledge
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {knowledgeSources.length} {knowledgeSources.length === 1 ? "source" : "sources"} attached
        </span>
        <Link
          href={`/dashboard/chatbots/${chatbotId}/knowledge-sources/new`}
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          Add Knowledge
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {knowledgeSources.map((source) => (
          <KnowledgeSourceCard key={source.id} source={source} />
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
      <div className="flex flex-1 items-center justify-center py-16">
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
          <Link href="/dashboard/chatbots/new" className={buttonVariants({ variant: "default" })}>
            Create Chatbot
          </Link>
        }
      />
    );
  }

  const currentChatbotId = selectedChatbotId || chatbots[0].id;
  const currentChatbot = chatbots.find((c) => c.id === currentChatbotId) ?? chatbots[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Knowledge Sources
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage documents, web links, and text sources connected to your chatbots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="chatbot-selector" className="text-xs text-muted-foreground whitespace-nowrap">
            Selected Chatbot:
          </label>
          <Select
            id="chatbot-selector"
            value={currentChatbotId}
            onChange={(e) => setSelectedChatbotId(e.target.value)}
            className="w-56"
          >
            {chatbots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name} ({bot.status})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{currentChatbot.name}</CardTitle>
              <Badge
                variant={
                  currentChatbot.status === "ACTIVE"
                    ? "success"
                    : currentChatbot.status === "PAUSED"
                      ? "warning"
                      : "default"
                }
              >
                {currentChatbot.status}
              </Badge>
              {currentChatbot.ragEnabled ? <Badge variant="accent">RAG Active</Badge> : null}
            </div>
            <CardDescription className="mt-1">
              {currentChatbot.description ?? "No description provided."}
            </CardDescription>
          </div>
          <Link
            href={`/dashboard/chatbots/${currentChatbot.id}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Chatbot Details &rarr;
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          <ChatbotKnowledgeViewer chatbotId={currentChatbot.id} />
        </CardContent>
      </Card>
    </div>
  );
}
