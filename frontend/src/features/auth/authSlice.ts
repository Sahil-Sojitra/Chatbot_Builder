import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import type { AuthUser } from "@/types/auth";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /**
   * In-memory only — never written to localStorage/sessionStorage/cookies/
   * IndexedDB. Lost on refresh by design; the refresh token (an HttpOnly
   * cookie the backend controls) is what re-establishes a session, not this.
   */
  accessToken: string | null;
}

/**
 * Starts at "loading", not "idle" — this app always attempts session
 * hydration on startup (see components/AuthGate.tsx), so there is no real
 * steady-state "idle" moment for the app's auth state. Starting at "loading"
 * means a consumer never has to treat "idle" as a third kind of "not sure
 * yet" state; only "loading" means that.
 */
const initialState: AuthState = {
  status: "loading",
  user: null,
  accessToken: null,
};

export interface SetCredentialsPayload {
  user: AuthUser;
  accessToken: string;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Call after a successful login/register/refresh/me response. */
    setCredentials: (state, action: PayloadAction<SetCredentialsPayload>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = "authenticated";
    },
    /** Call after logout, or when a refresh attempt fails and the session can't be re-established. */
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = "unauthenticated";
    },
    /** Call while an initial session check (e.g. a silent refresh on app load) is in flight. */
    setAuthLoading: (state) => {
      state.status = "loading";
    },
    /**
     * Call after a bare token refresh (no new user data) — e.g. the
     * transparent refresh-and-retry that follows a 401 on an authenticated
     * request. Only updates the token; the existing user is left as-is.
     */
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      if (state.user) {
        state.status = "authenticated";
      }
    },
  },
});

export const { setCredentials, clearAuth, setAuthLoading, setAccessToken } =
  authSlice.actions;
export default authSlice.reducer;
