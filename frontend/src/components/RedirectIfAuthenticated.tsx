"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { useAppSelector } from "@/lib/hooks";

/**
 * Guards the public auth route group (`/login`, `/register`): if it turns
 * out the visitor is already authenticated — learned asynchronously, since
 * hydration runs in the background and these routes never wait on it —
 * redirect them to the dashboard. Unlike `AuthGate`, this never withholds
 * rendering: children render immediately regardless of status, since these
 * pages have nothing to protect and must not wait on `/api/v1/auth/refresh`.
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const status = useAppSelector((state) => state.auth.status);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return children;
}
