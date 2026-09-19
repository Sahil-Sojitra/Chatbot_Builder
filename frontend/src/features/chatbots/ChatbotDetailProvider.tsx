"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { useChatbot } from "./useChatbot";

type ChatbotDetailValue = ReturnType<typeof useChatbot>;

const ChatbotDetailContext = createContext<ChatbotDetailValue | null>(null);

export interface ChatbotDetailProviderProps {
  chatbotId: string;
  children: ReactNode;
}

/**
 * Fetches the chatbot once per id and shares it with every nested route
 * (Overview, Knowledge Sources, Settings) via context, so switching tabs
 * never re-fetches — only navigating to a different chatbot id does.
 */
export function ChatbotDetailProvider({ chatbotId, children }: ChatbotDetailProviderProps) {
  const value = useChatbot(chatbotId);
  return (
    <ChatbotDetailContext.Provider value={value}>{children}</ChatbotDetailContext.Provider>
  );
}

export function useChatbotDetail(): ChatbotDetailValue {
  const context = useContext(ChatbotDetailContext);
  if (!context) {
    throw new Error("useChatbotDetail must be used within a ChatbotDetailProvider");
  }
  return context;
}
