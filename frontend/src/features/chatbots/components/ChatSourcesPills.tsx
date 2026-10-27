"use client";

import React, { useState } from "react";

export interface ChatSourceItem {
  chunk_id: string;
  source_url: string;
  canonical_url: string;
  title: string | null;
  score: number;
  snippet: string;
}

interface ChatSourcesPillsProps {
  sources?: ChatSourceItem[];
  theme?: "violet" | "emerald" | "zinc";
}

function formatSourceTitle(title: string | null, url: string): string {
  if (title && title.trim()) {
    let clean = title.trim();
    // Extract specific page name if title is "Page Name | Site Brand"
    const parts = clean.split(/\s+[|\-–—·]\s+/);
    if (parts.length > 1 && parts[0].length >= 2) {
      clean = parts[0].trim();
    }
    if (clean.length > 0) {
      return clean;
    }
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      const formatted = lastSeg
        .replace(/[-_]/g, " ")
        .replace(/\.html?$/i, "")
        .trim();
      if (formatted) {
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Website Source";
  }
}

function parseDocumentCitation(url: string, rawTitle: string | null): {
  isDocument: boolean;
  filename: string;
  anchor: string | null;
  fileType: "pdf" | "docx" | "pptx" | "csv" | "image" | "text" | "web";
  displayTitle: string;
} {
  if (url.startsWith("doc://")) {
    const rawPath = url.replace(/^doc:\/\//, "");
    const [pathPart, anchorPart] = rawPath.split("#");
    const filename = pathPart.split("/").pop() || pathPart;
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    let fileType: "pdf" | "docx" | "pptx" | "csv" | "image" | "text" = "text";
    if (ext === "pdf") fileType = "pdf";
    else if (ext === "docx" || ext === "doc") fileType = "docx";
    else if (ext === "pptx" || ext === "ppt") fileType = "pptx";
    else if (ext === "csv" || ext === "tsv" || ext === "xlsx") fileType = "csv";
    else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) fileType = "image";

    let formattedAnchor: string | null = null;
    if (anchorPart) {
      if (anchorPart.startsWith("page=")) {
        formattedAnchor = `Page ${anchorPart.replace("page=", "")}`;
      } else if (anchorPart.startsWith("slide=")) {
        formattedAnchor = `Slide ${anchorPart.replace("slide=", "")}`;
      } else if (anchorPart.startsWith("row=")) {
        formattedAnchor = `Row ${anchorPart.replace("row=", "")}`;
      } else if (anchorPart.startsWith("section=")) {
        formattedAnchor = `Sec ${anchorPart.replace("section=", "")}`;
      } else {
        formattedAnchor = anchorPart;
      }
    }

    const titlePrefix = rawTitle && rawTitle.trim() && !rawTitle.startsWith("doc://") ? rawTitle.trim() : filename;
    const displayTitle = formattedAnchor ? `${titlePrefix} (${formattedAnchor})` : titlePrefix;

    return {
      isDocument: true,
      filename,
      anchor: formattedAnchor,
      fileType,
      displayTitle,
    };
  }

  return {
    isDocument: false,
    filename: "",
    anchor: null,
    fileType: "web",
    displayTitle: formatSourceTitle(rawTitle, url),
  };
}

export function ChatSourcesPills({ sources, theme = "zinc" }: ChatSourcesPillsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSnippetModal, setActiveSnippetModal] = useState<ChatSourceItem | null>(null);

  if (!sources || sources.length === 0) return null;

  // Deduplicate sources by normalized URL
  const uniqueSourcesMap = new Map<string, ChatSourceItem>();
  for (const s of sources) {
    const key = (s.canonical_url || s.source_url || "").toLowerCase().trim();
    if (key && !uniqueSourcesMap.has(key)) {
      uniqueSourcesMap.set(key, s);
    }
  }

  const uniqueSources = Array.from(uniqueSourcesMap.values());
  if (uniqueSources.length === 0) return null;

  const isViolet = theme === "violet";
  const isEmerald = theme === "emerald";
  const INITIAL_MAX = 4;
  const hasMore = uniqueSources.length > INITIAL_MAX;
  const visibleSources = isExpanded ? uniqueSources : uniqueSources.slice(0, INITIAL_MAX);

  return (
    <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex flex-col gap-2 text-xs">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
        <div className="flex items-center gap-1.5">
          <svg
            className={`h-3.5 w-3.5 ${isViolet ? "text-violet-400" : isEmerald ? "text-emerald-400" : "text-zinc-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
            />
          </svg>
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            {uniqueSources.length === 1 ? "Grounded Source" : "Grounded Sources"} ({uniqueSources.length})
          </span>
        </div>

        {hasMore ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-sans"
          >
            {isExpanded ? "Show less" : `+${uniqueSources.length - INITIAL_MAX} more`}
          </button>
        ) : null}
      </div>

      {/* Sleek, responsive wrapping chips */}
      <div className="flex flex-wrap gap-1.5">
        {visibleSources.map((source, index) => {
          const citation = parseDocumentCitation(source.source_url, source.title);
          const isWeb = !citation.isDocument;
          const isExternalLink = isWeb && (source.source_url.startsWith("http://") || source.source_url.startsWith("https://"));

          const badgeClasses = citation.isDocument
            ? citation.fileType === "pdf"
              ? "border-rose-500/30 bg-rose-950/25 text-rose-300 hover:border-rose-500/50 hover:bg-rose-900/40"
              : citation.fileType === "pptx"
              ? "border-amber-500/30 bg-amber-950/25 text-amber-300 hover:border-amber-500/50 hover:bg-amber-900/40"
              : citation.fileType === "docx"
              ? "border-sky-500/30 bg-sky-950/25 text-sky-300 hover:border-sky-500/50 hover:bg-sky-900/40"
              : citation.fileType === "csv"
              ? "border-emerald-500/30 bg-emerald-950/25 text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-900/40"
              : citation.fileType === "image"
              ? "border-purple-500/30 bg-purple-950/25 text-purple-300 hover:border-purple-500/50 hover:bg-purple-900/40"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
            : isViolet
            ? "border-violet-500/20 bg-violet-950/30 text-zinc-300 hover:border-violet-500/50 hover:bg-violet-900/40 hover:text-white"
            : isEmerald
            ? "border-emerald-500/20 bg-emerald-950/30 text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-900/40 hover:text-white"
            : "border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white";

          const tooltipText = source.snippet
            ? `Source: ${citation.displayTitle}\n\n"${source.snippet.slice(0, 200)}${source.snippet.length > 200 ? "..." : ""}"`
            : `Source: ${citation.displayTitle}`;

          if (isExternalLink) {
            return (
              <a
                key={index}
                href={source.source_url}
                target="_blank"
                rel="noopener noreferrer"
                title={tooltipText}
                className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-150 cursor-pointer shadow-xs max-w-full ${badgeClasses}`}
              >
                {/* Globe Icon */}
                <svg
                  className="w-3 h-3 shrink-0 text-zinc-400 group-hover:text-violet-300 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
                  />
                </svg>

                <span className="font-medium truncate max-w-[180px] sm:max-w-[240px]">
                  {citation.displayTitle}
                </span>

                <svg
                  className="w-2.5 h-2.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-zinc-400 group-hover:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            );
          }

          // Document citation pill (clickable to inspect snippet excerpt)
          return (
            <button
              key={index}
              type="button"
              onClick={() => setActiveSnippetModal(source)}
              title={tooltipText}
              className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-150 cursor-pointer shadow-xs max-w-full ${badgeClasses}`}
            >
              {/* Document Icon based on fileType */}
              {citation.fileType === "pdf" ? (
                <span className="font-mono text-[9px] font-bold text-rose-400 bg-rose-500/20 px-1 py-0.2 rounded shrink-0">
                  PDF
                </span>
              ) : citation.fileType === "pptx" ? (
                <span className="font-mono text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded shrink-0">
                  PPTX
                </span>
              ) : citation.fileType === "docx" ? (
                <span className="font-mono text-[9px] font-bold text-sky-400 bg-sky-500/20 px-1 py-0.2 rounded shrink-0">
                  DOCX
                </span>
              ) : citation.fileType === "csv" ? (
                <span className="font-mono text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.2 rounded shrink-0">
                  CSV
                </span>
              ) : citation.fileType === "image" ? (
                <span className="font-mono text-[9px] font-bold text-purple-400 bg-purple-500/20 px-1 py-0.2 rounded shrink-0">
                  IMG
                </span>
              ) : (
                <svg
                  className="w-3 h-3 shrink-0 text-zinc-400 group-hover:text-zinc-200 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              )}

              <span className="font-medium truncate max-w-[180px] sm:max-w-[240px]">
                {citation.displayTitle}
              </span>

              {/* View snippet info icon */}
              <svg
                className="w-2.5 h-2.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Excerpt Modal for Document Citations */}
      {activeSnippetModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setActiveSnippetModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-zinc-700 bg-[#0e0e11] p-5 shadow-2xl flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-white">Grounded Evidence Snippet</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSnippetModal(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Citation Source</span>
                {activeSnippetModal.score ? (
                  <span className="text-emerald-400">
                    Relevance Score: {(activeSnippetModal.score * 100).toFixed(0)}%
                  </span>
                ) : null}
              </div>
              <p className="font-semibold text-zinc-200 bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800 break-all">
                {activeSnippetModal.source_url}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-mono uppercase text-zinc-400">Indexed Document Passage</span>
              <div className="max-h-48 overflow-y-auto rounded-md bg-zinc-950 p-3 border border-zinc-800 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
                {activeSnippetModal.snippet || "No text passage available for this chunk."}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveSnippetModal(null)}
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
