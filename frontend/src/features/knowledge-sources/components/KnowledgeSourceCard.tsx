import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import type { KnowledgeSource } from "@/types/knowledgeSource";

const STATUS_BADGE_VARIANT: Record<
  KnowledgeSource["status"],
  "default" | "warning" | "success" | "destructive"
> = {
  PENDING: "default",
  PROCESSING: "warning",
  READY: "success",
  FAILED: "destructive",
  DISABLED: "default",
};

const TYPE_LABEL: Record<KnowledgeSource["type"], string> = {
  FILE: "File",
  URL: "URL",
  WEBPAGE: "Webpage",
  TEXT: "Text",
};

export interface KnowledgeSourceCardProps {
  source: KnowledgeSource;
}

export function KnowledgeSourceCard({ source }: KnowledgeSourceCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{source.name}</CardTitle>
          <CardDescription>
            {TYPE_LABEL[source.type]} &middot; Added{" "}
            {new Date(source.createdAt).toLocaleDateString()}
          </CardDescription>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[source.status]}>{source.status}</Badge>
      </CardHeader>
    </Card>
  );
}
