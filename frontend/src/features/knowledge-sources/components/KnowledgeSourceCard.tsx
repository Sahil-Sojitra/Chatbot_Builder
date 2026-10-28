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
  Input,
  Textarea,
} from "@/components/ui";
import { knowledgeSourcesApi } from "@/lib/api/knowledgeSources";
import { ApiRequestError } from "@/lib/api/client";
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
  onDeleted?: (sourceId: string) => void;
  onUpdated?: (updated: KnowledgeSource) => void;
}

export function KnowledgeSourceCard({
  source,
  onDeleted,
  onUpdated,
}: KnowledgeSourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(source.name);
  const [draftName, setDraftName] = useState(source.name);
  const [content, setContent] = useState(source.sourceText ?? "");
  const [draftContent, setDraftContent] = useState(source.sourceText ?? "");
  const [isModified, setIsModified] = useState(false);

  // Async states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const hasContent = Boolean(content && content.trim().length > 0);
  const isProcessing = source.status === "PENDING" || source.status === "PROCESSING";

  const handleStartEdit = () => {
    setCardError(null);
    setDraftName(name);
    setDraftContent(content);
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleCancelEdit = () => {
    setCardError(null);
    setDraftName(name);
    setDraftContent(content);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setCardError(null);
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setCardError("Source title/name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await knowledgeSourcesApi.update(
        source.chatbotId,
        source.id,
        {
          name: trimmedName,
          sourceText: draftContent,
        },
      );

      setName(response.knowledgeSource.name);
      setContent(response.knowledgeSource.sourceText ?? draftContent);
      setIsEditing(false);
      setIsModified(true);
      onUpdated?.(response.knowledgeSource);
    } catch (err: unknown) {
      setCardError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to update knowledge source.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setCardError(null);
    setIsDeleting(true);
    try {
      await knowledgeSourcesApi.delete(source.chatbotId, source.id);
      setIsConfirmingDelete(false);
      onDeleted?.(source.id);
    } catch (err: unknown) {
      setCardError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to delete knowledge source.",
      );
      setIsDeleting(false);
    }
  };

  const handleResync = async () => {
    if (isResyncing) return;
    setIsResyncing(true);
    setCardError(null);
    try {
      if ((source.type === "URL" || source.type === "WEBPAGE") && source.sourceUrl) {
        const response = await knowledgeSourcesApi.create(source.chatbotId, {
          type: "URL",
          name: source.name,
          sourceUrl: source.sourceUrl,
        });
        onUpdated?.(response.knowledgeSource);
      } else {
        const response = await knowledgeSourcesApi.retry(source.chatbotId, source.id);
        onUpdated?.(response.knowledgeSource);
      }
    } catch (err: unknown) {
      setCardError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to re-sync knowledge source.",
      );
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <Card className="rounded-[22px] border border-zinc-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111218]/90 dark:shadow-xl backdrop-blur-md transition-all duration-200 hover:border-zinc-300 dark:hover:border-white/20">
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-3">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Document Type Icon */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-zinc-300">
            {source.type === "FILE" ? (
              <svg className="size-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            ) : source.type === "URL" || source.type === "WEBPAGE" ? (
              <svg className="size-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            ) : (
              <svg className="size-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex flex-col gap-1.5 max-w-md">
                <span className="text-[11px] font-mono uppercase text-zinc-400">Source Name</span>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  disabled={isSaving}
                  className="rounded-full bg-white border border-zinc-200 text-zinc-900 dark:bg-white/[0.03] dark:border-white/[0.1] dark:text-white h-8 text-xs font-mono px-3"
                  placeholder="Knowledge source name…"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-semibold text-zinc-900 dark:text-white font-sans">{name}</CardTitle>
                {isModified ? (
                  <Badge variant="warning" className="text-[9px] px-2 py-0.2 rounded-full font-mono">
                    MODIFIED
                  </Badge>
                ) : null}
              </div>
            )}

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
                    className="truncate text-emerald-600 dark:text-emerald-400 hover:underline max-w-[200px] sm:max-w-xs"
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

        {/* Actions & Status Badge */}
        <div className="flex items-center gap-2 self-start">
          <Badge variant={STATUS_BADGE_VARIANT[source.status]} className="rounded-full">
            {source.status === "PROCESSING" ? (
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            ) : source.status === "READY" ? (
              <span className="size-1.5 rounded-full bg-emerald-600 anim-live-pulse" />
            ) : null}
            {source.status}
          </Badge>

          {!isEditing && !isConfirmingDelete && (((source.type === "URL" || source.type === "WEBPAGE") && source.sourceUrl) || source.status === "FAILED") ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-7 px-3 text-xs border-zinc-200 bg-zinc-50 hover:border-emerald-500/60 hover:bg-emerald-500/15 text-zinc-700 hover:text-zinc-950 dark:border-white/[0.1] dark:bg-white/[0.03] dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10 dark:text-zinc-300 dark:hover:text-white font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              onClick={() => void handleResync()}
              disabled={isResyncing || source.status === "PROCESSING"}
              title={source.status === "FAILED" ? "Retry processing this knowledge source" : "Re-crawl and update with latest website content"}
            >
              <svg
                className={`w-3 h-3 text-emerald-600 dark:text-emerald-400 ${isResyncing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              <span>{isResyncing ? "SYNCING…" : source.status === "FAILED" ? "RETRY" : "RE-SYNC"}</span>
            </Button>
          ) : null}

          {!isEditing && !isConfirmingDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full h-7 px-3 text-xs text-zinc-400 hover:text-rose-400 font-mono"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isDeleting}
              title="Delete source"
            >
              DELETE
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Error message */}
        {cardError ? (
          <div className="mb-3 rounded-[16px] border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono flex items-center justify-between">
            <span>[ERROR]: {cardError}</span>
            <button
              type="button"
              onClick={() => setCardError(null)}
              className="text-rose-400 hover:text-rose-200 ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        ) : null}

        {/* Inline Delete Confirmation */}
        {isConfirmingDelete ? (
          <div className="rounded-[18px] border border-rose-500/30 bg-rose-950/20 p-3.5 mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <span className="text-xs text-rose-200 font-mono">
              Are you sure you want to delete &ldquo;{name}&rdquo;? This cannot be undone.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full h-7 px-3 text-xs font-mono"
                disabled={isDeleting}
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full h-7 px-3 text-xs font-mono"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
              >
                {isDeleting ? "Deleting…" : "Confirm Delete"}
              </Button>
            </div>
          </div>
        ) : null}

        {isProcessing ? (
          <div className="flex items-center gap-2 rounded-[16px] border border-dashed border-amber-500/40 bg-amber-950/20 px-3.5 py-2.5 text-xs text-amber-300 font-mono">
            <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
            <span>[WORKER]: INGESTING AND VECTORIZING DOCUMENT...</span>
          </div>
        ) : isEditing ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Edit Source Content & Metadata</span>
              <span className="text-xs text-zinc-500 font-mono">
                {draftContent.length.toLocaleString()} characters
              </span>
            </div>
            <Textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={8}
              disabled={isSaving}
              className="rounded-[18px] bg-white border border-zinc-200 text-zinc-900 dark:bg-white/[0.03] dark:border-white/[0.1] dark:text-white font-mono text-xs leading-relaxed p-4"
              placeholder="Source text content…"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={isSaving}
                onClick={handleCancelEdit}
                className="rounded-full px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => void handleSave()}
                className="btn-volt rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-5"
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : hasContent ? (
          <div className="flex flex-col gap-2">
            <div
              className={`rounded-[18px] border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-white/[0.08] dark:bg-black/40 dark:text-zinc-300 p-4 font-mono text-xs leading-relaxed ${
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
                  className="rounded-full h-6 px-3 text-[11px] font-mono text-zinc-400 hover:text-white"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? "COLLAPSE" : "EXPAND"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full h-6 px-3 text-[11px] font-mono"
                  onClick={handleStartEdit}
                >
                  EDIT
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-[18px] border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/[0.08] dark:bg-black/40 px-4 py-3 font-mono text-xs">
            <span>NO_TEXT_EXTRACTED</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full h-6 px-3 text-[11px] font-mono"
              onClick={handleStartEdit}
            >
              EDIT
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
