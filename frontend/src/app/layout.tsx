import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { AuthHydrator } from "@/components/AuthHydrator";
import { StoreProvider } from "@/components/StoreProvider";
import { ThemeProvider } from "@/features/theme/ThemeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chatbot Studio | Production AI Agent Platform",
  description: "Build, configure, and publish AI chatbots for your organization with instant website ingestion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground transition-colors duration-150">
        <StoreProvider>
          <AuthHydrator />
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
