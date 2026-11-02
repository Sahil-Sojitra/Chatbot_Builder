"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import type { ChangeEvent, FormEvent, DragEvent } from "react";

import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";
import { knowledgeSourcesApi } from "@/lib/api/knowledgeSources";
import { cn } from "@/lib/utils";

type SourceType = "TEXT" | "URL" | "WEBPAGE" | "FILE";

interface TypeOption {
  value: SourceType;
  title: string;
  badge: string;
  description: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "TEXT",
    title: "Plain Text",
    badge: "Direct Input",
    description: "Paste FAQs, product specs, policies, or knowledge notes",
  },
  {
    value: "URL",
    title: "Webpage Link",
    badge: "Live URL",
    description: "Crawl and extract article text from a single public URL",
  },
  {
    value: "WEBPAGE",
    title: "Website Resource",
    badge: "HTML Page",
    description: "Index structured documentation, landing page, or portal",
  },
  {
    value: "FILE",
    title: "Document Upload",
    badge: "Up to 25 MB",
    description: "Upload PDF, Word, PowerPoint, CSV, TXT, MD, or Images",
  },
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<SourceType>("TEXT");
  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
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

  const processFile = (file: File) => {
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }
    processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSubmitting) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isSubmitting) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
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

  const getFileExtensionBadge = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toUpperCase() || "DOC";
    return ext;
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Knowledge Sources</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <span className="size-1.5 rounded-full bg-emerald-600 anim-live-pulse" />
                Knowledge Base Ingestion
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Add Knowledge Source
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Index documents, live URLs, or structured text into your chatbot&apos;s neural retrieval pipeline.
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Builder (7 cols on lg, 8 cols on xl) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Card className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0E1B15]">
            <form
              noValidate
              aria-busy={isSubmitting}
              onSubmit={(event) => void handleSubmit(event)}
              className="flex flex-col gap-6"
            >
              {/* Step 1: Choose Source Type */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Step 1: Choose Source Type
                  </Label>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">4 Formats Available</span>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Knowledge source type"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {TYPE_OPTIONS.map((option) => {
                    const isSelected = type === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleTypeChange(option.value)}
                        disabled={isSubmitting}
                        className={cn(
                          "relative flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer group",
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-xs"
                            : "border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 hover:bg-zinc-100/70 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]",
                          isSubmitting ? "pointer-events-none opacity-50" : undefined,
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex size-8 items-center justify-center rounded-lg transition-colors",
                                isSelected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-300 group-hover:bg-zinc-300 dark:group-hover:bg-white/[0.12]",
                              )}
                            >
                              {option.value === "TEXT" && (
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              {option.value === "URL" && (
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                              )}
                              {option.value === "WEBPAGE" && (
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                              )}
                              {option.value === "FILE" && (
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                              )}
                            </div>
                            <span className="font-semibold text-sm text-zinc-900 dark:text-white">
                              {option.title}
                            </span>
                          </div>

                          {isSelected ? (
                            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-zinc-200/80 text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-400">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Global Error Banner */}
              {formError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 px-4 py-3 text-xs font-mono text-rose-800 dark:text-rose-300 flex items-start gap-2.5"
                >
                  <svg className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{formError}</span>
                </div>
              ) : null}

              {/* Step 2: Source Details */}
              <div className="flex flex-col gap-4 pt-1 border-t border-zinc-200 dark:border-white/10">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Step 2: Source Details
                </Label>

                {type === "FILE" ? (
                  <div className="flex flex-col gap-4">
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center",
                        isDragOver
                          ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/20"
                          : "border-zinc-300 bg-zinc-50/70 hover:border-emerald-500 hover:bg-emerald-50/30 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-emerald-500/50 dark:hover:bg-white/[0.04]",
                        isSubmitting ? "pointer-events-none opacity-50" : undefined,
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        id="knowledge-file"
                        type="file"
                        accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.md,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,text/markdown,image/*"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fileError)}
                        aria-describedby={fileError ? "knowledge-file-error" : "knowledge-file-help"}
                        className="hidden"
                      />

                      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 mb-3.5 shadow-xs">
                        <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>

                      <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                        Drag and drop your file here, or <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">browse</span>
                      </p>
                      <p id="knowledge-file-help" className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                        Supports PDF, Word (.docx), PowerPoint (.pptx), CSV (.csv), Markdown (.md), Plain text (.txt), and Images (PNG, JPG, WEBP).
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 font-semibold">PDF</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 font-semibold">DOCX</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 font-semibold">PPTX</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 font-semibold">CSV</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 font-semibold">MD / TXT</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300 font-semibold">IMAGES</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold ml-1">MAX 25 MB</span>
                      </div>
                    </div>

                    {fileError ? (
                      <p id="knowledge-file-error" role="alert" className="text-xs font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <span className="size-1 rounded-full bg-rose-500" />
                        {fileError}
                      </p>
                    ) : null}

                    {/* Selected File Card */}
                    {selectedFile ? (
                      <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/20 p-4">
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-mono text-xs font-bold uppercase shadow-xs">
                            {getFileExtensionBadge(selectedFile.name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                              {selectedFile.name}
                            </span>
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                              {formatFileSize(selectedFile.size)} • Ready for ingestion
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => fileInputRef.current?.click()}
                            className="h-8 text-xs font-medium cursor-pointer"
                          >
                            Change
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 cursor-pointer"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {/* Submitting Progress Indicator */}
                    {isSubmitting && uploadStatus && (
                      <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/40 dark:bg-emerald-950/20 p-4">
                        <div className="flex items-center gap-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          <svg className="size-4 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>{uploadStatus}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-950/60">
                          <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-600" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Name Field */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="knowledge-name" className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                          Source Name <span className="text-emerald-600">*</span>
                        </Label>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {name.length} / {NAME_MAX_LENGTH}
                        </span>
                      </div>
                      <Input
                        id="knowledge-name"
                        value={name}
                        placeholder={
                          type === "TEXT"
                            ? "e.g. Return Policy & Warranty Terms"
                            : type === "WEBPAGE"
                              ? "e.g. Documentation Portal Home"
                              : "e.g. SaaS Pricing & Subscription FAQ"
                        }
                        onChange={(event) => setName(event.target.value)}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(nameError)}
                        aria-describedby={nameError ? "knowledge-name-error" : undefined}
                        className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#070D0A] dark:text-white dark:placeholder:text-zinc-500"
                      />
                      {nameError ? (
                        <p id="knowledge-name-error" role="alert" className="text-xs font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                          <span className="size-1 rounded-full bg-rose-500" />
                          {nameError}
                        </p>
                      ) : null}
                    </div>

                    {/* Text Area Field for TEXT */}
                    {type === "TEXT" ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="knowledge-text" className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                            Knowledge Content <span className="text-emerald-600">*</span>
                          </Label>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {sourceText.length.toLocaleString()} chars • ~{Math.ceil(sourceText.length / 4)} tokens
                          </span>
                        </div>
                        <Textarea
                          id="knowledge-text"
                          rows={8}
                          value={sourceText}
                          placeholder="Paste your raw documentation, knowledge base articles, guidelines, or frequently asked questions here..."
                          onChange={(event) => setSourceText(event.target.value)}
                          disabled={isSubmitting}
                          aria-invalid={Boolean(valueError)}
                          aria-describedby={valueError ? "knowledge-value-error" : undefined}
                          className="rounded-xl border border-zinc-200 bg-white p-3.5 text-xs font-mono leading-relaxed text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#070D0A] dark:text-zinc-100 dark:placeholder:text-zinc-500 min-h-[180px]"
                        />
                        {valueError ? (
                          <p id="knowledge-value-error" role="alert" className="text-xs font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <span className="size-1 rounded-full bg-rose-500" />
                            {valueError}
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Tip: Group content by topic using headings and bullet points for cleaner vector chunks.
                          </p>
                        )}
                      </div>
                    ) : (
                      /* URL Field for URL / WEBPAGE */
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="knowledge-url" className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                          {type === "WEBPAGE" ? "Webpage URL" : "Target Public URL"} <span className="text-emerald-600">*</span>
                        </Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <Input
                            id="knowledge-url"
                            type="url"
                            placeholder="https://example.com/support/getting-started"
                            value={sourceUrl}
                            onChange={(event) => setSourceUrl(event.target.value)}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(valueError)}
                            aria-describedby={valueError ? "knowledge-value-error" : undefined}
                            className="rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#070D0A] dark:text-white dark:placeholder:text-zinc-500"
                          />
                        </div>
                        {valueError ? (
                          <p id="knowledge-value-error" role="alert" className="text-xs font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <span className="size-1 rounded-full bg-rose-500" />
                            {valueError}
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Our crawler will safely extract readable HTML text, article content, and metadata from this URL.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-zinc-200 dark:border-white/10">
                <Button
                  type="submit"
                  disabled={isSubmitting || (type === "FILE" && !selectedFile)}
                  className="w-full sm:w-auto h-10 px-6 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="size-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{uploadStatus ?? "Processing Knowledge…"}</span>
                    </>
                  ) : type === "FILE" ? (
                    <>
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Upload &amp; Process Document</span>
                    </>
                  ) : (
                    <>
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Ingest &amp; Index Knowledge</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={backToList}
                  className="w-full sm:w-auto h-10 px-5 rounded-xl border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: RAG Ingestion Guide & Best Practices (5 cols on lg, 4 cols on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <Card className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0E1B15] flex flex-col gap-4">
            <div className="border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  RAG Pipeline Architecture
                </span>
                <Badge variant="success" className="text-[10px]">
                  Automated
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                How ingested content is vectorized and referenced during live customer conversations.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-mono text-xs font-bold">
                  1
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Semantic Chunking
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5">
                    Documents are automatically partitioned into contextual chunks with sliding overlap to preserve meaning across boundaries.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-mono text-xs font-bold">
                  2
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Vector Embedding Generation
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5">
                    Chunks are encoded into high-dimensional vector representations stored in a dedicated tenant vector index.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-mono text-xs font-bold">
                  3
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Hybrid Retrieval &amp; Rerank
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5">
                    User queries trigger top-K cosine similarity matches, feeding the exact relevant context into Gemini/OpenAI.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-mono text-xs font-bold">
                  4
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Grounded Source Citations
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5">
                    Responses include interactive citations allowing users to verify where each answer came from.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Supported File Formats
              </span>
              <div className="flex flex-wrap gap-1.5">
                {["PDF", "Word (.docx)", "PowerPoint (.pptx)", "CSV", "Markdown", "Plain Text", "Images (PNG/JPG)"].map((fmt) => (
                  <span
                    key={fmt}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-800/30 p-3 flex items-start gap-2 text-xs text-emerald-900 dark:text-emerald-300">
              <span className="shrink-0 text-emerald-600 dark:text-emerald-400">💡</span>
              <span className="text-[11px] leading-relaxed">
                <strong>Pro Tip:</strong> For highest question-answering precision, create separate focused sources for each category (e.g. <em>Return Policy</em>, <em>Pricing &amp; Plans</em>, <em>API Specs</em>).
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
