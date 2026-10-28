import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 transition-all duration-150 outline-none shadow-xs",
        "placeholder:text-zinc-400 hover:border-zinc-300",
        "focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "aria-invalid:border-rose-500/80 aria-invalid:ring-rose-500/20",
        "dark:border-white/10 dark:bg-[#0E0F15] dark:text-foreground dark:placeholder:text-white/35 dark:hover:border-white/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
