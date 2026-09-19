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
  Textarea,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";
import { knowledgeSourcesApi } from "@/lib/api/knowledgeSources";
import { cn } from "@/lib/utils";

type SourceType = "FILE" | "URL" | "WEBPAGE" | "TEXT";

const TYPE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "URL", label: "URL" },
  { value: "WEBPAGE", label: "Webpage" },
  { value: "FILE", label: "File" },
];

const NAME_MAX_LENGTH = 120;

export interface AddKnowledgeFormProps {
  chatbotId: string;
}

/**
 * TEXT/URL/WEBPAGE go straight to the backend's real
 * POST /api/v1/knowledge-sources/:chatbotId. FILE is intentionally not
 * wired up: the backend's upload flow (POST .../upload for a presigned R2
 * URL, then a raw PUT, then POST .../upload/complete) is a multi-step
 * workflow this milestone was told not to fully implement — so FILE is
 * offered as a real, visible choice (per the requirement) but honestly
 * explains it isn't functional yet, rather than faking a working uploader.
 */
export function AddKnowledgeForm({ chatbotId }: AddKnowledgeFormProps) {
  const router = useRouter();
  const [type, setType] = useState<SourceType>("TEXT");

  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backToList = () => router.push(`/dashboard/chatbots/${chatbotId}/knowledge-sources`);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (type === "FILE") {
      return;
    }

    const trimmedName = name.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError("Name is required.");
      hasError = true;
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      setNameError(`Name must be at most ${NAME_MAX_LENGTH} characters.`);
      hasError = true;
    } else {
      setNameError(null);
    }

    if (type === "TEXT") {
      if (!sourceText.trim()) {
        setValueError("Text content is required.");
        hasError = true;
      } else {
        setValueError(null);
      }
    } else {
      const trimmedUrl = sourceUrl.trim();
      if (!trimmedUrl) {
        setValueError("A URL is required.");
        hasError = true;
      } else {
        try {
          new URL(trimmedUrl);
          setValueError(null);
        } catch {
          setValueError("Enter a valid URL, including https://.");
          hasError = true;
        }
      }
    }

    if (hasError) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (type === "TEXT") {
        await knowledgeSourcesApi.create(chatbotId, {
          type: "TEXT",
          name: trimmedName,
          sourceText: sourceText.trim(),
        });
      } else {
        await knowledgeSourcesApi.create(chatbotId, {
          type,
          name: trimmedName,
          sourceUrl: sourceUrl.trim(),
        });
      }
      backToList();
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
        <CardTitle>Add Knowledge</CardTitle>
        <CardDescription>Choose a source type, then fill in its details.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Knowledge source type"
          className="mb-4 flex flex-wrap gap-2"
        >
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={type === option.value}
              onClick={() => setType(option.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                type === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {type === "FILE" ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium text-foreground">
              File upload isn&apos;t available in the UI yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The backend supports it, but the upload experience hasn&apos;t been built yet. Use
              Text, URL, or Webpage for now.
            </p>
            <Button type="button" variant="secondary" className="mt-4" onClick={backToList}>
              Back to Knowledge Sources
            </Button>
          </div>
        ) : (
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
              <Label htmlFor="knowledge-name">Name</Label>
              <Input
                id="knowledge-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "knowledge-name-error" : undefined}
              />
              {nameError ? (
                <p id="knowledge-name-error" role="alert" className="text-sm text-destructive">
                  {nameError}
                </p>
              ) : null}
            </div>

            {type === "TEXT" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="knowledge-text">Text content</Label>
                <Textarea
                  id="knowledge-text"
                  rows={6}
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(valueError)}
                  aria-describedby={valueError ? "knowledge-value-error" : undefined}
                />
                {valueError ? (
                  <p id="knowledge-value-error" role="alert" className="text-sm text-destructive">
                    {valueError}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="knowledge-url">{type === "WEBPAGE" ? "Webpage URL" : "URL"}</Label>
                <Input
                  id="knowledge-url"
                  type="url"
                  placeholder="https://example.com"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(valueError)}
                  aria-describedby={valueError ? "knowledge-value-error" : undefined}
                />
                {valueError ? (
                  <p id="knowledge-value-error" role="alert" className="text-sm text-destructive">
                    {valueError}
                  </p>
                ) : null}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Adding…" : "Add Knowledge"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={backToList}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
