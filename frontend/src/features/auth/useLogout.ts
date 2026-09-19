"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { authApi } from "@/lib/api/auth";
import { resetOrganization } from "@/features/organizations/organizationSlice";
import { useAppDispatch } from "@/lib/hooks";

import { clearAuth } from "./authSlice";

/**
 * Shared logout orchestration so no dashboard component has to re-implement
 * it: call the backend, then unconditionally clear local auth AND
 * organization state and navigate to /login — even if the backend call
 * fails, the user must never be left looking authenticated in the UI while
 * their session is actually gone. Organization state is reset too so a
 * different user logging in afterwards never briefly sees the previous
 * user's organization. Never touches the refresh cookie directly; only the
 * backend's own Set-Cookie response (from POST /api/v1/auth/logout) can
 * clear it.
 */
export function useLogout() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Ignored deliberately — local state is cleared below regardless.
    } finally {
      dispatch(clearAuth());
      dispatch(resetOrganization());
      router.push("/login");
    }
  }, [dispatch, router]);

  return { logout, isLoggingOut };
}
