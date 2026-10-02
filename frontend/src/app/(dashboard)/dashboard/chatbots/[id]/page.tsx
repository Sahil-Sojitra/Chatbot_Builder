"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from "@/components/ui";
import { useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";
import { chatbotsApi } from "@/lib/api/chatbots";
import { ApiRequestError } from "@/lib/api/client";
import type { Chatbot } from "@/types/chatbot";

const STATUS_BADGE_VARIANT: Record<Chatbot["status"], "default" | "success" | "warning"> = {
  DRAFT: "default",
  ACTIVE: "success",
  PAUSED: "warning",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function ChatbotOverviewPage() {
  const { chatbot, setChatbot } = useChatbotDetail();
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!chatbot) {
    return null;
  }

  const handleCopyPublicId = async () => {
    try {
      await navigator.clipboard.writeText(chatbot.publicId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleTogglePublish = async () => {
    setIsPublishing(true);
    setActionError(null);

    try {
      if (chatbot.status === "ACTIVE") {
        const response = await chatbotsApi.unpublish(chatbot.id);
        setChatbot(response.chatbot);
      } else {
        const response = await chatbotsApi.publish(chatbot.id);
        setChatbot(response.chatbot);
      }
    } catch (err) {
      setActionError(
        err instanceof ApiRequestError
          ? err.message
          : `Failed to ${chatbot.status === "ACTIVE" ? "unpublish" : "publish"} chatbot.`,
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {actionError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/20 bg-red-50 p-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{chatbot.name}</CardTitle>
              <Badge variant={STATUS_BADGE_VARIANT[chatbot.status]}>{chatbot.status}</Badge>
              {chatbot.ragEnabled ? <Badge variant="accent">RAG</Badge> : null}
            </div>
            <CardDescription className="mt-1">
              {chatbot.description ?? "No description provided."}
            </CardDescription>
            <p className="mt-2 font-mono text-xs text-muted-foreground">slug: {chatbot.slug}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/chatbots/${chatbot.id}/settings`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Edit Settings
            </Link>
            <Button
              size="sm"
              variant={chatbot.status === "ACTIVE" ? "secondary" : "default"}
              disabled={isPublishing}
              onClick={() => void handleTogglePublish()}
            >
              {isPublishing
                ? "Updating…"
                : chatbot.status === "ACTIVE"
                  ? "Pause (Unpublish)"
                  : "Publish Chatbot"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Integration & Public ID */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public Access & Integration</CardTitle>
          <CardDescription>
            Use this identifier to embed or query this chatbot once published.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 p-2.5">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Public ID</span>
              <span className="font-mono text-sm font-medium">{chatbot.publicId}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => void handleCopyPublicId()}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {chatbot.status !== "ACTIVE" ? (
            <p className="text-xs text-muted-foreground">
              Note: This chatbot is currently in <strong>{chatbot.status}</strong> status. Only{" "}
              <strong>ACTIVE</strong> chatbots can serve queries.
            </p>
          ) : (
            <p className="text-xs text-emerald-700">
              ✓ This chatbot is ACTIVE and ready to serve chat requests.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <InfoRow label="Provider" value={chatbot.provider ?? "Not set"} />
          <InfoRow label="Model" value={chatbot.model ?? "Not set"} />
          <InfoRow
            label="Temperature"
            value={chatbot.temperature !== null ? String(chatbot.temperature) : "Not set"}
          />
          <InfoRow
            label="Max tokens"
            value={chatbot.maxTokens !== null ? String(chatbot.maxTokens) : "Not set"}
          />
          <InfoRow label="RAG enabled" value={chatbot.ragEnabled ? "Yes" : "No"} />
          {chatbot.ragEnabled ? (
            <>
              <InfoRow
                label="RAG Top K"
                value={chatbot.ragTopK !== null ? String(chatbot.ragTopK) : "Default"}
              />
              <InfoRow
                label="RAG Similarity Threshold"
                value={
                  chatbot.ragSimilarityThreshold !== null
                    ? String(chatbot.ragSimilarityThreshold)
                    : "Default"
                }
              />
            </>
          ) : null}
          <InfoRow label="Created" value={new Date(chatbot.createdAt).toLocaleDateString()} />
          {chatbot.publishedAt ? (
            <InfoRow
              label="Last Published"
              value={new Date(chatbot.publishedAt).toLocaleDateString()}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
