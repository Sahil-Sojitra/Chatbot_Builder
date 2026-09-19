import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/features/auth/authSlice";

/**
 * One store instance per request/tab, created lazily by the Provider
 * (see components/StoreProvider.tsx) rather than as a module-level
 * singleton — a singleton would leak state across requests in SSR and
 * across users on the server.
 */
export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
