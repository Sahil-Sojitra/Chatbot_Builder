"use client";

import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
} from "@/components/ui";
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

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface KnowledgeSourceCardProps {
  source: KnowledgeSource;
}

export function KnowledgeSourceCard({ source }: KnowledgeSourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(source.sourceText ?? "");
  const [draftContent, setDraftContent] = useState(source.sourceText ?? "");
  const [isModified, setIsModified] = useState(false);

  const hasContent = Boolean(content && content.trim().length > 0);
  const isProcessing = source.status === "PENDING" || source.status === "PROCESSING";

  const handleStartEdit = () => {
    setDraftContent(content);
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleSave = () => {
    setContent(draftContent);
    setIsEditing(false);
    setIsModified(true);
  };

  const handleCancel = () => {
    setDraftContent(content);
    setIsEditing(false);
  };

  return (
    <Card className="transition-all hover:border-border/80">
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{source.name}</CardTitle>
            {isModified ? (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                Modified
              </Badge>
            ) : null}
          </div>
          <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{TYPE_LABEL[source.type]}</span>
            <span>&middot;</span>
            <span>Added {new Date(source.createdAt).toLocaleDateString()}</span>
            {source.sourceUrl ? (
              <>
                <span>&middot;</span>
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-primary hover:underline max-w-[200px] sm:max-w-xs"
                >
                  {source.sourceUrl}
                </a>
              </>
            ) : null}
            {source.sizeBytes ? (
              <>
                <span>&middot;</span>
                <span>{formatBytes(source.sizeBytes)}</span>
              </>
            ) : null}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Badge variant={STATUS_BADGE_VARIANT[source.status]}>{source.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isProcessing ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-secondary/20 px-3 py-2.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span>Processing and acquiring content in background…</span>
          </div>
        ) : hasContent ? (
          <div className="flex flex-col gap-2">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Edit Extracted Content</span>
                  <span className="text-xs text-muted-foreground">
                    {draftContent.length.toLocaleString()} characters
                  </span>
                </div>
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={8}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="Extracted text content…"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div
                  className={`rounded-md border border-border/60 bg-secondary/30 p-3 font-mono text-xs text-foreground/90 leading-relaxed ${
                    isExpanded
                      ? "max-h-96 overflow-y-auto whitespace-pre-wrap"
                      : "line-clamp-3 whitespace-pre-line"
                  }`}
                >
                  {content}
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {content.length.toLocaleString()} characters
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setIsExpanded(!isExpanded)}
                    >
                      {isExpanded ? "Collapse" : "Expand"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleStartEdit}
                    >
                      Edit Content
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : source.status === "READY" ? (
          <div className="rounded-md border border-border/40 bg-secondary/10 px-3 py-2 text-xs text-muted-foreground">
            No extracted text content available.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
