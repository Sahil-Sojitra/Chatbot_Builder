"use client";

import { useEffect } from "react";

import { clearAuth } from "@/features/auth/authSlice";
import { hydrateSession } from "@/lib/api/auth";
import { getStore } from "@/lib/store";

/**
 * Module-level (not component state) so it survives React Strict Mode's
 * dev-only double-invoke of effects — the second invocation sees it already
 * `true` and skips, so hydrateSession() runs exactly once per app load.
 */
let hydrationStarted = false;

/**
 * Mounted once at the root layout, for every route.
 * If the user has never logged in (no client-side 'has_session' hint),
 * hydration is skipped entirely to prevent invalid /api/v1/auth/refresh calls
 * on public landing and marketing pages.
 */
export function AuthHydrator() {
  useEffect(() => {
    if (hydrationStarted) {
      return;
    }
    hydrationStarted = true;

    // Fast client-side preflight: If the visitor has no session hint,
    // they are an unauthenticated guest. Mark as unauthenticated immediately
    // without issuing any refresh request to the API.
    const hasSessionHint = typeof window !== "undefined" && Boolean(localStorage.getItem("has_session"));
    if (!hasSessionHint) {
      getStore().dispatch(clearAuth());
      return;
    }

    void hydrateSession();
  }, []);

  return null;
}
