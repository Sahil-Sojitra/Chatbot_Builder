import type { ReactNode } from "react";

import { AuthGate } from "@/components/AuthGate";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </AuthGate>
  );
}
