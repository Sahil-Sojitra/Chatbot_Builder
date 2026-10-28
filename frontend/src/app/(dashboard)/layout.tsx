import type { ReactNode } from "react";

import { AuthGate } from "@/components/AuthGate";
import { DashboardNav } from "@/components/layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="relative flex flex-1 flex-col min-h-screen bg-background text-foreground selection:bg-emerald-500/30 selection:text-emerald-950 dark:selection:text-emerald-200 transition-colors overflow-x-hidden">
        {/* Subtle creative botanical green ambient wash at the top of the dashboard */}
        <div className="absolute top-0 left-0 right-0 h-[460px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.08),rgba(5,150,105,0.02)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.14),rgba(5,150,105,0.05)_45%,transparent_75%)]" />

        <DashboardNav />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
