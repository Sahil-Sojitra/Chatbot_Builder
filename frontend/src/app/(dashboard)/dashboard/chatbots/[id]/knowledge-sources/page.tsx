"use client";

import Link from "next/link";

import { Button, EmptyState, Spinner, buttonVariants } from "@/components/ui";
import { useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";
import { KnowledgeSourceCard } from "@/features/knowledge-sources/components/KnowledgeSourceCard";
import { useKnowledgeSources } from "@/features/knowledge-sources/useKnowledgeSources";

function KnowledgeSourcesView({ chatbotId }: { chatbotId: string }) {
  const { status, knowledgeSources, error, refetch } = useKnowledgeSources(chatbotId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Knowledge Sources</h2>
          <p className="text-sm text-muted-foreground">
            Content this chatbot can reference — files, URLs, webpages, and pasted text.
          </p>
        </div>
        <Link
          href={`/dashboard/chatbots/${chatbotId}/knowledge-sources/new`}
          className={buttonVariants({ variant: "default" })}
        >
          Add Knowledge
        </Link>
      </div>

      {status === "loading" ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner label="Loading knowledge sources…" />
        </div>
      ) : status === "error" ? (
        <EmptyState
          title="Couldn't load knowledge sources"
          description={error ?? "Something went wrong. Please try again."}
          action={<Button onClick={refetch}>Try again</Button>}
        />
      ) : knowledgeSources.length === 0 ? (
        <EmptyState
          title="No knowledge sources yet"
          description="Add files, URLs, webpages, or pasted text so this chatbot has content to draw from once retrieval is built."
          action={
            <Link
              href={`/dashboard/chatbots/${chatbotId}/knowledge-sources/new`}
              className={buttonVariants({ variant: "default" })}
            >
              Add Knowledge
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {knowledgeSources.map((source) => (
            <KnowledgeSourceCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatbotKnowledgeSourcesPage() {
  const { chatbot } = useChatbotDetail();

  if (!chatbot) {
    return null;
  }

  return <KnowledgeSourcesView chatbotId={chatbot.id} />;
}
