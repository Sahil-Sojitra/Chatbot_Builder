import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { AuthHydrator } from "@/components/AuthHydrator";
import { StoreProvider } from "@/components/StoreProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chatbot Builder",
  description: "Build, configure, and publish AI chatbots for your organization.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <StoreProvider>
          <AuthHydrator />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
