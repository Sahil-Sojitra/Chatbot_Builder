import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap transition-colors border",
  {
    variants: {
      variant: {
        default: "bg-[#111111] text-zinc-300 border-zinc-800",
        primary: "bg-blue-950/40 text-blue-300 border-blue-800/50",
        accent: "bg-zinc-800/60 text-zinc-200 border-zinc-700/60",
        success: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
        warning: "bg-amber-950/40 text-amber-300 border-amber-800/50",
        destructive: "bg-red-950/40 text-red-300 border-red-800/50",
        outline: "bg-transparent text-zinc-400 border-zinc-800",
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
