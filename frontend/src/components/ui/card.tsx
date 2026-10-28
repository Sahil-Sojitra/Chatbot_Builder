import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-3 rounded-[24px] border border-zinc-200/80 bg-white p-6 text-zinc-900 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:border-zinc-300 dark:border-white/[0.08] dark:bg-[#111218]/90 dark:text-card-foreground dark:shadow-[0_20px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:border-white/[0.14]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-white", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-zinc-500 dark:text-[#9A9AA4] leading-relaxed", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center pt-3 border-t border-zinc-100 dark:border-white/[0.06]", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
