import type { ReactNode } from "react";

import { AuthGate } from "@/components/AuthGate";
import { DashboardNav } from "@/components/layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="flex flex-1 flex-col min-h-screen bg-background studio-grid-bg selection:bg-indigo-500/20 selection:text-indigo-200">
        <DashboardNav />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
