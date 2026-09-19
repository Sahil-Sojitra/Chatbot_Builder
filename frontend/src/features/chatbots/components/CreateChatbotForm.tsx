"use client";

import { useRouter } from "next/navigation";
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
  Select,
  Textarea,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";
import { chatbotsApi } from "@/lib/api/chatbots";
import type { CreateChatbotInput } from "@/lib/api/chatbots";

interface FormFields {
  name: string;
  description: string;
  systemPrompt: string;
  temperature: string;
  maxTokens: string;
}

interface FieldErrors {
  name?: string;
  description?: string;
  systemPrompt?: string;
  temperature?: string;
  maxTokens?: string;
}

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
const SYSTEM_PROMPT_MAX_LENGTH = 8000;
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;
const MAX_TOKENS_MAX = 32000;

/** Mirrors the backend's createChatbotSchema (backend/src/modules/chatbots/chatbot.validation.ts) exactly — same bounds, no invented rules. */
function validate(fields: FormFields): FieldErrors {
  const errors: FieldErrors = {};

  const trimmedName = fields.name.trim();
  if (!trimmedName) {
    errors.name = "Name is required.";
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if (fields.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (fields.systemPrompt.trim().length > SYSTEM_PROMPT_MAX_LENGTH) {
    errors.systemPrompt = `System prompt must be at most ${SYSTEM_PROMPT_MAX_LENGTH} characters.`;
  }

  if (fields.temperature.trim() !== "") {
    const value = Number(fields.temperature);
    if (Number.isNaN(value) || value < TEMPERATURE_MIN || value > TEMPERATURE_MAX) {
      errors.temperature = `Temperature must be between ${TEMPERATURE_MIN} and ${TEMPERATURE_MAX}.`;
    }
  }

  if (fields.maxTokens.trim() !== "") {
    const value = Number(fields.maxTokens);
    if (!Number.isInteger(value) || value <= 0 || value > MAX_TOKENS_MAX) {
      errors.maxTokens = `Max tokens must be a whole number between 1 and ${MAX_TOKENS_MAX}.`;
    }
  }

  return errors;
}

export function CreateChatbotForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState("");
  const [maxTokens, setMaxTokens] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validate({ name, description, systemPrompt, temperature, maxTokens });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload: CreateChatbotInput = { name: name.trim() };
    if (description.trim()) {
      payload.description = description.trim();
    }
    if (systemPrompt.trim()) {
      payload.systemPrompt = systemPrompt.trim();
    }
    if (temperature.trim() !== "") {
      payload.temperature = Number(temperature);
    }
    if (maxTokens.trim() !== "") {
      payload.maxTokens = Number(maxTokens);
    }
    // provider/model are intentionally never sent — see the Select fields
    // below and their explanatory note.

    try {
      await chatbotsApi.create(payload);
      router.push("/dashboard/chatbots");
    } catch (err) {
      setIsSubmitting(false);
      setFormError(
        err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Create a chatbot</CardTitle>
        <CardDescription>
          Set up the basics now — you can change these later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          aria-busy={isSubmitting}
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          {formError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/20 bg-red-50 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chatbot-name">Name</Label>
            <Input
              id="chatbot-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "chatbot-name-error" : undefined}
            />
            {fieldErrors.name ? (
              <p id="chatbot-name-error" role="alert" className="text-sm text-destructive">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chatbot-description">Description</Label>
            <Input
              id="chatbot-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
              placeholder="Optional"
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? "chatbot-description-error" : undefined}
            />
            {fieldErrors.description ? (
              <p id="chatbot-description-error" role="alert" className="text-sm text-destructive">
                {fieldErrors.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chatbot-system-prompt">System prompt</Label>
            <Textarea
              id="chatbot-system-prompt"
              rows={4}
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              disabled={isSubmitting}
              placeholder="Optional — instructions the chatbot will follow"
              aria-invalid={Boolean(fieldErrors.systemPrompt)}
              aria-describedby={
                fieldErrors.systemPrompt ? "chatbot-system-prompt-error" : undefined
              }
            />
            {fieldErrors.systemPrompt ? (
              <p
                id="chatbot-system-prompt-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {fieldErrors.systemPrompt}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chatbot-provider">Provider</Label>
              <Select id="chatbot-provider" disabled defaultValue="">
                <option value="">Not connected yet</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chatbot-model">Model</Label>
              <Select id="chatbot-model" disabled defaultValue="">
                <option value="">Select a provider first</option>
              </Select>
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            No AI provider is connected yet, so provider and model aren&apos;t selectable — the
            chatbot will still be created, ready to configure once a real integration exists.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chatbot-temperature">Temperature</Label>
              <Input
                id="chatbot-temperature"
                type="number"
                step="0.1"
                min={TEMPERATURE_MIN}
                max={TEMPERATURE_MAX}
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
                disabled={isSubmitting}
                placeholder="Optional"
                aria-invalid={Boolean(fieldErrors.temperature)}
                aria-describedby={
                  fieldErrors.temperature ? "chatbot-temperature-error" : undefined
                }
              />
              {fieldErrors.temperature ? (
                <p
                  id="chatbot-temperature-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {fieldErrors.temperature}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chatbot-max-tokens">Max tokens</Label>
              <Input
                id="chatbot-max-tokens"
                type="number"
                step="1"
                min={1}
                max={MAX_TOKENS_MAX}
                value={maxTokens}
                onChange={(event) => setMaxTokens(event.target.value)}
                disabled={isSubmitting}
                placeholder="Optional"
                aria-invalid={Boolean(fieldErrors.maxTokens)}
                aria-describedby={fieldErrors.maxTokens ? "chatbot-max-tokens-error" : undefined}
              />
              {fieldErrors.maxTokens ? (
                <p id="chatbot-max-tokens-error" role="alert" className="text-sm text-destructive">
                  {fieldErrors.maxTokens}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Creating…" : "Create Chatbot"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => router.push("/dashboard/chatbots")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
