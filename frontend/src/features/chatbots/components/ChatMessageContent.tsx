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
        className="btn-volt inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-[0_4px_16px_rgba(5, 150, 105, 0.3)] hover:shadow-[0_6px_20px_rgba(5, 150, 105, 0.45)] transition-all transform hover:-translate-y-0.5 mx-1 no-underline"
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
      className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2 transition-colors mx-0.5"
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
 * Pre-processes and heals LLM markdown glitches before block parsing:
 */
function normalizeMessageMarkdown(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");

  text = text.replace(/\[Source\s*\d+(?:,\s*(?:Source\s*)?\d+)*\]/gi, "");
  text = text.replace(/\bSource\s*\d+\b/gi, "");

  text = text.replace(/\[([^\]]+)\]\s*\n\s*(\d+\.|\*|\-|\u2022|\[\d+\])\s*\((https?:\/\/[^\s\)]+)\)/g, "$2 [$1]($3)");
  text = text.replace(/\[([^\]]+)\]\s*\n\s*\((https?:\/\/[^\s\)]+)\)/g, "[$1]($2)");
  text = text.replace(/\[([^\]]+)\]\s+\((https?:\/\/[^\s\)]+)\)/g, "[$1]($2)");

  text = text.replace(/\*\*\s*(\[[^\]]+\]\([^\)]+\))\s*\*\*/g, "$1");
  text = text.replace(/([\*\-\+\u2022]\s+)\*\*\s*(\[[^\]]+\]\([^\)]+\))/g, "$1$2");
  text = text.replace(/\*\*\s*(\[[^\]]+\]\([^\)]+\))/g, "$1");
  text = text.replace(/(\[[^\]]+\]\([^\)]+\))\s*\*\*/g, "$1");

  text = text.replace(/^([\*\-\+\u2022]\s+)\*\*\s+([^:\n\*]+)(:|\s|$)/gm, (match, bullet, term, rest) => {
    return `${bullet}**${term.trim()}**${rest}`;
  });

  return text;
}

/**
 * Tokenizes and parses inline markdown:
 */
function renderInlineContent(rawText: string): React.ReactNode[] {
  let cleanedText = rawText
    .replace(/\[Source\s*\d+(?:,\s*(?:Source\s*)?\d+)*\]/gi, "")
    .replace(/\bSource\s*\d+\b/gi, "")
    .trimEnd();

  cleanedText = cleanedText.replace(/\*\*\s*(\[[^\]]+\]\([^\)]+\))\s*\*\*/g, "$1");
  cleanedText = cleanedText.replace(/\*\*\s*(\[[^\]]+\]\([^\)]+\))/g, "$1");
  cleanedText = cleanedText.replace(/(\[[^\]]+\]\([^\)]+\))\s*\*\*/g, "$1");

  const tokenRegex =
    /(?:(\[(?:[^\]]+)\]\s*\((?:https?:\/\/[^\s\)]+)\)|https?:\/\/[^\s\)\],]+|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`))/g;

  const parts = cleanedText.split(tokenRegex);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (/^\*+$/.test(part.trim())) {
      continue;
    }

    const mdLinkMatch = part.match(
      /^\[([^\]]+)\]\s*\((https?:\/\/[^\s\)]+)\)$/,
    );
    if (mdLinkMatch) {
      const linkText = mdLinkMatch[1].trim();
      const linkUrl = mdLinkMatch[2].trim();
      elements.push(renderLink(`link-${i}`, linkText, linkUrl));
      continue;
    }

    if (/^https?:\/\/[^\s\)\],]+$/.test(part)) {
      elements.push(
        <a
          key={`url-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2 break-all transition-colors mx-0.5"
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

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      elements.push(
        <strong key={`b-${i}`} className="font-semibold text-white">
          {renderInlineContent(part.slice(2, -2))}
        </strong>,
      );
      continue;
    }

    const unclosedBold = part.match(/^\*\*\s*([^*]+)$/);
    if (unclosedBold) {
      elements.push(
        <strong key={`b-${i}`} className="font-semibold text-white">
          {renderInlineContent(unclosedBold[1])}
        </strong>,
      );
      continue;
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      elements.push(
        <em key={`i-${i}`} className="italic text-zinc-300">
          {part.slice(1, -1)}
        </em>,
      );
      continue;
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      elements.push(
        <code
          key={`c-${i}`}
          className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 border border-zinc-200 dark:border-white/[0.08]"
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
    <div className="my-3 rounded-[18px] border border-zinc-200 dark:border-white/[0.08] bg-[#0c0c10] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 font-mono text-[11px]">
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
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
      <pre className="p-4 overflow-x-auto text-zinc-200 font-mono text-[12px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function isListItem(line: string): boolean {
  const trimmed = line.trim();
  if (/^[\*\-\+\u2022]\s+/.test(trimmed)) return true;
  if (/^\d+\.\s+/.test(trimmed)) return true;
  if (/^(?:\*\*)?\[[^\]]+\]\s*\([^\)]+\)(?:\*\*)?\s*:/.test(trimmed)) return true;
  if (/^\*\*[^*]+\*\*\s*:/.test(trimmed)) return true;
  return false;
}

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

