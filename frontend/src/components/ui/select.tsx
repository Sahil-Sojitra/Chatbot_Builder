import * as React from "react";

import { cn } from "@/lib/utils";

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-9 w-full rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-1.5 text-sm text-foreground transition-colors outline-none cursor-pointer",
        "hover:border-zinc-700",
        "focus-visible:border-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-zinc-900",
        "aria-invalid:border-rose-500/80 aria-invalid:ring-rose-500/20",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
