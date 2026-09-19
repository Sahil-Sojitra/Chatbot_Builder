"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { chatbotsApi } from "@/lib/api/chatbots";
import type { Chatbot } from "@/types/chatbot";

export type ChatbotsStatus = "loading" | "loaded" | "error";

/**
 * `enabled` gates the actual fetch — callers should pass whether the
 * organization is confirmed loaded, so this never fires (and never
 * surfaces a confusing ORGANIZATION_NOT_FOUND error) while that's still
 * being established. Mirrors the cancellable-effect pattern in
 * features/invitations/useInvitations.ts — no setState call happens
 * synchronously in the effect body itself (only inside the resolved
 * promise's callbacks), which is what keeps this compatible with this
 * project's stricter React Compiler lint rule.
 */
export function useChatbots(enabled: boolean) {
  const [status, setStatus] = useState<ChatbotsStatus>("loading");
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    chatbotsApi.list().then(
      (result) => {
        if (!cancelled) {
          setChatbots(result.chatbots);
          setStatus("loaded");
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : "Failed to load chatbots.");
          setStatus("error");
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  // Safe to reset synchronously here — runs from a user event handler (a
  // retry button click), never from inside an effect.
  const refetch = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  return { status, chatbots, error, refetch };
}
