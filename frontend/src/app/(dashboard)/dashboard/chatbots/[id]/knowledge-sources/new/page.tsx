"use client";

import { useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";
import { AddKnowledgeForm } from "@/features/knowledge-sources/components/AddKnowledgeForm";

export default function AddKnowledgePage() {
  const { chatbot } = useChatbotDetail();

  if (!chatbot) {
    return null;
  }

  return <AddKnowledgeForm chatbotId={chatbot.id} />;
}
