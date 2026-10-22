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
  theme?: "violet" | "emerald";
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

export function ChatSourcesPills({ sources, theme = "violet" }: ChatSourcesPillsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
  const INITIAL_MAX = 3;
  const hasMore = uniqueSources.length > INITIAL_MAX;
  const visibleSources = isExpanded ? uniqueSources : uniqueSources.slice(0, INITIAL_MAX);

  return (
    <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex flex-col gap-2 text-xs">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
        <div className="flex items-center gap-1.5">
          <svg
            className={`h-3.5 w-3.5 ${isViolet ? "text-violet-400" : "text-emerald-400"}`}
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
            {uniqueSources.length === 1 ? "Indexed Source" : "Indexed Sources"} ({uniqueSources.length})
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
          const title = formatSourceTitle(source.title, source.source_url);

          return (
            <a
              key={index}
              href={source.source_url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${title}\nURL: ${source.source_url}`}
              className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-150 cursor-pointer shadow-xs max-w-full ${
                isViolet
                  ? "border-violet-500/20 bg-violet-950/30 text-zinc-300 hover:border-violet-500/50 hover:bg-violet-900/40 hover:text-white"
                  : "border-emerald-500/20 bg-emerald-950/30 text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-900/40 hover:text-white"
              }`}
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
                {title}
              </span>

              {/* External Arrow */}
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
        })}
      </div>
    </div>
  );
}
