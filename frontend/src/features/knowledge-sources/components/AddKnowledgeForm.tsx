"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

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
const MAX_FILE_SIZE_BYTES = 26_214_400; // 25 MB

const SUPPORTED_FILE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "text/markdown",
] as const;

type SupportedMimeType = (typeof SUPPORTED_FILE_MIME_TYPES)[number];

const EXTENSION_TO_MIME: Record<string, SupportedMimeType> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  csv: "text/csv",
  md: "text/markdown",
  markdown: "text/markdown",
};

const resolveMimeType = (file: File): SupportedMimeType | null => {
  if (SUPPORTED_FILE_MIME_TYPES.includes(file.type as SupportedMimeType)) {
    return file.type as SupportedMimeType;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && extension in EXTENSION_TO_MIME) {
    return EXTENSION_TO_MIME[extension];
  }
  return null;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export interface AddKnowledgeFormProps {
  chatbotId: string;
}

export function AddKnowledgeForm({ chatbotId }: AddKnowledgeFormProps) {
  const router = useRouter();
  const [type, setType] = useState<SourceType>("TEXT");

  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [nameError, setNameError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const backToList = () => router.push(`/dashboard/chatbots/${chatbotId}/knowledge-sources`);

  const handleTypeChange = (newType: SourceType) => {
    setType(newType);
    setNameError(null);
    setValueError(null);
    setFileError(null);
    setFormError(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setFileError("File exceeds the maximum size limit of 25 MB.");
      return;
    }

    const mime = resolveMimeType(file);
    if (!mime) {
      setSelectedFile(null);
      setFileError(
        "Unsupported file type. Supported formats: PDF (.pdf), Word (.docx), Plain Text (.txt), CSV (.csv), Markdown (.md).",
      );
      return;
    }

    setSelectedFile(file);
    setFileError(null);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (type === "FILE") {
      if (!selectedFile) {
        setFileError("Please choose a file to upload.");
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setFileError("File exceeds the maximum size limit of 25 MB.");
        return;
      }

      const mimeType = resolveMimeType(selectedFile);
      if (!mimeType) {
        setFileError(
          "Unsupported file type. Supported formats: PDF (.pdf), Word (.docx), Plain Text (.txt), CSV (.csv), Markdown (.md).",
        );
        return;
      }

      setFormError(null);
      setFileError(null);
      setIsSubmitting(true);
      setUploadStatus("Initiating upload…");

      try {
        // Step 1: Request presigned upload URL from backend
        const { uploadId, uploadUrl } = await knowledgeSourcesApi.initiateUpload(
          chatbotId,
          {
            originalName: selectedFile.name,
            mimeType,
          },
        );

        // Step 2: Upload directly to object storage via PUT
        setUploadStatus("Uploading file to storage…");
        await knowledgeSourcesApi.uploadToStorage(uploadUrl, selectedFile, mimeType);

        // Step 3: Complete upload and enqueue ingestion
        setUploadStatus("Finalizing…");
        await knowledgeSourcesApi.completeUpload(chatbotId, { uploadId });

        backToList();
      } catch (err) {
        setIsSubmitting(false);
        setUploadStatus(null);
        setFormError(
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to upload file. Please try again.",
        );
      }
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
              onClick={() => handleTypeChange(option.value)}
              disabled={isSubmitting}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                type === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                isSubmitting ? "pointer-events-none opacity-50" : undefined,
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

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

          {type === "FILE" ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="knowledge-file">Choose file</Label>
                <Input
                  id="knowledge-file"
                  type="file"
                  accept=".pdf,.docx,.txt,.csv,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,text/markdown"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fileError)}
                  aria-describedby={fileError ? "knowledge-file-error" : "knowledge-file-help"}
                />
                <p id="knowledge-file-help" className="text-xs text-muted-foreground">
                  Supported formats: PDF, Word (.docx), Plain text (.txt), CSV (.csv), Markdown (.md). Maximum size: 25 MB.
                </p>
                {fileError ? (
                  <p id="knowledge-file-error" role="alert" className="text-sm text-destructive">
                    {fileError}
                  </p>
                ) : null}
              </div>

              {selectedFile ? (
                <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-foreground">
                      {selectedFile.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
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
            </>
          )}

          <div className="mt-2 flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || (type === "FILE" && !selectedFile)}
              className="flex-1"
            >
              {isSubmitting
                ? uploadStatus ?? (type === "FILE" ? "Uploading…" : "Adding…")
                : type === "FILE"
                  ? "Upload File"
                  : "Add Knowledge"}
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
      </CardContent>
    </Card>
  );
}
