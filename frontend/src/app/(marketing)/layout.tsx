import type { ReactNode } from "react";

import { Footer, Navbar } from "@/components/layout";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
