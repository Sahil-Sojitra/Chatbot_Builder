import { useState } from "react";
import type { FormEvent } from "react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";

interface InstantBotUrlFormProps {
  initialUrl?: string;
  isSubmitting?: boolean;
  onSubmit: (url: string, simulateFailure?: boolean) => void;
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
  isSubmitting = false,
  onSubmit,
  onBack,
}: InstantBotUrlFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUrlChange = (newVal: string) => {
    setUrl(newVal);
    if (touched) {
      const res = validateHttpUrl(newVal);
      setValidationError(res.isValid ? null : res.error || null);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const res = validateHttpUrl(url);
    setValidationError(res.isValid ? null : res.error || null);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setTouched(true);
    const res = validateHttpUrl(url);
    if (!res.isValid) {
      setValidationError(res.error || "Invalid URL.");
      return;
    }

    setValidationError(null);
    onSubmit(url.trim(), simulateFailure);
  };

  const isFormValid = url.trim().length > 0 && !validationError;

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
          Enter your company or documentation website URL. Our platform will crawl your public pages,
          extract readable content, build an AI knowledge base, and configure your chatbot automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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
                onBlur={handleBlur}
                disabled={isSubmitting}
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? "url-error" : "url-description"}
                className={`bg-zinc-950/80 border-zinc-800 text-white placeholder:text-zinc-500 font-mono text-sm ${
                  validationError ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""
                }`}
                autoFocus
              />
            </div>
            {validationError ? (
              <p id="url-error" role="alert" className="text-xs text-rose-400 flex items-center gap-1.5 mt-0.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {validationError}
              </p>
            ) : (
              <p id="url-description" className="text-xs text-zinc-500">
                Must be an accessible HTTP or HTTPS website (e.g., https://yourbrand.com or https://docs.yourbrand.com).
              </p>
            )}
          </div>

          {/* Development / Demo failure switch (helps verify failure state as required by acceptance criteria) */}
          <div className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-300 font-medium">Test Failure Flow (Mock Mode)</span>
              <span className="text-zinc-500 text-[11px]">
                Simulate a crawling error to test the recovery and retry screen.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="sr-only peer"
                disabled={isSubmitting}
              />
              <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

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
