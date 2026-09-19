"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { knowledgeSourcesApi } from "@/lib/api/knowledgeSources";
import type { KnowledgeSource } from "@/types/knowledgeSource";

export type KnowledgeSourcesStatus = "loading" | "loaded" | "error";

export function useKnowledgeSources(chatbotId: string) {
  const [status, setStatus] = useState<KnowledgeSourcesStatus>("loading");
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    knowledgeSourcesApi.list(chatbotId).then(
      (result) => {
        if (!cancelled) {
          setKnowledgeSources(result.knowledgeSources);
          setStatus("loaded");
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
    };
  }, [chatbotId, reloadToken]);

  const refetch = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  return { status, knowledgeSources, error, refetch };
}
