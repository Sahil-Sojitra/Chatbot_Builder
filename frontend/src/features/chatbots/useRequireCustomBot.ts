"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatbotDetail } from "./ChatbotDetailProvider";

/**
 * Protects Custom-Bot-only routes (Settings, Knowledge Sources).
 * If the loaded chatbot has `creationMode === "INSTANT"`, redirects
 * to `/dashboard/chatbots/${chatbot.id}`.
 *
 * Guarantees that:
 * 1. It NEVER redirects while `status === "loading"`.
 * 2. It redirects only after chatbot details are loaded and confirmed to be "INSTANT".
 * 3. It allows "CUSTOM" and legacy chatbots (where creationMode is undefined/null).
 */
export function useRequireCustomBot() {
  const { status, chatbot } = useChatbotDetail();
  const router = useRouter();

  const isInstant = status === "loaded" && chatbot?.creationMode === "INSTANT";

  useEffect(() => {
    if (isInstant && chatbot) {
      router.replace(`/dashboard/chatbots/${chatbot.id}`);
    }
  }, [isInstant, chatbot, router]);

  return {
    isAllowed: status === "loaded" && !isInstant,
    isLoading: status === "loading",
    isInstant,
  };
}
