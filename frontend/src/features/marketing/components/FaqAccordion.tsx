"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How does the Retrieval-Augmented Generation (RAG) pipeline work?",
    answer:
      "When you add knowledge sources (PDFs, Word documents, plain text, or URLs), files are uploaded directly to object storage via presigned URLs. Background ingestion engines parse the documents, create semantic text chunks with configurable token overlap, and compute vector embeddings. When a user asks a question, we compute the query embedding, perform cosine similarity retrieval to extract the top-k chunks, and pass them as grounded context to the LLM.",
  },
  {
    question: "Can I bring my own OpenAI, Anthropic, or Google Gemini models?",
    answer:
      "Yes. You have full control over the AI model configuration for each deployed bot. You can choose between OpenAI (gpt-4o, gpt-4o-mini), Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku), Google Gemini (1.5 Pro, 1.5 Flash), or custom OpenAI-compatible endpoints, along with custom temperature and token limits.",
  },
  {
    question: "Why does Chatbot Studio use direct presigned B2/S3 uploads?",
    answer:
      "Traditional chatbot builders stream massive file uploads through their application server, leading to memory spikes, gateway timeouts, and single points of failure. By issuing cryptographic presigned PUT URLs, your browser transfers files directly to high-throughput cloud storage with SHA-256 verification, ensuring zero bottleneck on the core API.",
  },
  {
    question: "Will the embed widget impact my website's speed or styling?",
    answer:
      "No. The client widget script is under 18KB gzipped, executes asynchronously with zero third-party framework overhead, and mounts inside an isolated Shadow DOM container. It will never override your site's styles or block initial page rendering.",
  },
  {
    question: "Can I restrict chatbot usage to specific authorized domains?",
    answer:
      "Yes. Each deployed chatbot has a unique Public ID that can be locked down with allowed CORS origins, domain whitelisting, and strict per-IP rate limiting from your dashboard.",
  },
  {
    question: "How do team workspaces and role-based permissions work?",
    answer:
      "Workspaces support multi-tenant team collaboration. You can invite colleagues via email with assigned roles (Owner, Admin, Member) to collaborate on knowledge ingestion, prompt tuning, and deployment monitoring.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3 w-full max-w-4xl xl:max-w-5xl">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={faq.question}
            className="rounded-[20px] border border-zinc-200/80 bg-white shadow-xs dark:border-white/[0.08] dark:bg-[#111218]/90 transition-all"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="flex w-full items-center justify-between p-5 text-left font-display font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <span>{faq.question}</span>
              <span className="ml-4 shrink-0 text-zinc-400 dark:text-zinc-500 font-mono text-lg">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-zinc-100 dark:border-white/[0.08] px-5 pb-5 pt-3.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
