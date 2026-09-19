import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col px-6 py-8">{children}</main>;
}
