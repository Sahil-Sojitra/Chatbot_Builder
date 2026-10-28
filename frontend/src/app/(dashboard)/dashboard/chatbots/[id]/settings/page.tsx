"use client";

import { useRouter } from "next/navigation";
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
  CustomSelect,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { useChatbotDetail } from "@/features/chatbots/ChatbotDetailProvider";
import { LLM_PROVIDERS, LLM_MODELS_BY_PROVIDER } from "@/features/chatbots/llmCatalog";
import { chatbotsApi } from "@/lib/api/chatbots";
import { ApiRequestError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { UpdateChatbotInput } from "@/lib/api/chatbots";
import Link from "next/link";

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
const SYSTEM_PROMPT_MAX_LENGTH = 8000;
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;
const MAX_TOKENS_MAX = 32000;

export default function ChatbotSettingsPage() {
  const router = useRouter();
  const { chatbot, setChatbot, status } = useChatbotDetail();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [temperature, setTemperature] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [ragEnabled, setRagEnabled] = useState(false);
  const [ragTopK, setRagTopK] = useState("");
  const [ragSimilarityThreshold, setRagSimilarityThreshold] = useState("");

  // Session message rate limit: "unlimited" vs "custom"
  const [sessionLimitType, setSessionLimitType] = useState<"unlimited" | "custom">("unlimited");
  const [sessionCustomLimit, setSessionCustomLimit] = useState<string>("10");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deletion states
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      if (chatbot.sessionMessageLimit && chatbot.sessionMessageLimit > 0) {
        setSessionLimitType("custom");
        setSessionCustomLimit(String(chatbot.sessionMessageLimit));
      } else {
        setSessionLimitType("unlimited");
        setSessionCustomLimit("10");
      }
      setRagEnabled(chatbot.ragEnabled ?? false);
      setRagTopK(chatbot.ragTopK !== null ? String(chatbot.ragTopK) : "");
      setRagSimilarityThreshold(
        chatbot.ragSimilarityThreshold !== null ? String(chatbot.ragSimilarityThreshold) : "",
      );
    }
  }, [chatbot]);

  if (status === "loading" || !chatbot) {
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

    let resolvedSessionLimit: number | null = null;
    if (sessionLimitType === "custom") {
      const parsed = Number(sessionCustomLimit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
        setFormError("Custom session message limit must be an integer between 1 and 1000.");
        return;
      }
      resolvedSessionLimit = parsed;
    }

    setIsSubmitting(true);

    const payload: UpdateChatbotInput = {
      name: trimmedName,
      description: description.trim() || undefined,
      systemPrompt: systemPrompt.trim() || undefined,
      provider: provider.trim() || undefined,
      model: model.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
      temperature: temperature.trim() !== "" ? Number(temperature) : undefined,
      maxTokens: maxTokens.trim() !== "" ? Number(maxTokens) : undefined,
      sessionMessageLimit: resolvedSessionLimit,
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

  const handleDeleteChatbot = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await chatbotsApi.delete(chatbot.id);
      router.push("/dashboard/chatbots");
    } catch (err) {
      setDeleteError(
        err instanceof ApiRequestError ? err.message : "Failed to delete chatbot.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Breadcrumb & Return Link */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Link
            href={`/dashboard/chatbots/${chatbot.id}`}
            className="text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1 font-sans text-xs"
          >
            ← Back to Chatbot Overview
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-200 font-medium font-sans">Settings</span>
        </div>
        <span className="text-xs text-zinc-500 font-mono">ID: {chatbot.publicId}</span>
      </div>

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
            className="rounded-md border border-red-500/30 bg-red-950/40 p-3 text-sm font-medium text-red-300"
          >
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm font-medium text-emerald-300"
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
                <CustomSelect
                  id="setting-provider"
                  value={provider}
                  onChange={(val) => {
                    setProvider(val);
                    const defaultM = LLM_PROVIDERS.find((p) => p.value === val)?.defaultModel || LLM_MODELS_BY_PROVIDER[val]?.[0]?.value || "";
                    setModel(defaultM);
                  }}
                  disabled={isSubmitting}
                  options={LLM_PROVIDERS.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setting-model">Model Name</Label>
                <CustomSelect
                  id="setting-model"
                  value={model}
                  onChange={(val) => setModel(val)}
                  disabled={isSubmitting}
                  options={LLM_MODELS_BY_PROVIDER[provider] || []}
                />
              </div>
            </div>

            {/* API Key Field */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="setting-api-key">LLM Provider API Key</Label>
                {chatbot.hasApiKey && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Key configured & encrypted
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="setting-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={
                    chatbot.hasApiKey
                      ? "Enter new API key to update existing key..."
                      : "Paste your API key here..."
                  }
                  className="pr-16 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer select-none"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to keep your existing key. Your key is stored securely and never shown in plain text.
              </p>
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

        {/* Chat Usage & Session Rate Limits */}
        <Card className="border-zinc-800 bg-zinc-950/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg">Chat Usage & Session Rate Limits</CardTitle>
              <Badge variant="outline" className="border-violet-500/30 text-violet-300 bg-violet-500/10 text-xs">
                Cost Control
              </Badge>
            </div>
            <CardDescription>
              Control your LLM API spending by setting how many questions a public visitor can ask in a single chat session.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Unlimited */}
              <button
                type="button"
                onClick={() => setSessionLimitType("unlimited")}
                className={cn(
                  "flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  sessionLimitType === "unlimited"
                    ? "border-violet-500 bg-violet-950/20 shadow-sm shadow-violet-500/10 ring-1 ring-violet-500/40"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-[#0c0c10] dark:hover:border-zinc-700 dark:hover:bg-[#111116]",
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Unlimited Messages</span>
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      sessionLimitType === "unlimited" ? "border-violet-500 bg-violet-500" : "border-zinc-600",
                    )}
                  >
                    {sessionLimitType === "unlimited" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  No restrictions. Public visitors can ask unlimited questions per conversation.
                </p>
              </button>

              {/* Option 2: Custom Limit */}
              <button
                type="button"
                onClick={() => setSessionLimitType("custom")}
                className={cn(
                  "flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  sessionLimitType === "custom"
                    ? "border-violet-500 bg-violet-950/20 shadow-sm shadow-violet-500/10 ring-1 ring-violet-500/40"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-[#0c0c10] dark:hover:border-zinc-700 dark:hover:bg-[#111116]",
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Custom Limit</span>
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      sessionLimitType === "custom" ? "border-violet-500 bg-violet-500" : "border-zinc-600",
                    )}
                  >
                    {sessionLimitType === "custom" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Caps questions per session to protect your API usage and quota.
                </p>
              </button>
            </div>

            {/* If Custom Limit selected, show number input & quick presets */}
            {sessionLimitType === "custom" && (
              <div className="flex flex-col gap-2 pt-2 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800/80 dark:bg-[#09090d]">
                <Label htmlFor="setting-session-limit" className="text-xs text-zinc-300">
                  Maximum Messages Per Session
                </Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id="setting-session-limit"
                    type="number"
                    min="1"
                    max="1000"
                    value={sessionCustomLimit}
                    onChange={(e) => setSessionCustomLimit(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. 10"
                    className="w-28 font-mono text-sm"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span>Quick presets:</span>
                    {[5, 10, 20, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSessionCustomLimit(String(preset))}
                        className={cn(
                          "px-2.5 py-1 rounded text-xs border font-mono transition-colors cursor-pointer",
                          sessionCustomLimit === String(preset)
                            ? "bg-violet-600 text-white border-violet-500"
                            : "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white",
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Once a visitor reaches this limit, chat input will pause with a notice prompting them to refresh or start a new chat.
                </p>
              </div>
            )}
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

      {/* Danger Zone: Chatbot Deletion */}
      <Card className="border-red-900/50 bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
          <CardDescription className="text-zinc-400">
            Permanently delete this assistant, including all attached knowledge sources, uploaded files, and vector index chunks. This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteError ? (
            <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300 font-mono">
              [ERROR]: {deleteError}
            </div>
          ) : null}

          {showDeleteConfirm ? (
            <div className="rounded-md border border-red-800/80 bg-red-950/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-200">
                  Are you absolutely sure you want to delete &ldquo;{chatbot.name}&rdquo;?
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  All knowledge sources and chat history will be purged permanently.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => void handleDeleteChatbot()}
                >
                  {isDeleting ? "Deleting…" : "Yes, Delete Chatbot"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete this chatbot
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
