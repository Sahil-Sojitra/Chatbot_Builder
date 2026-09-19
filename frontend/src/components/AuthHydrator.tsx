"use client";

import { useEffect } from "react";

import { hydrateSession } from "@/lib/api/auth";

/**
 * Module-level (not component state) so it survives React Strict Mode's
 * dev-only double-invoke of effects — the second invocation sees it already
 * `true` and skips, so hydrateSession() runs exactly once per app load.
 */
let hydrationStarted = false;

/**
 * Mounted once at the root layout, for every route. Fires session hydration
 * in the background on the very first client render and renders nothing —
 * unlike `AuthGate` (which blocks the dashboard until status is known), this
 * never withholds rendering, which is what lets public pages (`/`, `/login`,
 * `/register`) paint immediately instead of waiting on `/api/v1/auth/refresh`.
 * Routes that care about the resulting status (AuthGate, RedirectIfAuthenticated)
 * simply read it reactively from Redux once it resolves.
 */
export function AuthHydrator() {
  useEffect(() => {
    if (hydrationStarted) {
      return;
    }
    hydrationStarted = true;
    void hydrateSession();
  }, []);

  return null;
}
