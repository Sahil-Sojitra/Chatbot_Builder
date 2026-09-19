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
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Chatbot</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{chatbot.name}</h1>
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
