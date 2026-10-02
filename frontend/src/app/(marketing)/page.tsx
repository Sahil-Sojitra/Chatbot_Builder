import Link from "next/link";

import {
  Badge,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
  buttonVariants,
} from "@/components/ui";

export default function Home() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex flex-1 flex-col items-center px-4 py-16 sm:px-6 sm:py-24 lg:py-28 architect-grid overflow-hidden"
    >
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-1 text-xs font-medium text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Production AI Chatbot & Knowledge Deployment Platform</span>
        </div>

        <h1
          id="hero-heading"
          className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-balance text-white font-sans"
        >
          Build, Train & Embed Intelligent AI Assistants
        </h1>

        <p className="mt-4 max-w-2xl text-base text-zinc-400 text-balance sm:text-lg leading-relaxed font-normal">
          Ground your bots with private documents via vector RAG, configure LLMs (OpenAI, Anthropic, Gemini), and embed an ultra-lightweight client widget in seconds.
        </p>

        <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/register"
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "w-full sm:w-auto text-sm font-medium",
            })}
          >
            Start Building Free &rarr;
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto text-sm font-medium",
            })}
          >
            Sign in to Workspace
          </Link>
        </div>
      </div>

      {/* Hero Architectural Workbench Mockup */}
      <h2 className="sr-only">Product preview</h2>
      <Card className="relative z-10 mt-12 w-full max-w-xl overflow-hidden rounded-[4px] border border-zinc-800 bg-[#0d0d11] p-0 text-left shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-[#121216] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-[2px] bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-200">
              AI
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-100 font-mono">
                customer-support-agent
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">
                MODEL: gpt-4o-mini &middot; TOP_K: 5 &middot; RAG: ACTIVE
              </p>
            </div>
          </div>
          <Badge variant="success" className="shrink-0 text-[10px] font-mono">
            <span className="h-1 w-1 rounded-[1px] bg-emerald-400 animate-pulse" />
            LIVE // READY
          </Badge>
        </div>

        <CardContent className="flex flex-col gap-2.5 px-4 py-4 text-xs font-sans">
          <div className="max-w-[85%] rounded-[3px] border border-zinc-800 bg-[#16161b] p-3 text-zinc-200 leading-relaxed">
            Hi there! I am grounded in your company documentation, product guides, and policies. How can I assist you?
          </div>
          <div className="ml-auto max-w-[85%] rounded-[3px] border border-zinc-700 bg-zinc-800 p-3 text-zinc-100 leading-relaxed font-medium">
            How do I configure custom Backblaze B2 storage buckets for document ingestion?
          </div>
          <div className="max-w-[85%] rounded-[3px] border border-zinc-800 bg-[#16161b] p-3 text-zinc-200 leading-relaxed">
            <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-[2px] px-1.5 py-0.5 w-fit">
              <span className="h-1 w-1 rounded-[1px] bg-emerald-400" />
              RETRIEVED CHUNK #2 // SIMILARITY: 0.91 // source: storage-config.md
            </div>
            Configure B2 by supplying your S3 Endpoint, Region, Key ID, and Bucket Name in Workspace Settings. Direct browser uploads use presigned PUT URLs with SHA-256 integrity verification.
          </div>
        </CardContent>

        <CardFooter className="gap-2 border-t border-zinc-800 bg-[#101014] px-4 py-2.5">
          <Input
            disabled
            placeholder="Ask anything about indexed documents…"
            aria-label="Chat message (preview only)"
            className="text-xs font-mono"
          />
          <span
            aria-hidden="true"
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "shrink-0 cursor-default opacity-80 font-mono",
            })}
          >
            SEND &rarr;
          </span>
        </CardFooter>
      </Card>
    </section>
  );
}
