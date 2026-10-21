"use client";

import React, { useState } from "react";

interface ChatMessageContentProps {
  content: string;
}

/**
 * Checks if a link text is an explicit call-to-action (e.g. "Book a Demo", "Contact Us")
 */
function isCtaText(text: string): boolean {
  return /^(Book a Demo|Schedule a Demo|Contact Us|Get Started|Try (Now|Free)|Request (a )?Demo|Sign Up|Talk to (an )?Expert|Book Call)$/i.test(
    text.trim(),
  );
}

/**
 * Renders an inline link with distinct styling based on whether it is an action CTA or reference.
 */
function renderLink(
  key: string | number,
  title: string,
  url: string,
  isButtonCta: boolean = false,
) {
  if (isButtonCta || isCtaText(title)) {
    return (
      <a
        key={key}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-violet-950/40 hover:shadow-violet-900/60 transition-all duration-200 transform hover:-translate-y-0.5 mx-1 no-underline"
      >
        <span>{title}</span>
        <svg
          className="h-3 w-3 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
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

  return (
    <a
      key={key}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-semibold text-violet-400 hover:text-violet-300 underline underline-offset-2 decoration-violet-500/40 hover:decoration-violet-400 transition-colors mx-0.5"
    >
      <span>{title}</span>
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
}

/**
 * Tokenizes and parses inline markdown:
 * - Markdown links [Title](url)
 * - Raw URLs https://...
 * - **bold**
 * - *italic*
 * - `code`
 * - Strips bracketed citation markers like [Source 1]
 */
function renderInlineContent(rawText: string): React.ReactNode[] {
  // 1. Remove bracketed citation tags like [Source 1], [Source 1, Source 2], Source 2
  const cleanedText = rawText
    .replace(/\[Source\s*\d+(?:,\s*(?:Source\s*)?\d+)*\]/gi, "")
    .replace(/\bSource\s*\d+\b/gi, "")
    .trimEnd();

  // 2. Tokenize using a single outer capture group to prevent group leakage
  const tokenRegex =
    /(?:(\[(?:[^\]]+)\]\s*\((?:https?:\/\/[^\s\)]+)\)|https?:\/\/[^\s\)\],]+|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`))/g;

  const parts = cleanedText.split(tokenRegex);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Check markdown link: [title] (url) or [title](url)
    const mdLinkMatch = part.match(
      /^\[([^\]]+)\]\s*\((https?:\/\/[^\s\)]+)\)$/,
    );
    if (mdLinkMatch) {
      const linkText = mdLinkMatch[1].trim();
      const linkUrl = mdLinkMatch[2].trim();
      elements.push(renderLink(`link-${i}`, linkText, linkUrl));
      continue;
    }

    // Check raw URL: https://...
    if (/^https?:\/\/[^\s\)\],]+$/.test(part)) {
      elements.push(
        <a
          key={`url-${i}`}
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
        </a>,
      );
      continue;
    }

    // Check bold **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      elements.push(
        <strong key={`b-${i}`} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>,
      );
      continue;
    }

    // Check italic *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      elements.push(
        <em key={`i-${i}`} className="italic text-zinc-300">
          {part.slice(1, -1)}
        </em>,
      );
      continue;
    }

    // Check code `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      elements.push(
        <code
          key={`c-${i}`}
          className="rounded bg-zinc-800/90 px-1.5 py-0.5 text-[11px] font-mono text-violet-300 border border-zinc-700/60"
        >
          {part.slice(1, -1)}
        </code>,
      );
      continue;
    }

    elements.push(part);
  }

  return elements;
}

/**
 * Interactive CodeBlock component with copy button
 */
function CodeBlock({
  language,
  code,
}: {
  language?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-lg border border-zinc-800 bg-[#0d0d0d] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800/80 text-zinc-400 font-mono text-[11px]">
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-zinc-200 font-mono text-[12px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Checks whether a line represents a list item:
 * 1. Standard bullet: `* `, `- `, `+ `, `• `
 * 2. Numbered bullet: `1. `
 * 3. Feature / Agent item: starts with `[Title](url):` or `**Title**:`
 */
function isListItem(line: string): boolean {
  const trimmed = line.trim();
  if (/^[\*\-\+\u2022]\s+/.test(trimmed)) return true;
  if (/^\d+\.\s+/.test(trimmed)) return true;
  // Feature item: [Name](url): or **Name**:
  if (/^\[[^\]]+\]\s*\([^\)]+\)\s*:/.test(trimmed)) return true;
  if (/^\*\*[^*]+\*\*\s*:/.test(trimmed)) return true;
  return false;
}

/**
 * Checks whether a line is a Markdown table row
 */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
}

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "lead_in"; text: string }
  | { type: "list"; items: string[] }
  | { type: "heading"; level: number; text: string }
  | { type: "quote"; lines: string[] }
  | { type: "divider" }
  | { type: "code"; language: string; content: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "cta"; text: string };

