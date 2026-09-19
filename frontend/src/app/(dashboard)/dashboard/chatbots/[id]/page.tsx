"use client";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";
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
  const { chatbot } = useChatbotDetail();

  if (!chatbot) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{chatbot.name}</CardTitle>
            <CardDescription>{chatbot.description ?? "No description provided."}</CardDescription>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[chatbot.status]}>{chatbot.status}</Badge>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
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
          <InfoRow label="Created" value={new Date(chatbot.createdAt).toLocaleDateString()} />
        </CardContent>
      </Card>
    </div>
  );
}
