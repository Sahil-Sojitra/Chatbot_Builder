import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium w-fit whitespace-nowrap transition-colors border select-none",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-100 text-zinc-800 border-zinc-200 shadow-xs dark:bg-white/[0.06] dark:text-[#EDEDF0] dark:border-white/10",
        primary:
          "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
        lime: "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
        accent:
          "bg-[#7A4CFF]/15 text-[#5B21B6] border-[#7A4CFF]/30 font-semibold dark:text-[#C4B5FD]",
        success:
          "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
        warning:
          "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
        destructive:
          "bg-rose-500/15 text-rose-800 border-rose-500/30 dark:text-rose-300",
        outline:
          "bg-transparent text-zinc-700 border-zinc-300 dark:text-white/70 dark:border-white/12",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
