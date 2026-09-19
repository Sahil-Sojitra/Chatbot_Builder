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

/**
 * The API layer (src/lib/api/**) is plain TS with no access to React
 * context, so it needs an imperative way to read the current access token
 * and dispatch auth actions outside of components. `StoreProvider` registers
 * the one store instance it creates here; nothing else should call this.
 */
let browserStore: AppStore | undefined;

export const registerStore = (store: AppStore): void => {
  browserStore = store;
};

export const getStore = (): AppStore => {
  if (!browserStore) {
    throw new Error(
      "Redux store accessed before StoreProvider mounted. This API can only be used client-side, after the app has rendered.",
    );
  }
  return browserStore;
};
