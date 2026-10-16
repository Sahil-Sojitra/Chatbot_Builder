"use client";

import React from "react";

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

function formatSourceLabel(title: string | null, url: string): { mainTitle: string; pathBadge: string } {
  let pathBadge = "/";
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    if (pathname && pathname !== "") {
      pathBadge = pathname;
    }
  } catch {
    pathBadge = url;
  }

  if (title && title.trim()) {
    let clean = title.trim();
    // Strip repetitive site brand suffixes
    clean = clean.replace(/\s*[|\-–—]\s*(?:WebOsmotic|Building On Trust|Join Our AI-Driven Tech Team).*$/i, "").trim();
    if (clean.length > 0) {
      return { mainTitle: clean, pathBadge };
    }
  }

  if (pathBadge && pathBadge !== "/") {
    const segments = pathBadge.split("/").filter(Boolean);
    const lastSeg = segments[segments.length - 1] || "";
    const formattedSeg = lastSeg
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return { mainTitle: formattedSeg || pathBadge, pathBadge };
  }

  return { mainTitle: "Homepage", pathBadge: "/" };
}

export function ChatSourcesPills({ sources, theme = "violet" }: ChatSourcesPillsProps) {
  if (!sources || sources.length === 0) return null;

  // Deduplicate sources by normalized URL so the same page is not repeated
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

  return (
    <div className="mt-3 pt-2.5 border-t border-zinc-800/70 flex flex-col gap-2 text-xs">
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
        <svg
          className="h-3.5 w-3.5 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          {uniqueSources.length === 1 ? "Indexed Source" : "Indexed Sources"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {uniqueSources.map((source, index) => {
          const { mainTitle, pathBadge } = formatSourceLabel(source.title, source.source_url);

          return (
            <a
              key={index}
              href={source.source_url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${mainTitle}\nURL: ${source.source_url}`}
              className={`group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all duration-150 cursor-pointer shadow-sm ${
                isViolet
                  ? "border-violet-500/25 bg-violet-950/20 text-zinc-300 hover:border-violet-500/50 hover:bg-violet-900/30 hover:text-white"
                  : "border-emerald-500/25 bg-emerald-950/20 text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-900/30 hover:text-white"
              }`}
            >
              <span className="font-medium text-zinc-200 group-hover:text-white transition-colors truncate max-w-[200px] sm:max-w-xs">
                {mainTitle}
              </span>
              {pathBadge ? (
                <span className="rounded bg-zinc-800/80 px-1 py-0.5 text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 border border-zinc-700/50">
                  {pathBadge}
                </span>
              ) : null}
              <svg
                className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
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
