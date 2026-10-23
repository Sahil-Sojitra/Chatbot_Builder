"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { chatbotsApi } from "@/lib/api/chatbots";
import type { Chatbot } from "@/types/chatbot";

export type ChatbotDetailStatus = "loading" | "loaded" | "error";

/** Fetches a single chatbot by id via the existing GET /api/v1/chatbots/:id. */
export function useChatbot(chatbotId?: string | null) {
  const trimmedId = chatbotId?.trim() || "";
  const [status, setStatus] = useState<ChatbotDetailStatus>(() =>
    trimmedId ? "loading" : "loaded",
  );
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!trimmedId) {
      setStatus("loaded");
      setChatbot(null);
      setError(null);
      return;
    }

    setStatus("loading");
    let cancelled = false;

    chatbotsApi.get(trimmedId).then(
      (result) => {
        if (!cancelled) {
          setChatbot(result.chatbot);
          setStatus("loaded");
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : "Failed to load chatbot.");
          setStatus("error");
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [trimmedId, reloadToken]);

  const refetch = useCallback(() => {
    if (trimmedId) {
      setStatus("loading");
    }
    setError(null);
    setReloadToken((token) => token + 1);
  }, [trimmedId]);

  return { status, chatbot, error, refetch, setChatbot };
}
