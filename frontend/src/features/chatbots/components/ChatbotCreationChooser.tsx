"use client";

interface ChatbotCreationChooserProps {
  onSelectInstant: () => void;
  onSelectCustom: () => void;
}

export function ChatbotCreationChooser({
  onSelectInstant,
  onSelectCustom,
}: ChatbotCreationChooserProps) {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="text-center max-w-lg mx-auto mb-2">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Create a New AI Assistant
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Choose between automated website crawling or full custom knowledge engineering.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Option 1: Instant Bot (Featured) */}
        <div className="relative rounded-2xl border-2 border-emerald-600 dark:border-emerald-500 bg-white dark:bg-[#0E1B15] text-zinc-900 dark:text-white p-7 flex flex-col justify-between shadow-md dark:shadow-xl ring-1 ring-emerald-500/20 transition-all">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-lg font-bold shadow-xs">
                ⚡
              </div>
              <span className="text-xs font-semibold text-white bg-emerald-600 px-3.5 py-1 rounded-full shadow-xs">
                Recommended · ~60s
              </span>
            </div>

            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Website Crawler (Instant)
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 font-medium">
              Automatically index knowledge from your public website.
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-3 leading-relaxed">
              Enter your domain. Our crawler extracts public pages, generates embeddings,
              and prepares an interactive assistant with zero manual formatting.
            </p>

            {/* Feature Bullets */}
            <div className="mt-6 space-y-3 border-t border-zinc-200 dark:border-white/10 pt-5 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Automated sitemap discovery &amp; crawling</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Ready-to-embed floating widget snippet</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Bring your own LLM API key (BYOK)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-zinc-200 dark:border-white/10">
            <button
              type="button"
              onClick={onSelectInstant}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-full text-sm shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              Start with Website URL &rarr;
            </button>
          </div>
        </div>

        {/* Option 2: Custom Bot */}
        <div className="card-studio rounded-2xl p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-white text-lg font-bold shadow-xs">
                🧠
              </div>
              <span className="text-xs font-mono font-medium text-zinc-600 bg-zinc-100 border border-zinc-200 dark:text-zinc-400 dark:bg-white/[0.04] dark:border-white/10 px-3 py-1 rounded-full">
                Custom RAG
              </span>
            </div>

            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Custom Knowledge Studio
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 font-medium">
              3-step setup with direct document uploads &amp; prompts.
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-3 leading-relaxed">
              Upload PDFs, Word docs, CSVs, and configure custom system instructions,
              starter questions, and vector retrieval thresholds manually.
            </p>

            {/* Feature Bullets */}
            <div className="mt-6 space-y-3 border-t border-zinc-200 dark:border-white/[0.08] pt-5 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-2.5">
                <span className="text-zinc-900 dark:text-zinc-300 font-bold">✓</span>
                <span>Direct presigned cloud storage (Backblaze B2 / S3)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-zinc-900 dark:text-zinc-300 font-bold">✓</span>
                <span>Multi-document ingestion &amp; chunk inspection</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-zinc-900 dark:text-zinc-300 font-bold">✓</span>
                <span>Persona presets: Support, Sales, Technical, Legal</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-zinc-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onSelectCustom}
              className="w-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-white font-semibold py-3 rounded-full text-sm transition-all cursor-pointer shadow-xs"
            >
              Configure Custom Bot &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
