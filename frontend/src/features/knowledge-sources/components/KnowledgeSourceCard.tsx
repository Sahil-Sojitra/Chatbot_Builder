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
  FILE: "File Document",
  URL: "Web URL",
  WEBPAGE: "Webpage",
  TEXT: "Raw Text",
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
    <Card className="transition-all duration-200 hover:border-white/15">
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Document Type Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-zinc-800 bg-zinc-900 text-zinc-300">
            {source.type === "FILE" ? (
              <svg className="h-4.5 w-4.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            ) : source.type === "URL" || source.type === "WEBPAGE" ? (
              <svg className="h-4.5 w-4.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            ) : (
              <svg className="h-4.5 w-4.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold text-zinc-100 font-mono">{source.name}</CardTitle>
              {isModified ? (
                <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-mono">
                  MODIFIED
                </Badge>
              ) : null}
            </div>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono">
              <span className="font-medium text-zinc-400">{TYPE_LABEL[source.type]}</span>
              <span>&middot;</span>
              <span>{new Date(source.createdAt).toLocaleDateString()}</span>
              {source.sourceUrl ? (
                <>
                  <span>&middot;</span>
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-zinc-400 hover:text-zinc-100 hover:underline max-w-[200px] sm:max-w-xs"
                  >
                    {source.sourceUrl}
                  </a>
                </>
              ) : null}
              {source.sizeBytes ? (
                <>
                  <span>&middot;</span>
                  <span className="text-zinc-500">{formatBytes(source.sizeBytes)}</span>
                </>
              ) : null}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          <Badge variant={STATUS_BADGE_VARIANT[source.status]}>
            {source.status === "PROCESSING" ? (
              <span className="h-1 w-1 rounded-[1px] bg-amber-400 animate-pulse" />
            ) : source.status === "READY" ? (
              <span className="h-1 w-1 rounded-[1px] bg-emerald-400" />
            ) : null}
            {source.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isProcessing ? (
          <div className="flex items-center gap-2 rounded-[3px] border border-dashed border-amber-800/80 bg-amber-950/20 px-3 py-2 text-xs text-amber-300 font-mono">
            <span className="h-1.5 w-1.5 animate-pulse rounded-[1px] bg-amber-400" />
            <span>[WORKER]: INGESTING AND VECTORIZING DOCUMENT...</span>
          </div>
        ) : hasContent ? (
          <div className="flex flex-col gap-2">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">Edit Extracted Content</span>
                  <span className="text-xs text-zinc-500">
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
                  className={`rounded-[3px] border border-zinc-800 bg-[#09090c] p-3 font-mono text-xs text-zinc-300 leading-relaxed ${
                    isExpanded
                      ? "max-h-96 overflow-y-auto whitespace-pre-wrap"
                      : "line-clamp-3 whitespace-pre-line"
                  }`}
                >
                  {content}
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-mono text-[10px] text-zinc-500">
                    {content.length.toLocaleString()} CHARS INDEXED
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] font-mono text-zinc-400 hover:text-white"
                      onClick={() => setIsExpanded(!isExpanded)}
                    >
                      {isExpanded ? "COLLAPSE" : "EXPAND"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-6 text-[11px] font-mono"
                      onClick={handleStartEdit}
                    >
                      EDIT
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : source.status === "READY" ? (
          <div className="rounded-[3px] border border-zinc-800 bg-[#09090c] px-3.5 py-2.5 font-mono text-xs text-zinc-500">
            NO_TEXT_EXTRACTED
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