function parseBlocks(rawContent: string): Block[] {
  const normalized = normalizeMessageMarkdown(rawContent);
  const lines = normalized.split("\n");
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

    if (trimmed.startsWith("```")) {
      flushParagraph();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", language: lang, content: codeLines.join("\n") });
      continue;
    }

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

    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "divider" });
      i++;
      continue;
    }

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

function renderStructuredListItem(item: string, index: number) {
  let cleanItem = item.replace(/^[\*\-\+\u2022]\s+/, "");
  const isNumbered = /^\d+\.\s+/.test(cleanItem);
  if (isNumbered) {
    cleanItem = cleanItem.replace(/^\d+\.\s+/, "");
  }

  const linkFeatureMatch = cleanItem.match(
    /^(?:\*\*)?\[([^\]]+)\]\s*\((https?:\/\/[^\s\)]+)\)(?:\*\*)?\s*:\s*(.+)$/,
  );
  if (linkFeatureMatch) {
    const linkTitle = linkFeatureMatch[1].trim();
    const linkUrl = linkFeatureMatch[2].trim();
    const description = linkFeatureMatch[3].trim();

    return (
      <li
        key={index}
        className="group relative flex flex-col gap-2 p-4 rounded-[20px] bg-white/[0.02] hover:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-mono font-bold shrink-0">
            {index + 1}
          </span>
          <div className="font-semibold text-zinc-900 dark:text-white text-[13px] tracking-wide">
            {renderLink(`feature-link-${index}`, linkTitle, linkUrl)}
          </div>
        </div>
        <div className="pl-8 leading-relaxed text-zinc-700 dark:text-zinc-300 text-sm">
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
        className="group relative flex flex-col gap-2 p-4 rounded-[20px] bg-white/[0.02] hover:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-mono font-bold shrink-0">
            {index + 1}
          </span>
          <div className="font-semibold text-zinc-900 dark:text-white text-[13px] tracking-wide">
            {renderInlineContent(boldTitle)}
          </div>
        </div>
        <div className="pl-8 leading-relaxed text-zinc-700 dark:text-zinc-300 text-sm">
          {renderInlineContent(description)}
        </div>
      </li>
    );
  }

  const normalizedItem = cleanItem.replace(/^\*\*\s*(.+?)\s*\*\*$/, "$1").replace(/^\*\*\s*/, "");

  return (
    <li key={index} className="flex items-start gap-2.5 leading-relaxed text-zinc-800 dark:text-zinc-200 pl-1">
      <span className="size-1.5 rounded-full bg-emerald-600 mt-2 shrink-0 opacity-80" />
      <span className="flex-1">{renderInlineContent(normalizedItem)}</span>
    </li>
  );
}

export function ChatMessageContent({ content }: ChatMessageContentProps) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {blocks.map((block, blockIndex) => {
        switch (block.type) {
          case "lead_in":
            return (
              <div
                key={blockIndex}
                className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pt-1 text-sm tracking-wide"
              >
                <span className="size-1.5 rounded-full bg-emerald-600 shrink-0 anim-live-pulse" />
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
                className="my-3 rounded-[22px] border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-zinc-200 text-sm font-medium">
                    <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 text-base">
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
                ? "font-display text-base font-bold text-zinc-900 dark:text-white tracking-tight mt-2 mb-1"
                : "text-sm font-semibold text-zinc-800 dark:text-zinc-100 mt-1.5 mb-0.5";

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
                className="my-3 overflow-x-auto rounded-[18px] border border-zinc-200 dark:border-white/[0.08]"
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-50 text-zinc-700 dark:bg-white/[0.04] dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-white/[0.08]">
                    <tr>
                      {block.headers.map((h, i) => (
                        <th key={i} className="p-3">
                          {renderInlineContent(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-white/[0.04] bg-white dark:bg-[#0c0c10]">
                    {block.rows.map((row, rIndex) => (
                      <tr
                        key={rIndex}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        {row.map((cell, cIndex) => (
                          <td key={cIndex} className="p-3 text-zinc-800 dark:text-zinc-200">
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
                className="my-2 border-l-2 border-emerald-500 bg-emerald-500/15 dark:bg-emerald-600/[0.04] pl-3.5 py-2 text-zinc-800 dark:text-zinc-300 text-sm rounded-r-[12px]"
              >
                {block.lines.map((l, i) => (
                  <p key={i}>{renderInlineContent(l)}</p>
                ))}
              </blockquote>
            );

          case "divider":
            return (
              <hr key={blockIndex} className="my-2 border-t border-zinc-200 dark:border-white/[0.08]" />
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
