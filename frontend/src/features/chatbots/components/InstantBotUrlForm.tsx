"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CustomSelect,
  Input,
  Label,
} from "@/components/ui";
import {
  LLM_PROVIDERS,
  LLM_MODELS_BY_PROVIDER,
} from "../llmCatalog";

export interface InstantBotFormData {
  url: string;
  provider: string;
  model: string;
  apiKey: string;
  sessionMessageLimit?: number | null;
}

interface InstantBotUrlFormProps {
  initialUrl?: string;
  initialProvider?: string;
  initialModel?: string;
  initialApiKey?: string;
  isSubmitting?: boolean;
  onSubmit: (data: InstantBotFormData) => void;
  onBack: () => void;
}

export function validateHttpUrl(value: string): { isValid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Please enter your website URL." };
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { isValid: false, error: "URL must start with http:// or https://" };
    }
    if (!url.hostname || !url.hostname.includes(".")) {
      return { isValid: false, error: "Please enter a valid domain (e.g. https://example.com)." };
    }
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: "Please enter a valid website URL (e.g. https://example.com).",
    };
  }
}

export function InstantBotUrlForm({
  initialUrl = "",
  initialProvider = "openai",
  initialModel = "gpt-4o-mini",
  initialApiKey = "",
  isSubmitting = false,
  onSubmit,
  onBack,
}: InstantBotUrlFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [provider, setProvider] = useState(initialProvider);
  const [model, setModel] = useState(initialModel);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [sessionLimitType, setSessionLimitType] = useState<"unlimited" | "custom">("unlimited");
  const [sessionCustomLimit, setSessionCustomLimit] = useState("10");

  const [touchedUrl, setTouchedUrl] = useState(false);
  const [touchedKey, setTouchedKey] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const providerMeta = LLM_PROVIDERS.find((p) => p.value === newProvider);
    const defaultM = providerMeta?.defaultModel || LLM_MODELS_BY_PROVIDER[newProvider]?.[0]?.value || "";
    setModel(defaultM);
    if (apiKeyError) setApiKeyError(null);
  };

  const handleUrlChange = (newVal: string) => {
    setUrl(newVal);
    if (touchedUrl) {
      const res = validateHttpUrl(newVal);
      setUrlError(res.isValid ? null : res.error || null);
    }
  };

  const handleUrlBlur = () => {
    setTouchedUrl(true);
    const res = validateHttpUrl(url);
    setUrlError(res.isValid ? null : res.error || null);
  };

  const handleKeyChange = (val: string) => {
    setApiKey(val);
    if (touchedKey) {
      setApiKeyError(val.trim() ? null : "API key is required to call your LLM account.");
    }
  };

  const handleKeyBlur = () => {
    setTouchedKey(true);
    if (!apiKey.trim()) {
      setApiKeyError("API key is required to call your LLM account.");
    } else {
      setApiKeyError(null);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setTouchedUrl(true);
    setTouchedKey(true);

    const urlRes = validateHttpUrl(url);
    if (!urlRes.isValid) {
      setUrlError(urlRes.error || "Invalid website URL.");
      return;
    }

    if (!apiKey.trim()) {
      setApiKeyError("Please enter your LLM provider API key.");
      return;
    }

    setUrlError(null);
    setApiKeyError(null);

    onSubmit({
      url: url.trim(),
      provider,
      model,
      apiKey: apiKey.trim(),
      sessionMessageLimit: sessionLimitType === "custom" ? (Number(sessionCustomLimit) || 10) : null,
    });
  };

  const availableModels = LLM_MODELS_BY_PROVIDER[provider] || [];
  const selectedProviderMeta = LLM_PROVIDERS.find((p) => p.value === provider);
  const isFormValid = url.trim().length > 0 && !urlError && apiKey.trim().length > 0 && !apiKeyError;

  return (
    <div className="relative max-w-xl mx-auto">
      {/* Studio Ambient Glow Backdrop */}
      <div className="absolute -top-16 -right-16 size-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 size-48 bg-[#7A4CFF]/15 rounded-full blur-3xl pointer-events-none" />

      <Card className="relative rounded-[26px] border border-zinc-200/80 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#111218]/90 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="size-1.5 rounded-full bg-emerald-600 anim-live-pulse" />
              Website Ingestion
            </span>
            <span className="text-xs text-zinc-400 font-mono">Automated Pipeline</span>
          </div>
          <CardTitle className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Create your Instant Bot
          </CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mt-1">
            Enter your website domain and choose your LLM provider. Our crawler indexes public pages into vector embeddings, using your provider API key for client-side grounded answers.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* 1. Website URL Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="website-url" className="text-zinc-700 dark:text-zinc-200 font-medium text-xs sm:text-sm">
                Website URL <span className="text-emerald-600 dark:text-emerald-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="website-url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onBlur={handleUrlBlur}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(urlError)}
                  aria-describedby={urlError ? "url-error" : "url-description"}
                  className={`rounded-full bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 dark:bg-white/[0.03] dark:border-white/[0.1] dark:text-white dark:placeholder:text-zinc-500 font-mono text-sm px-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 ${
                    urlError ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""
                  }`}
                  autoFocus
                />
              </div>
              {urlError ? (
                <p id="url-error" role="alert" className="text-xs text-rose-400 flex items-center gap-1.5 mt-0.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  {urlError}
                </p>
              ) : (
                <p id="url-description" className="text-xs text-zinc-500">
                  Must be an accessible HTTP or HTTPS website (e.g., https://yourbrand.com).
                </p>
              )}
            </div>

            {/* 2. LLM Provider & Model Selection */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-zinc-200 dark:border-white/[0.06]">
              {/* Provider Dropdown */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="llm-provider" className="text-zinc-700 dark:text-zinc-200 font-medium text-xs sm:text-sm">
                  AI Provider <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </Label>
                <CustomSelect
                  id="llm-provider"
                  value={provider}
                  onChange={handleProviderChange}
                  disabled={isSubmitting}
                  options={LLM_PROVIDERS.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                />
                <span className="text-[11px] text-zinc-500">
                  Select your LLM vendor account
                </span>
              </div>

              {/* Model Dropdown */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="llm-model" className="text-zinc-700 dark:text-zinc-200 font-medium text-xs sm:text-sm">
                  Model Name <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </Label>
                <CustomSelect
                  id="llm-model"
                  value={model}
                  onChange={(val) => setModel(val)}
                  disabled={isSubmitting}
                  options={availableModels}
                />
                <span className="text-[11px] text-zinc-500">
                  Predefined verified models
                </span>
              </div>
            </div>

            {/* 3. API Key Input */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <Label htmlFor="llm-api-key" className="text-zinc-700 dark:text-zinc-200 font-medium text-xs sm:text-sm">
                  {selectedProviderMeta?.label || "Provider"} API Key <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </Label>
                {selectedProviderMeta?.docsUrl && (
                  <a
                    href={selectedProviderMeta.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Get {selectedProviderMeta.label} Key</span>
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id="llm-api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder={selectedProviderMeta?.keyPlaceholder || "Paste your API key"}
                  value={apiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  onBlur={handleKeyBlur}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(apiKeyError)}
                  className={`rounded-full bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 dark:bg-white/[0.03] dark:border-white/[0.1] dark:text-white dark:placeholder:text-zinc-600 font-mono text-sm px-4 pr-16 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 ${
                    apiKeyError ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer select-none font-mono"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
              {apiKeyError ? (
                <p role="alert" className="text-xs text-rose-400 flex items-center gap-1.5 mt-0.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {apiKeyError}
                </p>
              ) : (
                <p className="text-[11px] text-zinc-500">
                  Your key is stored securely and used exclusively to generate answers directly with your account.
                </p>
              )}
            </div>

            {/* 4. Session Rate Limit (Cost Control) */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-zinc-200 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-700 dark:text-zinc-200 font-medium text-xs sm:text-sm">Session Rate Limiting</Label>
                <span className="text-[11px] text-zinc-400 font-mono">Cost Control</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSessionLimitType("unlimited")}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border text-xs text-left transition-all cursor-pointer ${
                    sessionLimitType === "unlimited"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-2xs dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-zinc-200 bg-zinc-50/70 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:bg-white/[0.02] dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-white"
                  }`}
                >
                  <span className="font-medium">Unlimited</span>
                  <span
                    className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${
                      sessionLimitType === "unlimited"
                        ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500"
                        : "border-zinc-300 dark:border-zinc-600 bg-transparent"
                    }`}
                  >
                    {sessionLimitType === "unlimited" && <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionLimitType("custom")}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border text-xs text-left transition-all cursor-pointer ${
                    sessionLimitType === "custom"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-2xs dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-zinc-200 bg-zinc-50/70 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:bg-white/[0.02] dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-white"
                  }`}
                >
                  <span className="font-medium">Custom Limit</span>
                  <span
                    className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${
                      sessionLimitType === "custom"
                        ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500"
                        : "border-zinc-300 dark:border-zinc-600 bg-transparent"
                    }`}
                  >
                    {sessionLimitType === "custom" && <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              </div>

              {sessionLimitType === "custom" && (
                <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/80 dark:border-white/10 dark:bg-white/[0.03]">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">Max messages:</span>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={sessionCustomLimit}
                    onChange={(e) => setSessionCustomLimit(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 w-24 text-xs font-mono font-bold bg-white border border-zinc-200 text-zinc-900 text-center rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-[#0E0F15] dark:border-white/10 dark:text-white"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] ml-auto">
                    {[5, 10, 20].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSessionCustomLimit(String(preset))}
                        className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold transition-all cursor-pointer ${
                          sessionCustomLimit === String(preset)
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:bg-white/[0.04] dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Action Buttons */}
            <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-200/90 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 shadow-2xs transition-all dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to options</span>
              </button>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`inline-flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm py-2.5 px-6 rounded-full transition-all ${
                    isFormValid && !isSubmitting
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed opacity-70"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-3.5 w-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                      </svg>
                      <span>Initializing bot...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span>Create Instant Bot</span>
                      <span className="text-sm">→</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
