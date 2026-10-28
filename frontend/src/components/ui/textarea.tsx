import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[90px] w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 transition-all duration-150 outline-none resize-y shadow-xs",
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

export { Textarea };
