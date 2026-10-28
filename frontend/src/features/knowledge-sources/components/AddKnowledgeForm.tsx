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
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "application/csv",
  "text/x-csv",
  "text/markdown",
  "text/x-markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

type SupportedMimeType = (typeof SUPPORTED_FILE_MIME_TYPES)[number];

const EXTENSION_TO_MIME: Record<string, SupportedMimeType> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  txt: "text/plain",
  text: "text/plain",
  csv: "text/csv",
  md: "text/markdown",
  markdown: "text/markdown",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
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
        "Unsupported file type. Supported formats: PDF, Word (.docx), PowerPoint (.pptx), CSV (.csv), Plain Text (.txt, .md), and Images (PNG, JPG, WEBP).",
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
          "Unsupported file type. Supported formats: PDF, Word (.docx), PowerPoint (.pptx), CSV (.csv), Plain Text (.txt, .md), and Images (PNG, JPG, WEBP).",
        );
        return;
      }

      setFormError(null);
      setFileError(null);
      setIsSubmitting(true);
      setUploadStatus("Uploading document to knowledge engine…");

      try {
        await knowledgeSourcesApi.uploadDirect(chatbotId, selectedFile);
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
    <Card className="max-w-xl mx-auto rounded-[26px] border border-zinc-200/80 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#111218]/90 dark:shadow-2xl backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <span className="size-1.5 rounded-full bg-emerald-600 anim-live-pulse" />
            Knowledge Ingestion
          </span>
        </div>
        <CardTitle className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Add Knowledge
        </CardTitle>
        <CardDescription className="text-zinc-400 text-xs sm:text-sm">
          Choose a source type, then fill in its details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Knowledge source type"
          className="mb-5 flex flex-wrap gap-2"
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
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-all cursor-pointer",
                type === option.value
                  ? "border-emerald-500 bg-emerald-600 text-white font-bold shadow-[0_0_15px_rgba(5, 150, 105, 0.3)]"
                  : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white",
                isSubmitting ? "pointer-events-none opacity-40" : undefined,
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
              className="rounded-[18px] border border-rose-500/30 bg-rose-950/40 px-4 py-2.5 text-xs font-mono text-rose-300"
            >
              {formError}
            </p>
          ) : null}

          {type === "FILE" ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="knowledge-file" className="text-xs font-medium text-zinc-300">
                  Choose file
                </Label>
                <Input
                  id="knowledge-file"
                  type="file"
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.md,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,text/markdown,image/*"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fileError)}
                  aria-describedby={fileError ? "knowledge-file-error" : "knowledge-file-help"}
                  className="rounded-full bg-white/[0.03] border-white/[0.1] text-xs px-4 cursor-pointer file:cursor-pointer file:rounded-full file:border file:border-white/[0.1] file:bg-white/[0.05] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white file:hover:bg-white/[0.1]"
                />
                <p id="knowledge-file-help" className="text-xs text-zinc-400">
                  Supported formats: PDF, Word (.docx), PowerPoint (.pptx), Spreadsheets (.csv), Plain text (.txt, .md), and Images (PNG, JPG, WEBP). Maximum size: 25 MB.
                </p>
                {fileError ? (
                  <p id="knowledge-file-error" role="alert" className="text-xs font-mono text-rose-400">
                    {fileError}
                  </p>
                ) : null}
              </div>

              {selectedFile ? (
                <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.02] p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-white">
                      {selectedFile.name}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-zinc-400">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="knowledge-name" className="text-xs font-medium text-zinc-300">
                  Name
                </Label>
                <Input
                  id="knowledge-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "knowledge-name-error" : undefined}
                  className="rounded-full bg-white/[0.03] border-white/[0.1] text-xs px-4"
                />
                {nameError ? (
                  <p id="knowledge-name-error" role="alert" className="text-xs font-mono text-rose-400">
                    {nameError}
                  </p>
                ) : null}
              </div>

              {type === "TEXT" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="knowledge-text" className="text-xs font-medium text-zinc-300">
                    Text content
                  </Label>
                  <Textarea
                    id="knowledge-text"
                    rows={6}
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(valueError)}
                    aria-describedby={valueError ? "knowledge-value-error" : undefined}
                    className="rounded-[18px] bg-white/[0.03] border-white/[0.1] text-xs font-mono leading-relaxed p-4"
                  />
                  {valueError ? (
                    <p id="knowledge-value-error" role="alert" className="text-xs font-mono text-rose-400">
                      {valueError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="knowledge-url" className="text-xs font-medium text-zinc-300">
                    {type === "WEBPAGE" ? "Webpage URL" : "URL"}
                  </Label>
                  <Input
                    id="knowledge-url"
                    type="url"
                    placeholder="https://example.com"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(valueError)}
                    aria-describedby={valueError ? "knowledge-value-error" : undefined}
                    className="rounded-full bg-white/[0.03] border-white/[0.1] text-xs font-mono px-4"
                  />
                  {valueError ? (
                    <p id="knowledge-value-error" role="alert" className="text-xs font-mono text-rose-400">
                      {valueError}
                    </p>
                  ) : null}
                </div>
              )}
            </>
          )}

          <div className="mt-3 flex gap-2.5">
            <Button
              type="submit"
              disabled={isSubmitting || (type === "FILE" && !selectedFile)}
              className="btn-volt flex-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs py-2.5 shadow-[0_10px_28px_rgba(5, 150, 105, 0.35)]"
            >
              {isSubmitting
                ? uploadStatus ?? (type === "FILE" ? "Uploading…" : "Adding…")
                : type === "FILE"
                  ? "Upload File"
                  : "Add Knowledge"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={backToList}
              className="rounded-full px-5 text-xs"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
