import type { ReactNode } from "react";

import { AuthGate } from "@/components/AuthGate";
import { DashboardNav } from "@/components/layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="flex flex-1 flex-col">
        <DashboardNav />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