/**
 * Parses raw text into semantic blocks, handling LLMs that may omit double newlines
 */
function parseBlocks(rawContent: string): Block[] {
  const lines = rawContent.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({ type: "paragraph", lines: [...currentParagraph] });
      currentParagraph = [];
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith("```")) {
      flushParagraph();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing ```
      blocks.push({ type: "code", language: lang, content: codeLines.join("\n") });
      continue;
    }

    // Table block
    if (isTableRow(trimmed)) {
      flushParagraph();
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const rawRows = tableLines.map((row) =>
        row.slice(1, -1).split("|").map((cell) => cell.trim()),
      );
      if (rawRows.length > 0) {
        const headers = rawRows[0];
        const isSeparator = rawRows.length > 1 && rawRows[1].every((c) => /^:?-+:?$/.test(c));
        const dataRows = isSeparator ? rawRows.slice(2) : rawRows.slice(1);
        blocks.push({ type: "table", headers, rows: dataRows });
      }
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "divider" });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushParagraph();
      const quoteLines: string[] = [trimmed.replace(/^>\s?/, "")];
      i++;
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }

    // List item block (standard bullet, numbered, or feature item)
    if (isListItem(line)) {
      flushParagraph();
      const listItems: string[] = [];
      while (i < lines.length && isListItem(lines[i])) {
        listItems.push(lines[i].trim());
        i++;
      }
      blocks.push({ type: "list", items: listItems });
      continue;
    }

    // Lead-in statement ending in colon that introduces a subsequent list
    if (
      trimmed.endsWith(":") &&
      trimmed.length < 140 &&
      i + 1 < lines.length &&
      isListItem(lines[i + 1])
    ) {
      flushParagraph();
      blocks.push({ type: "lead_in", text: trimmed });
      i++;
      continue;
    }

    // Call To Action block (e.g. invites containing Book a Demo / Contact Us)
    if (
      /\[(Book a Demo|Schedule a Demo|Contact Us|Get Started|Try Now|Request Demo)[^\]]*\]/i.test(
        trimmed,
      )
    ) {
      flushParagraph();
      blocks.push({ type: "cta", text: trimmed });
      i++;
      continue;
    }

    currentParagraph.push(trimmed);
    i++;
  }

  flushParagraph();
  return blocks;
}

/**
 * Renders an individual list item, checking for feature agent formatting:
 * `[Agent Name](url): Description` or `**Feature Name**: Description`
 */
function renderStructuredListItem(item: string, index: number) {
  // Check if bullet starts with standard bullet symbols and clean them
  let cleanItem = item.replace(/^[\*\-\+\u2022]\s+/, "");
  const isNumbered = /^\d+\.\s+/.test(cleanItem);
  if (isNumbered) {
    cleanItem = cleanItem.replace(/^\d+\.\s+/, "");
  }

  // Feature item matching: [Title](url): Description or **Title**: Description
  const linkFeatureMatch = cleanItem.match(
    /^(\[[^\]]+\]\s*\([^\)]+\))\s*:\s*(.+)$/,
  );
  if (linkFeatureMatch) {
    const linkToken = linkFeatureMatch[1];
    const description = linkFeatureMatch[2];

    return (
      <li
        key={index}
        className="group relative flex flex-col gap-2 p-3.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 hover:border-violet-500/40 transition-all duration-200 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600/20 text-violet-400 border border-violet-500/30 text-xs font-mono font-semibold shrink-0">
            {index + 1}
          </span>
          <div className="font-semibold text-white text-[13px] tracking-wide">
            {renderInlineContent(linkToken)}
          </div>
        </div>
        <div className="pl-8 leading-relaxed text-zinc-300 text-sm">
          {renderInlineContent(description)}
        </div>
      </li>
    );
  }

  const boldFeatureMatch = cleanItem.match(/^(\*\*[^*]+\*\*)\s*:\s*(.+)$/);
  if (boldFeatureMatch) {
    const boldTitle = boldFeatureMatch[1];
    const description = boldFeatureMatch[2];

    return (
      <li
        key={index}
        className="group relative flex flex-col gap-2 p-3.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 hover:border-violet-500/40 transition-all duration-200 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600/20 text-violet-400 border border-violet-500/30 text-xs font-mono font-semibold shrink-0">
            {index + 1}
          </span>
          <div className="font-semibold text-white text-[13px] tracking-wide">
            {renderInlineContent(boldTitle)}
          </div>
        </div>
        <div className="pl-8 leading-relaxed text-zinc-300 text-sm">
          {renderInlineContent(description)}
        </div>
      </li>
    );
  }

  // Standard bullet item
  return (
    <li key={index} className="flex items-start gap-2.5 leading-relaxed text-zinc-200 pl-1">
      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-2 shrink-0 opacity-80" />
      <span className="flex-1">{renderInlineContent(cleanItem)}</span>
    </li>
  );
}

/**
 * Premium structured message renderer that converts raw LLM output into
 * beautiful typography, interactive feature cards, CTA banners, tables, and code blocks.
 */
export function ChatMessageContent({ content }: ChatMessageContentProps) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-200">
      {blocks.map((block, blockIndex) => {
        switch (block.type) {
          case "lead_in":
            return (
              <div
                key={blockIndex}
                className="font-medium text-zinc-100 flex items-center gap-2 pt-1 text-sm tracking-wide"
              >
                <span className="h-2 w-2 rounded-full bg-violet-400 shrink-0 shadow-sm shadow-violet-400" />
                <span>{renderInlineContent(block.text)}</span>
              </div>
            );

          case "list":
            return (
              <ul key={blockIndex} className="my-1.5 flex flex-col gap-2.5">
                {block.items.map((item, itemIndex) =>
                  renderStructuredListItem(item, itemIndex),
                )}
              </ul>
            );

          case "cta":
            return (
              <div
                key={blockIndex}
                className="my-2.5 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-indigo-950/20 to-zinc-900/60 p-4 shadow-lg shadow-violet-950/20"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-zinc-200 text-sm font-medium">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0 text-base">
                      🚀
                    </span>
                    <span className="leading-relaxed">
                      {renderInlineContent(block.text)}
                    </span>
                  </div>
                </div>
              </div>
            );

          case "heading": {
            const HeadingTag =
              block.level === 1
                ? "h1"
                : block.level === 2
                  ? "h2"
                  : block.level === 3
                    ? "h3"
                    : "h4";
            const headingClasses =
              block.level <= 2
                ? "text-base font-bold text-white tracking-tight mt-2 mb-1"
                : "text-sm font-semibold text-zinc-100 mt-1.5 mb-0.5";

            return (
              <HeadingTag key={blockIndex} className={headingClasses}>
                {renderInlineContent(block.text)}
              </HeadingTag>
            );
          }

          case "code":
            return (
              <CodeBlock
                key={blockIndex}
                language={block.language}
                code={block.content}
              />
            );

          case "table":
            return (
              <div
                key={blockIndex}
                className="my-2.5 overflow-x-auto rounded-lg border border-zinc-800"
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-900/80 text-zinc-300 font-semibold border-b border-zinc-800">
                    <tr>
                      {block.headers.map((h, i) => (
                        <th key={i} className="p-2.5">
                          {renderInlineContent(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-[#111111]">
                    {block.rows.map((row, rIndex) => (
                      <tr
                        key={rIndex}
                        className="hover:bg-zinc-800/40 transition-colors"
                      >
                        {row.map((cell, cIndex) => (
                          <td key={cIndex} className="p-2.5 text-zinc-200">
                            {renderInlineContent(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "quote":
            return (
              <blockquote
                key={blockIndex}
                className="my-1.5 border-l-2 border-violet-500 bg-violet-950/10 pl-3 py-1.5 text-zinc-300 text-sm rounded-r"
              >
                {block.lines.map((l, i) => (
                  <p key={i}>{renderInlineContent(l)}</p>
                ))}
              </blockquote>
            );

          case "divider":
            return (
              <hr key={blockIndex} className="my-2 border-t border-zinc-800" />
            );

          case "paragraph":
          default:
            return (
              <div key={blockIndex} className="leading-relaxed">
                {block.lines.map((line, lineIndex) => (
                  <React.Fragment key={lineIndex}>
                    {lineIndex > 0 ? <br /> : null}
                    {renderInlineContent(line)}
                  </React.Fragment>
                ))}
              </div>
            );
        }
      })}
    </div>
  );
}
