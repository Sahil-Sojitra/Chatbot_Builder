"use client";

import { useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";
import { useRequireCustomBot } from "@/features/chatbots/useRequireCustomBot";
import { AddKnowledgeForm } from "@/features/knowledge-sources/components/AddKnowledgeForm";

export default function AddKnowledgePage() {
  const { isAllowed, isLoading } = useRequireCustomBot();
  const { chatbot } = useChatbotDetail();

  if (isLoading || !isAllowed || !chatbot) {
    return null;
  }

  return <AddKnowledgeForm chatbotId={chatbot.id} />;
}
