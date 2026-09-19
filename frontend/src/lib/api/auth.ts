import { clearAuth, setAuthLoading, setCredentials } from "@/features/auth/authSlice";
import { getStore } from "@/lib/store";
import type { AuthUser } from "@/types/auth";

import { apiRequest, rawRequest } from "./client";

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

/**
 * Thin wrappers over the backend's auth endpoints. Public endpoints
 * (login/register/refresh) use `rawRequest` directly — they have no access
 * token yet, and a failure there should never trigger a refresh-retry.
 * `logout`/`me` require an access token, so they go through `apiRequest`,
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
};

/**
 * Re-establishes a session on app load using only the HttpOnly refresh
 * cookie — no token is ever read from client-side storage. Populates Redux
 * with the user + access token on success, or leaves auth state
 * unauthenticated on failure. Does not redirect; callers decide what to do
 * with the resulting state.
 *
 * Uses `rawRequest` for both steps rather than `authApi.me()`/`apiRequest`:
 * this is a one-shot check, so it deliberately doesn't participate in the
 * general 401-refresh-retry loop (which would be redundant here — we just
 * refreshed) and manually attaches the freshly-obtained token instead.
 */
export async function hydrateSession(): Promise<void> {
  const store = getStore();
  store.dispatch(setAuthLoading());

  try {
    const { accessToken } = await rawRequest<RefreshResponse>(
      "/api/v1/auth/refresh",
      { method: "POST" },
    );

    const { user } = await rawRequest<MeResponse>("/api/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    store.dispatch(setCredentials({ user, accessToken }));
  } catch {
    store.dispatch(clearAuth());
  }
}
