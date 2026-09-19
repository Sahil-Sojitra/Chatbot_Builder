"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { chatbotsApi } from "@/lib/api/chatbots";
import type { Chatbot } from "@/types/chatbot";

export type ChatbotDetailStatus = "loading" | "loaded" | "error";

/** Fetches a single chatbot by id via the existing GET /api/v1/chatbots/:id. */
export function useChatbot(chatbotId: string) {
  const [status, setStatus] = useState<ChatbotDetailStatus>("loading");
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    chatbotsApi.get(chatbotId).then(
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
  }, [chatbotId, reloadToken]);

  const refetch = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  return { status, chatbot, error, refetch };
}
