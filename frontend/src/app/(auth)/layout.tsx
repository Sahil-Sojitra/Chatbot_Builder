import type { ReactNode } from "react";

import { RedirectIfAuthenticated } from "@/components/RedirectIfAuthenticated";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <RedirectIfAuthenticated>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </RedirectIfAuthenticated>
  );
}
