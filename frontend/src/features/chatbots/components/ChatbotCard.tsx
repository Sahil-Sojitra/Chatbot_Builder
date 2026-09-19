import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import type { Chatbot } from "@/types/chatbot";

const STATUS_BADGE_VARIANT: Record<Chatbot["status"], "default" | "success" | "warning"> = {
  DRAFT: "default",
  ACTIVE: "success",
  PAUSED: "warning",
};

export interface ChatbotCardProps {
  chatbot: Chatbot;
}

export function ChatbotCard({ chatbot }: ChatbotCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{chatbot.name}</CardTitle>
          {chatbot.description ? (
            <CardDescription>{chatbot.description}</CardDescription>
          ) : null}
          <p className="mt-1 font-mono text-xs text-muted-foreground">{chatbot.slug}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Badge variant={STATUS_BADGE_VARIANT[chatbot.status]}>{chatbot.status}</Badge>
          {chatbot.ragEnabled ? <Badge variant="accent">RAG</Badge> : null}
        </div>
      </CardHeader>
    </Card>
  );
}
