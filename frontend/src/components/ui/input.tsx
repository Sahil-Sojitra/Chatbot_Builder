import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-1.5 text-sm text-foreground transition-colors outline-none",
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

export { Input };
