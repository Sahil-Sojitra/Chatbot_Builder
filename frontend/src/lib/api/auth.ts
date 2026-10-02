import { clearAuth, setAuthLoading, setCredentials } from "@/features/auth/authSlice";
import { getStore } from "@/lib/store";
import type { AuthUser } from "@/types/auth";

import { apiRequest, performRefresh, rawRequest } from "./client";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface RegisterResponse {
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  user: AuthUser;
}

export interface UpdateMeInput {
  name?: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Thin wrappers over the backend's auth endpoints. Public endpoints
 * (login/register/refresh) use `rawRequest` directly — they have no access
 * token yet, and a failure there should never trigger a refresh-retry.
 * `logout`/`me`/`updateMe`/`changePassword` require an access token, so they go through `apiRequest`,
 * which attaches it and transparently refreshes-and-retries on a 401.
 */
export const authApi = {
  login: (input: LoginInput): Promise<LoginResponse> =>
    rawRequest<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: input,
    }),

  register: (input: RegisterInput): Promise<RegisterResponse> =>
    rawRequest<RegisterResponse>("/api/v1/auth/register", {
      method: "POST",
      body: input,
    }),

  refresh: (): Promise<RefreshResponse> =>
    rawRequest<RefreshResponse>("/api/v1/auth/refresh", { method: "POST" }),

  logout: (): Promise<{ message: string }> =>
    apiRequest<{ message: string }>("/api/v1/auth/logout", { method: "POST" }),

  me: (): Promise<MeResponse> => apiRequest<MeResponse>("/api/v1/me"),

  updateMe: (input: UpdateMeInput): Promise<MeResponse> =>
    apiRequest<MeResponse>("/api/v1/me", {
      method: "PATCH",
      body: input,
    }),

  changePassword: (input: ChangePasswordInput): Promise<{ message: string }> =>
    apiRequest<{ message: string }>("/api/v1/me/change-password", {
      method: "POST",
      body: input,
    }),
};

/**
 * Re-establishes a session on app load using only the HttpOnly refresh
 * cookie — no token is ever read from client-side storage. Populates Redux
 * with the user + access token on success, or leaves auth state
 * unauthenticated on failure. Does not redirect; callers decide what to do
 * with the resulting state.
 *
 * Uses `performRefresh()` to share the in-flight deduplication promise with
 * any concurrent API requests, and guards against clobbering newer user actions
 * (such as a fast login or logout during hydration).
 */
export async function hydrateSession(): Promise<void> {
  const store = getStore();

  if (store.getState().auth.status === "authenticated") {
    return;
  }

  store.dispatch(setAuthLoading());

  try {
    const accessToken = await performRefresh();
    if (!accessToken) {
      return;
    }

    const currentState = store.getState().auth;
    if (
      currentState.status === "unauthenticated" ||
      (currentState.status === "authenticated" && currentState.user)
    ) {
      return;
    }

    const { user } = await rawRequest<MeResponse>("/api/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const finalState = store.getState().auth;
    if (
      finalState.status !== "unauthenticated" &&
      (finalState.accessToken === accessToken || finalState.status === "loading")
    ) {
      store.dispatch(setCredentials({ user, accessToken }));
    }
  } catch {
    const stateAfterError = store.getState().auth;
    if (stateAfterError.status === "loading") {
      store.dispatch(clearAuth());
    }
  }
}
