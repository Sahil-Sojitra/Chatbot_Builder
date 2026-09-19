"use client";

import Link from "next/link";

import { Button, EmptyState, Spinner, buttonVariants } from "@/components/ui";
import { ChatbotCard } from "@/features/chatbots/components/ChatbotCard";
import { useChatbots } from "@/features/chatbots/useChatbots";
import { OrganizationEmptyState } from "@/features/organizations/components/OrganizationEmptyState";
import { useOrganization } from "@/features/organizations/useOrganization";

export default function ChatbotsPage() {
  const organizationState = useOrganization();
  const chatbotsState = useChatbots(organizationState.status === "loaded");

  if (organizationState.status === "idle" || organizationState.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chatbots</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage the chatbots your organization publishes.
          </p>
        </div>
        <Link href="/dashboard/chatbots/new" className={buttonVariants({ variant: "default" })}>
          Create Chatbot
        </Link>
      </div>

      {chatbotsState.status === "loading" ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner label="Loading chatbots…" />
        </div>
      ) : chatbotsState.status === "error" ? (
        <EmptyState
          title="Couldn't load your chatbots"
          description={chatbotsState.error ?? "Something went wrong. Please try again."}
          action={<Button onClick={() => chatbotsState.refetch()}>Try again</Button>}
        />
      ) : chatbotsState.chatbots.length === 0 ? (
        <EmptyState
          title="No chatbots yet"
          description="A chatbot is a configured AI assistant — its name, instructions, and model settings — that you'll be able to publish for your users. Create your first one to get started."
          action={
            <Link
              href="/dashboard/chatbots/new"
              className={buttonVariants({ variant: "default" })}
            >
              Create Chatbot
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {chatbotsState.chatbots.map((chatbot) => (
            <ChatbotCard key={chatbot.id} chatbot={chatbot} />
          ))}
        </div>
      )}
    </div>
  );
}
