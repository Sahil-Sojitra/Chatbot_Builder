import { Button } from "@/components/ui";

interface ChatbotCreationChooserProps {
  onSelectInstant: () => void;
  onSelectCustom: () => void;
}

export function ChatbotCreationChooser({
  onSelectInstant,
  onSelectCustom,
}: ChatbotCreationChooserProps) {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 py-4">
      {/* Header */}
      <div className="text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Create a New Chatbot
        </h1>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Select an assistant setup method. You can index your public website automatically
          or build a customized assistant with granular prompt and source control.
        </p>
      </div>

      {/* Two Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Option 1: Instant Bot */}
        <div className="rounded-xl border border-zinc-700/80 bg-[#0d0d10] p-6 flex flex-col justify-between transition-colors hover:border-zinc-600">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Recommended · ~1 min
              </span>
            </div>

            <h2 className="text-base font-semibold text-white tracking-tight">
              Website Crawler (Instant)
            </h2>
            <p className="text-xs text-zinc-300 mt-1 font-medium">
              Automatically index knowledge from your public website.
            </p>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Enter your domain. Our crawler extracts your public pages, generates embeddings,
              and prepares an interactive assistant with zero manual formatting.
            </p>

            {/* Feature Bullets */}
            <div className="mt-5 space-y-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Automated sitemap discovery &amp; indexing</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Ready-to-embed floating widget snippet</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Bring your own LLM API key</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onSelectInstant}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-medium py-2 rounded-md text-xs transition-colors cursor-pointer"
            >
              Start with Website URL &rarr;
            </button>
          </div>
        </div>

        {/* Option 2: Custom Bot */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d10] p-6 flex flex-col justify-between transition-colors hover:border-zinc-700">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <span className="text-[11px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                Advanced
              </span>
            </div>

            <h2 className="text-base font-semibold text-white tracking-tight">
              Custom RAG Assistant
            </h2>
            <p className="text-xs text-zinc-300 mt-1 font-medium">
              Granular control over knowledge sources and prompts.
            </p>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Step-by-step setup where you define custom system personas, temperature,
              and connect multiple file uploads (PDF, TXT), raw text snippets, or selective URLs.
            </p>

            {/* Feature Bullets */}
            <div className="mt-5 space-y-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Upload PDF and text documentation</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Full system prompt &amp; persona customization</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Fine-tune similarity thresholds &amp; top-K</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onSelectCustom}
              className="w-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium py-2 rounded-md text-xs transition-colors cursor-pointer"
            >
              Configure Custom Bot &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
