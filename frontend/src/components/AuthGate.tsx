"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { Spinner } from "@/components/ui";
import { hydrateSession } from "@/lib/api/auth";
import { useAppSelector } from "@/lib/hooks";

/**
 * Module-level (not component state) so it survives React Strict Mode's
 * intentional dev-only double-invoke of effects — the second invocation
 * sees it already `true` and skips, so hydrateSession() runs exactly once
 * per real app load, not once per effect invocation.
 */
let hydrationStarted = false;

/**
 * Triggers session hydration once on client mount and withholds rendering
 * the app until the resulting auth status is known. This is what prevents
 * any route (public or protected) from making an authentication decision —
 * or rendering auth-dependent UI — while hydration is still in flight: no
 * page's code even runs until `status` has left "loading"/"idle".
 *
 * Runs only on the client: the hydration call lives inside `useEffect`,
 * which React never executes during SSR or RSC rendering.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (hydrationStarted) {
      return;
    }
    hydrationStarted = true;
    void hydrateSession();
  }, []);

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Loading…" />
      </div>
    );
  }

  return children;
}
