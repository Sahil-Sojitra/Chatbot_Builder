"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";

import { makeStore, registerStore } from "@/lib/store";

export function StoreProvider({ children }: { children: ReactNode }) {
  // Lazy initializer runs exactly once per mount — this is how a value is
  // created a single time without touching a ref during render.
  const [store] = useState(() => {
    const newStore = makeStore();
    registerStore(newStore);
    return newStore;
  });

  return <Provider store={store}>{children}</Provider>;
}
