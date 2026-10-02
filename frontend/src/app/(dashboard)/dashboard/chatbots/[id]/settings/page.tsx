"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";
import { chatbotsApi } from "@/lib/api/chatbots";
import { ApiRequestError } from "@/lib/api/client";
import type { UpdateChatbotInput } from "@/lib/api/chatbots";

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
const SYSTEM_PROMPT_MAX_LENGTH = 8000;
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;
const MAX_TOKENS_MAX = 32000;

const PROVIDER_OPTIONS = [
  { value: "", label: "Select AI Provider (Optional)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google Gemini" },
  { value: "groq", label: "Groq" },
  { value: "custom", label: "Custom Provider" },
];

export default function ChatbotSettingsPage() {
  const { chatbot, setChatbot } = useChatbotDetail();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [ragEnabled, setRagEnabled] = useState(false);
  const [ragTopK, setRagTopK] = useState("");
  const [ragSimilarityThreshold, setRagSimilarityThreshold] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync form state when chatbot loads or updates
  useEffect(() => {
    if (chatbot) {
      setName(chatbot.name ?? "");
      setDescription(chatbot.description ?? "");
      setSystemPrompt(chatbot.systemPrompt ?? "");
      setProvider(chatbot.provider ?? "");
      setModel(chatbot.model ?? "");
      setTemperature(chatbot.temperature !== null ? String(chatbot.temperature) : "");
      setMaxTokens(chatbot.maxTokens !== null ? String(chatbot.maxTokens) : "");
      setRagEnabled(chatbot.ragEnabled ?? false);
      setRagTopK(chatbot.ragTopK !== null ? String(chatbot.ragTopK) : "");
      setRagSimilarityThreshold(
        chatbot.ragSimilarityThreshold !== null ? String(chatbot.ragSimilarityThreshold) : "",
      );
    }
  }, [chatbot]);

  if (!chatbot) {
    return null;
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Chatbot name is required.");
      return;
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setFormError(`Name must be at most ${NAME_MAX_LENGTH} characters.`);
      return;
    }

    if (description.trim().length > DESCRIPTION_MAX_LENGTH) {
      setFormError(`Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    if (systemPrompt.trim().length > SYSTEM_PROMPT_MAX_LENGTH) {
      setFormError(`System prompt must be at most ${SYSTEM_PROMPT_MAX_LENGTH} characters.`);
      return;
    }

    if (temperature.trim() !== "") {
      const val = Number(temperature);
      if (Number.isNaN(val) || val < TEMPERATURE_MIN || val > TEMPERATURE_MAX) {
        setFormError(`Temperature must be between ${TEMPERATURE_MIN} and ${TEMPERATURE_MAX}.`);
        return;
      }
    }

    if (maxTokens.trim() !== "") {
      const val = Number(maxTokens);
      if (!Number.isInteger(val) || val <= 0 || val > MAX_TOKENS_MAX) {
        setFormError(`Max tokens must be a positive integer up to ${MAX_TOKENS_MAX}.`);
        return;
      }
    }

    if (ragTopK.trim() !== "") {
      const val = Number(ragTopK);
      if (!Number.isInteger(val) || val <= 0 || val > 100) {
        setFormError("RAG Top K must be an integer between 1 and 100.");
        return;
      }
    }

    if (ragSimilarityThreshold.trim() !== "") {
      const val = Number(ragSimilarityThreshold);
      if (Number.isNaN(val) || val < 0 || val > 1) {
        setFormError("RAG Similarity Threshold must be a number between 0 and 1.");
        return;
      }
    }

    setIsSubmitting(true);

    const payload: UpdateChatbotInput = {
      name: trimmedName,
      description: description.trim() || undefined,
      systemPrompt: systemPrompt.trim() || undefined,
      provider: provider.trim() || undefined,
      model: model.trim() || undefined,
      temperature: temperature.trim() !== "" ? Number(temperature) : undefined,
      maxTokens: maxTokens.trim() !== "" ? Number(maxTokens) : undefined,
      ragEnabled,
      ragTopK: ragTopK.trim() !== "" ? Number(ragTopK) : undefined,
      ragSimilarityThreshold:
        ragSimilarityThreshold.trim() !== "" ? Number(ragSimilarityThreshold) : undefined,
    };

    try {
      const response = await chatbotsApi.update(chatbot.id, payload);
      setChatbot(response.chatbot);
      setSuccessMessage("Chatbot settings updated successfully.");
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : "Failed to update chatbot settings.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async () => {
    setIsPublishing(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      if (chatbot.status === "ACTIVE") {
        const response = await chatbotsApi.unpublish(chatbot.id);
        setChatbot(response.chatbot);
        setSuccessMessage("Chatbot unpublished (status set to PAUSED).");
      } else {
        const response = await chatbotsApi.publish(chatbot.id);
        setChatbot(response.chatbot);
        setSuccessMessage("Chatbot published successfully (status set to ACTIVE).");
      }
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError
          ? err.message
          : `Failed to ${chatbot.status === "ACTIVE" ? "unpublish" : "publish"} chatbot.`,
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Lifecycle Banner & Actions */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Chatbot Lifecycle</CardTitle>
              <Badge
                variant={
                  chatbot.status === "ACTIVE"
                    ? "success"
                    : chatbot.status === "PAUSED"
                      ? "warning"
                      : "default"
                }
              >
                {chatbot.status}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              {chatbot.status === "ACTIVE"
                ? `Published and live for users. Last published on ${
                    chatbot.publishedAt
                      ? new Date(chatbot.publishedAt).toLocaleDateString()
                      : "recently"
                  }.`
                : chatbot.status === "PAUSED"
                  ? "Chatbot is paused and won't respond to incoming widget requests."
                  : "Chatbot is currently a draft and has not been published yet."}
            </CardDescription>
          </div>
          <div>
            <Button
              type="button"
              variant={chatbot.status === "ACTIVE" ? "secondary" : "default"}
              disabled={isPublishing}
              onClick={() => void handleTogglePublish()}
            >
              {isPublishing
                ? "Updating…"
                : chatbot.status === "ACTIVE"
                  ? "Pause (Unpublish)"
                  : "Publish Chatbot"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Settings Form */}
      <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-6">
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/20 bg-red-50 p-3 text-sm text-destructive"
          >
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            className="rounded-md border border-emerald-500/20 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {successMessage}
          </div>
        ) : null}

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Name, description, and core instructions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-name">Name</Label>
              <Input
                id="setting-name"
                value={name}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Chatbot name"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-description">Description</Label>
              <Input
                id="setting-description"
                value={description}
                maxLength={DESCRIPTION_MAX_LENGTH}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Short description of this chatbot's purpose"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-prompt">System Prompt</Label>
              <Textarea
                id="setting-prompt"
                rows={5}
                value={systemPrompt}
                maxLength={SYSTEM_PROMPT_MAX_LENGTH}
                onChange={(e) => setSystemPrompt(e.target.value)}
                disabled={isSubmitting}
                placeholder="System instructions guiding how this bot behaves and responds"
              />
              <span className="text-right text-xs text-muted-foreground">
                {systemPrompt.length} / {SYSTEM_PROMPT_MAX_LENGTH}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Model & Provider Settings */}
        <Card>
          <CardHeader>
            <CardTitle>AI Model Configuration</CardTitle>
            <CardDescription>Configure the underlying LLM provider and generation parameters.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setting-provider">Provider</Label>
                <Select
                  id="setting-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  disabled={isSubmitting}
                >
                  {PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setting-model">Model Name</Label>
                <Input
                  id="setting-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet, gemini-1.5-pro"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setting-temperature">Temperature (0 to 2)</Label>
                <Input
                  id="setting-temperature"
                  type="number"
                  step="0.05"
                  min={TEMPERATURE_MIN}
                  max={TEMPERATURE_MAX}
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 0.7"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setting-max-tokens">Max Tokens</Label>
                <Input
                  id="setting-max-tokens"
                  type="number"
                  step="1"
                  min={1}
                  max={MAX_TOKENS_MAX}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 2048"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retrieval-Augmented Generation (RAG) Settings */}
        <Card>
          <CardHeader>
            <CardTitle>RAG (Knowledge Retrieval) Configuration</CardTitle>
            <CardDescription>
              Control whether this chatbot retrieves context from linked knowledge sources.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ragEnabled}
                onChange={(e) => setRagEnabled(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">
                Enable RAG knowledge retrieval for this chatbot
              </span>
            </label>

            {ragEnabled ? (
              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 border-t border-border">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setting-rag-topk">Top K Chunks</Label>
                  <Input
                    id="setting-rag-topk"
                    type="number"
                    min={1}
                    max={100}
                    value={ragTopK}
                    onChange={(e) => setRagTopK(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. 5"
                  />
                  <span className="text-xs text-muted-foreground">
                    Number of most relevant knowledge snippets retrieved per prompt.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setting-rag-threshold">Similarity Threshold (0.0 to 1.0)</Label>
                  <Input
                    id="setting-rag-threshold"
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={ragSimilarityThreshold}
                    onChange={(e) => setRagSimilarityThreshold(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. 0.7"
                  />
                  <span className="text-xs text-muted-foreground">
                    Minimum cosine similarity required for a snippet to be included.
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
