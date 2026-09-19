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
      className="flex flex-1 flex-col items-center px-6 py-16 sm:py-20 lg:py-28"
    >
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <Badge variant="accent">AI-powered chatbots for your product</Badge>

        <h1
          id="hero-heading"
          className="mt-5 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
        >
          Build and launch AI chatbots for your organization
        </h1>

        <p className="mt-5 max-w-lg text-base text-muted-foreground text-balance sm:text-lg">
          Configure a chatbot, connect your knowledge sources, and publish it
          to your product &mdash; all from one dashboard.
        </p>

        <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/register"
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            Get started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            Log in
          </Link>
        </div>
      </div>

      <h2 className="sr-only">Product preview</h2>
      <Card className="mt-16 w-full max-w-lg gap-0 p-0 text-left shadow-md">
        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
            >
              AI
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Support Bot
              </p>
              <p className="text-xs text-muted-foreground">
                Uses your connected knowledge sources
              </p>
            </div>
          </div>
          <Badge variant="success" className="shrink-0">
            Active
          </Badge>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 px-5 py-5">
          <p className="max-w-[85%] rounded-lg rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-foreground">
            Hi! I can help using the docs, help pages, and files you connect.
            What do you need help with?
          </p>
          <p className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            How do I reset a customer&apos;s password?
          </p>
        </CardContent>

        <CardFooter className="gap-2 border-t border-border px-5 py-4">
          <Input
            disabled
            placeholder="Ask anything…"
            aria-label="Chat message (preview only)"
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
        </CardFooter>
      </Card>
    </section>
  );
}
