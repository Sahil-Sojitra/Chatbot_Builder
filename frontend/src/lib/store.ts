import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/features/auth/authSlice";
import organizationReducer from "@/features/organizations/organizationSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      organization: organizationReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

/**
 * A single store instance, created exactly once at module evaluation time —
 * deliberately NOT inside a React component/hook.
 *
 * This app never dispatches real user-specific data during server
 * rendering (Redux state is always the same neutral default on the server;
 * all real population happens client-side, after hydration, from "use
 * client" effects), so one shared instance carries no cross-request
 * data-leak risk here.
 *
 * This also fixes a real bug: creating the store inside `StoreProvider`'s
 * `useState(() => makeStore())` meant React Strict Mode's dev-only double
 * invocation of that lazy initializer silently created TWO store instances.
 * Whichever one ended up wired into React's <Provider> (what components
 * like AuthGate actually subscribe to) was not reliably the same one a
 * "last registered wins" imperative getter returned — so a successful
 * `hydrateSession()` could dispatch to a store nothing was listening to,
 * leaving the UI stuck. A single module-level instance makes that
 * divergence impossible: there is only ever one store, period.
 */
export const store = makeStore();

/** Lets the API layer (src/lib/api/**) read/dispatch outside of React, where hooks aren't available. */
export const getStore = (): AppStore => store;
