"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ChatbotCreationChooser } from "./ChatbotCreationChooser";
import { CreateChatbotForm } from "./CreateChatbotForm";
import { InstantBotUrlForm } from "./InstantBotUrlForm";
import { InstantBotProgress } from "./InstantBotProgress";
import { InstantBotSuccess } from "./InstantBotSuccess";
import { InstantBotFailure } from "./InstantBotFailure";

import {
  InstantBotService,
  createInitialStages,
  deriveBotNameFromUrl,
} from "../instantBotService";
import type {
  InstantBotResult,
  InstantBotStage,
  InstantBotStatus,
} from "../instantBotTypes";

type FlowView =
  | "chooser" // Entry point: Choose Instant Bot vs Custom Bot
  | "instant-url" // Screen 1: Enter Website URL
  | "instant-processing" // Screen 2: Bot Creation and Processing Status
  | "instant-success" // Screen 3: Successful Setup
  | "instant-failure" // Screen 4: Failure State
  | "custom-form"; // Custom Bot manual creation flow

export function ChatbotCreationFlow() {
  const router = useRouter();

  // Active view
  const [currentView, setCurrentView] = useState<FlowView>("chooser");

  // Instant bot state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [botName, setBotName] = useState("");
  const [stages, setStages] = useState<InstantBotStage[]>(createInitialStages());
  const [processingStatus, setProcessingStatus] = useState<InstantBotStatus>("creating");
  const [instantResult, setInstantResult] = useState<InstantBotResult | null>(null);
  const [failureError, setFailureError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdChatbot, setCreatedChatbot] = useState<{
    id: string;
    publicId: string;
    name: string;
  } | null>(null);

  // Keep a reference to the active service instance so it can be cancelled if the user leaves
  const serviceRef = useRef<InstantBotService | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup running request on unmount
      if (serviceRef.current) {
        serviceRef.current.cancel();
      }
    };
  }, []);

  const handleStartInstant = () => {
    setCurrentView("instant-url");
  };

  const handleStartCustom = () => {
    setCurrentView("custom-form");
  };

  const handleUrlSubmit = async (url: string, forceNew = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const isDifferentUrl =
      Boolean(websiteUrl) &&
      url.trim().toLowerCase() !== websiteUrl.trim().toLowerCase();
    const shouldResetBot = forceNew || isDifferentUrl;

    const botToReuse = shouldResetBot ? null : createdChatbot;
    if (shouldResetBot) {
      setCreatedChatbot(null);
    }

    setWebsiteUrl(url);
    const derived = botToReuse ? botToReuse.name : deriveBotNameFromUrl(url);
    setBotName(derived);
    setStages(createInitialStages());
    setProcessingStatus(botToReuse ? "processing" : "creating");
    setFailureError(null);
    setCurrentView("instant-processing");

    const service = new InstantBotService();
    serviceRef.current = service;

    try {
      const result = await service.runSetup({
        websiteUrl: url,
        existingChatbot: botToReuse ?? undefined,
        onChatbotCreated: (bot) => {
          setCreatedChatbot(bot);
        },
        onStatusChange: (status: InstantBotStatus) => setProcessingStatus(status),
        onStageUpdate: (updatedStages: InstantBotStage[]) => setStages(updatedStages),
      });
      setInstantResult(result);
      setCurrentView("instant-success");
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Cancelled") {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during website extraction.";
      setFailureError(message);
      setProcessingStatus("failed");
      setCurrentView("instant-failure");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (!websiteUrl) {
      setCurrentView("instant-url");
      return;
    }
    // Immediately display the progress page with active stages
    setFailureError(null);
    const initialStages = createInitialStages();
    if (createdChatbot) {
      initialStages[0].status = "completed";
      initialStages[1].status = "current";
    }
    setStages(initialStages);
    setProcessingStatus(createdChatbot ? "processing" : "creating");
    setCurrentView("instant-processing");

    // Retry with the preserved URL and preserved chatbot
    void handleUrlSubmit(websiteUrl, false);
  };

  const handleCancelProgress = () => {
    if (serviceRef.current) {
      serviceRef.current.cancel();
    }
    router.push("/dashboard/chatbots");
  };

  const handleReset = () => {
    setWebsiteUrl("");
    setBotName("");
    setCreatedChatbot(null);
    setStages(createInitialStages());
    setInstantResult(null);
    setFailureError(null);
    setIsSubmitting(false);
    setCurrentView("chooser");
  };

  return (
    <div className="w-full py-4">
      {/* 1. Chooser Entry Point */}
      {currentView === "chooser" && (
        <ChatbotCreationChooser
          onSelectInstant={handleStartInstant}
          onSelectCustom={handleStartCustom}
        />
      )}

      {/* 2. Instant Bot Screen 1: URL Form */}
      {currentView === "instant-url" && (
        <InstantBotUrlForm
          initialUrl={websiteUrl}
          isSubmitting={isSubmitting}
          onSubmit={(url) => void handleUrlSubmit(url)}
          onBack={() => setCurrentView("chooser")}
        />
      )}

      {/* 3. Instant Bot Screen 2: Processing Status */}
      {currentView === "instant-processing" && (
        <InstantBotProgress
          websiteUrl={websiteUrl}
          chatbotName={botName}
          status={processingStatus}
          stages={stages}
          onCancel={handleCancelProgress}
        />
      )}

      {/* 4. Instant Bot Screen 3: Success */}
      {currentView === "instant-success" && instantResult && (
        <InstantBotSuccess
          result={instantResult}
          onReset={handleReset}
        />
      )}

      {/* 5. Instant Bot Screen 4: Failure State */}
      {currentView === "instant-failure" && (
        <InstantBotFailure
          websiteUrl={websiteUrl}
          errorMessage={failureError ?? undefined}
          isRetrying={isSubmitting}
          onRetry={handleRetry}
          onEditUrl={() => setCurrentView("instant-url")}
        />
      )}

      {/* 6. Custom Bot Flow: Reusing the existing manual CreateChatbotForm */}
      {currentView === "custom-form" && (
        <div className="flex flex-col gap-4 max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentView("chooser")}
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
            >
              ← Back to chatbot options
            </button>
            <span className="text-[11px] font-mono text-zinc-500 uppercase">
              Custom Bot Flow
            </span>
          </div>
          <CreateChatbotForm />
        </div>
      )}
    </div>
  );
}
