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
    <div className="max-w-4xl mx-auto flex flex-col gap-8 py-4">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Create a New Chatbot
        </h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Choose how you would like to set up your AI assistant. You can let our automated crawler
          index your site immediately or configure every knowledge source and setting manually.
        </p>
      </div>

      {/* Two Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Option A: Instant Bot (Recommended & Visually Prominent) */}
        <div className="relative group rounded-2xl border-2 border-[#0052CC]/70 bg-gradient-to-b from-[#0052cc]/10 via-[#0a0a0a] to-[#0a0a0a] p-6 sm:p-7 shadow-[0_0_24px_rgba(0,82,204,0.15)] flex flex-col justify-between transition-all hover:border-[#0052CC] hover:shadow-[0_0_32px_rgba(0,82,204,0.25)]">
          {/* Recommended Badge */}
          <div className="absolute -top-3 left-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0052CC] text-white shadow-md">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Recommended
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 mt-1">
              <div className="w-12 h-12 rounded-xl bg-[#0052CC]/20 border border-[#0052CC]/40 flex items-center justify-center text-blue-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-mono text-zinc-400">~2 minutes</span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Instant Bot
            </h2>
            <p className="text-sm text-zinc-300 mt-2 font-medium">
              Create a chatbot from your website in just a few steps.
            </p>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Simply enter your website domain. Our automated ingestion crawler reads your public
              documentation and pages, builds the vector knowledge base, and configures an active
              assistant automatically.
            </p>

            {/* Feature Bullets */}
            <div className="mt-5 space-y-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Automated sitemap discovery & crawling</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Zero manual document formatting needed</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Instant ready-to-test widget script</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              onClick={onSelectInstant}
              className="w-full bg-[#0052CC] hover:bg-[#0747A6] text-white font-semibold py-2.5 shadow-md text-sm transition-all"
            >
              Create Instant Bot →
            </Button>
          </div>
        </div>

        {/* Option B: Custom Bot (Accessible manual workflow) */}
        <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6 sm:p-7 shadow-lg flex flex-col justify-between transition-all hover:border-zinc-700">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs font-mono text-zinc-500">Full Control</span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Custom Bot
            </h2>
            <p className="text-sm text-zinc-300 mt-2 font-medium">
              Build a chatbot with your own knowledge sources and customized settings.
            </p>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Step-by-step setup where you define the assistant name, system instructions, LLM provider,
              model temperature, and upload individual PDF files, raw text, or specific URLs.
            </p>

            {/* Feature Bullets */}
            <div className="mt-5 space-y-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                <span>Upload specific PDF, DOCX, or text files</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                <span>Tune model temperature and system prompt</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                <span>Fine-grained knowledge base retrieval settings</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onSelectCustom}
              className="w-full text-zinc-200 hover:text-white font-medium py-2.5 text-sm"
            >
              Create Custom Bot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
