"use client";

import React from "react";

interface ChatMessageContentProps {
  content: string;
}

/**
 * Parses inline markdown:
 * - Markdown links [Title](url) or [Title] (url) -> clickable <a> with icon
 * - Raw URLs https://... -> clickable <a>
 * - **bold** -> <strong>
 * - *italic* -> <em>
 * - `code` -> <code>
 * - Strips redundant internal [Source X] tokens from user-facing text
 */
function renderInlineContent(rawText: string): React.ReactNode[] {
  // 1. Remove bracketed citation tags like [Source 1], [Source 1, Source 2], Source 2
  const cleanedText = rawText
    .replace(/\[Source\s*\d+(?:,\s*(?:Source\s*)?\d+)*\]/gi, "")
    .replace(/\bSource\s*\d+\b/gi, "")
    .trimEnd();

  // 2. Tokenize using ONLY ONE outer capture group with non-capturing inner groups
  // This guarantees split() yields strictly [text, token, text, token] with zero sub-group leakage
  const tokenRegex = /(?:(\[(?:[^\]]+)\]\s*\((?:https?:\/\/[^\s\)]+)\)|https?:\/\/[^\s\)\],]+|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`))/g;

  const parts = cleanedText.split(tokenRegex);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Check markdown link: [title] (url) or [title](url)
    const mdLinkMatch = part.match(/^\[([^\]]+)\]\s*\((https?:\/\/[^\s\)]+)\)$/);
    if (mdLinkMatch) {
      const linkText = mdLinkMatch[1].trim();
      const linkUrl = mdLinkMatch[2].trim();
      elements.push(
        <a
          key={i}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors mx-0.5"
        >
          <span>{linkText}</span>
          <svg
            className="h-3 w-3 shrink-0 opacity-80"
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
      continue;
    }

    // Check raw URL: https://...
    if (/^https?:\/\/[^\s\)\],]+$/.test(part)) {
      elements.push(
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all transition-colors mx-0.5"
        >
          <span>{part}</span>
          <svg
            className="h-3 w-3 shrink-0 opacity-80"
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
      continue;
    }

    // Check bold **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      elements.push(
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
      continue;
    }

    // Check italic *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      elements.push(
        <em key={i} className="italic text-zinc-300">
          {part.slice(1, -1)}
        </em>
      );
      continue;
    }

    // Check code `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      elements.push(
        <code
          key={i}
          className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[11px] font-mono text-zinc-200 border border-zinc-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
      continue;
    }

    elements.push(part);
  }

  return elements;
}

const BULLET_PREFIX_REGEX = /^[\*\-\u2022]\s+/;
const NUMBERED_PREFIX_REGEX = /^\d+\.\s+/;

/**
 * Premium structured message renderer that converts raw LLM markdown
 * into clean typography, clickable links, bulleted lists, and bold highlights.
 */
export function ChatMessageContent({ content }: ChatMessageContentProps) {
  if (!content) return null;

  // Split content into paragraph / block segments by double newline
  const rawBlocks = content.split(/\n\s*\n/);

  return (
    <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-zinc-200">
      {rawBlocks.map((block, blockIndex) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split("\n");

        // Check if this block is a bulleted list (* , - , • )
        const isBulletList = lines.length > 0 && lines.every((line) => {
          const l = line.trim();
          return BULLET_PREFIX_REGEX.test(l) || l === "";
        });

        if (isBulletList) {
          const items = lines
            .map((line) => line.trim())
            .filter((line) => BULLET_PREFIX_REGEX.test(line))
            .map((line) => line.replace(BULLET_PREFIX_REGEX, ""));

          return (
            <ul key={blockIndex} className="my-1 flex flex-col gap-2 pl-1">
              {items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-2 shrink-0 opacity-80" />
                  <span className="flex-1 leading-normal text-zinc-100">
                    {renderInlineContent(item)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        // Check if this block is a numbered list (1. , 2. )
        const isNumberedList = lines.length > 0 && lines.every((line) => {
          const l = line.trim();
          return NUMBERED_PREFIX_REGEX.test(l) || l === "";
        });

        if (isNumberedList) {
          const items = lines
            .map((line) => line.trim())
            .filter((line) => NUMBERED_PREFIX_REGEX.test(line));

          return (
            <ol key={blockIndex} className="my-1 flex flex-col gap-2 pl-1 list-decimal list-inside">
              {items.map((item, itemIndex) => {
                const cleanItem = item.replace(NUMBERED_PREFIX_REGEX, "");
                return (
                  <li key={itemIndex} className="leading-normal text-zinc-100 pl-1">
                    {renderInlineContent(cleanItem)}
                  </li>
                );
              })}
            </ol>
          );
        }

        // Normal paragraph (may have single linebreaks)
        return (
          <p key={blockIndex} className="leading-relaxed">
            {lines.map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInlineContent(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
