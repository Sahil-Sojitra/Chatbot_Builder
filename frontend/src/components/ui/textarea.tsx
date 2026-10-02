import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-sm font-mono text-foreground transition-colors outline-none leading-relaxed",
        "placeholder:text-zinc-500",
        "hover:border-zinc-700",
        "focus-visible:border-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "aria-invalid:border-rose-500/80 aria-invalid:ring-rose-500/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
