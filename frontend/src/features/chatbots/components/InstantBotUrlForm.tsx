"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  Button,
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

  const [touchedUrl, setTouchedUrl] = useState(false);
  const [touchedKey, setTouchedKey] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const providerMeta = LLM_PROVIDERS.find((p) => p.value === newProvider);
    const defaultM = providerMeta?.defaultModel || LLM_MODELS_BY_PROVIDER[newProvider]?.[0]?.value || "";
    setModel(defaultM);
    // Clear key error if user changes provider
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
    });
  };

  const availableModels = LLM_MODELS_BY_PROVIDER[provider] || [];
  const selectedProviderMeta = LLM_PROVIDERS.find((p) => p.value === provider);
  const isFormValid = url.trim().length > 0 && !urlError && apiKey.trim().length > 0 && !apiKeyError;

  return (
    <Card className="max-w-xl mx-auto border-zinc-800 bg-[#0a0a0a]">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
            Instant Bot Flow
          </span>
          <span className="text-xs text-zinc-500">• Step 1 of 2</span>
        </div>
        <CardTitle className="text-xl text-white">Create your Instant Bot</CardTitle>
        <CardDescription className="text-zinc-400">
          Enter your website URL and select your preferred LLM provider. Our platform indexes your knowledge base, and uses your API key for client-side grounded answers.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* 1. Website URL Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="website-url" className="text-zinc-200 font-medium">
              Website URL <span className="text-rose-400">*</span>
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
                className={`bg-zinc-950/80 border-zinc-800 text-white placeholder:text-zinc-500 font-mono text-sm ${
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

          {/* 2. LLM Provider & Model Selection (Strict Dropdowns) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1 border-t border-zinc-800/60">
            {/* Provider Dropdown */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="llm-provider" className="text-zinc-200 font-medium">
                AI Provider <span className="text-rose-400">*</span>
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

            {/* Model Dropdown (Predefined Models Only - No Typo Risks) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="llm-model" className="text-zinc-200 font-medium">
                Model Name <span className="text-rose-400">*</span>
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
          <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <Label htmlFor="llm-api-key" className="text-zinc-200 font-medium">
                {selectedProviderMeta?.label || "Provider"} API Key <span className="text-rose-400">*</span>
              </Label>
              {selectedProviderMeta?.docsUrl && (
                <a
                  href={selectedProviderMeta.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-violet-400 hover:text-violet-300 hover:underline inline-flex items-center gap-1"
                >
                  Get API key &rarr;
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
                className={`bg-zinc-950/80 border-zinc-800 text-white placeholder:text-zinc-600 font-mono text-sm pr-12 ${
                  apiKeyError ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer select-none"
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

          {/* 4. Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer py-2 px-1"
            >
              ← Back to chatbot options
            </button>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full sm:w-auto bg-[#0052CC] hover:bg-[#0747A6] text-white border-0 shadow-sm font-medium"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    Initializing bot...
                  </span>
                ) : (
                  "Create Instant Bot"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
