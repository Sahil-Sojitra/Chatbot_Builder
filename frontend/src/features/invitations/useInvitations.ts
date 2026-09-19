"use client";

import { useCallback, useEffect, useState } from "react";

import { invitationsApi } from "@/lib/api/invitations";
import type { Invitation } from "@/types/invitation";

export type InvitationsStatus = "loading" | "loaded" | "error";

/**
 * Page-local data (only the Invitations page needs it), so this is a plain
 * hook rather than a Redux slice — unlike organization status, nothing else
 * in the app needs to read or react to this list.
 */
export function useInvitations() {
  const [status, setStatus] = useState<InvitationsStatus>("loading");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    invitationsApi.list().then(
      (result) => {
        if (!cancelled) {
          setInvitations(result);
          setStatus("loaded");
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load invitations.");
          setStatus("error");
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // Safe to reset to "loading" synchronously here — this runs from a user
  // event handler (a retry button click), never from inside an effect.
  const refetch = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  return { status, invitations, error, refetch };
}
