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

const initialState: AuthState = {
  status: "idle",
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
  },
});

export const { setCredentials, clearAuth, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
