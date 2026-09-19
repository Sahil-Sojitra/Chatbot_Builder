"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { Spinner } from "@/components/ui";
import { useAppSelector } from "@/lib/hooks";

/**
 * Guards the dashboard route group: blocks rendering while auth status is
 * still being established, renders the dashboard once `authenticated`, and
 * redirects to `/login` once `unauthenticated`. Session hydration itself is
 * triggered globally by `AuthHydrator` (mounted in the root layout) — this
 * component only reacts to the resulting Redux state, it never calls
 * `hydrateSession()` itself.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAppSelector((state) => state.auth.status);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "authenticated") {
    return children;
  }

  // "loading" / "idle" (still determining) and "unauthenticated" (redirect
  // is in flight) all render the same neutral placeholder — dashboard
  // content must never flash before we're certain the user belongs here.
  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner label={status === "unauthenticated" ? "Redirecting…" : "Loading…"} />
    </div>
  );
}
