"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { knowledgeSourcesApi } from "@/lib/api/knowledgeSources";
import type { KnowledgeSource, KnowledgeSourceStatus } from "@/types/knowledgeSource";

export type KnowledgeSourcesStatus = "loading" | "loaded" | "error";

const POLLING_INTERVAL_MS = 2000;

const isProcessing = (status: KnowledgeSourceStatus): boolean =>
  status === "PENDING" || status === "PROCESSING";

const hasPendingOrProcessing = (sources: KnowledgeSource[]): boolean =>
  sources.some((source) => isProcessing(source.status));

export function useKnowledgeSources(chatbotId: string) {
  const [status, setStatus] = useState<KnowledgeSourcesStatus>("loading");
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const clearActiveTimer = () => {
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const schedulePoll = () => {
      clearActiveTimer();
      if (cancelled) return;

      pollTimer = setTimeout(async () => {
        if (cancelled) return;

        try {
          const result = await knowledgeSourcesApi.list(chatbotId);
          if (cancelled) return;

          setKnowledgeSources(result.knowledgeSources);

          if (hasPendingOrProcessing(result.knowledgeSources)) {
            schedulePoll();
          }
        } catch {
          // If polling fails (e.g. network disruption), stop polling to avoid tight error loops
          clearActiveTimer();
        }
      }, POLLING_INTERVAL_MS);
    };

    // Initial load
    knowledgeSourcesApi.list(chatbotId).then(
      (result) => {
        if (!cancelled) {
          setKnowledgeSources(result.knowledgeSources);
          setStatus("loaded");

          if (hasPendingOrProcessing(result.knowledgeSources)) {
            schedulePoll();
          }
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiRequestError ? err.message : "Failed to load knowledge sources.",
          );
          setStatus("error");
        }
      },
    );

    return () => {
      cancelled = true;
      clearActiveTimer();
    };
  }, [chatbotId, reloadToken]);

  const refetch = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  return { status, knowledgeSources, error, refetch };
}
