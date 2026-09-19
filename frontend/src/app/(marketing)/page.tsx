import Link from "next/link";

import { Badge, Input, buttonVariants } from "@/components/ui";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20 sm:py-28">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <Badge variant="accent">AI-powered chatbots for your product</Badge>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
          Build and launch AI chatbots for your organization
        </h1>

        <p className="mt-5 max-w-lg text-lg text-muted-foreground text-balance">
          Configure a chatbot, connect your knowledge base, and publish it to
          your product &mdash; all from one dashboard.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            Get started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Log in
          </Link>
        </div>
      </div>

      <div className="mt-16 w-full max-w-lg rounded-lg border border-border bg-surface text-left shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              AI
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Support Bot
              </p>
              <p className="text-xs text-muted-foreground">
                Trained on your knowledge base
              </p>
            </div>
          </div>
          <Badge variant="success">Active</Badge>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="max-w-[85%] rounded-lg rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-foreground">
            Hi! I can answer questions using your docs, help pages, and files.
            What do you need help with?
          </p>
          <p className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            How do I reset a customer&apos;s password?
          </p>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-5 py-4">
          <Input
            disabled
            placeholder="Ask anything&hellip;"
            aria-label="Chat message"
            className="bg-slate-50"
          />
          <span
            aria-hidden="true"
            className={buttonVariants({
              variant: "default",
              className: "pointer-events-none shrink-0 opacity-60",
            })}
          >
            Send
          </span>
        </div>
      </div>
    </div>
  );
}
