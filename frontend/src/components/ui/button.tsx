import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-600 text-white font-bold border border-[#c2ea30] dark:border-transparent hover:bg-emerald-700 shadow-[0_4px_14px_rgba(200,240,40,0.35)] dark:shadow-[0_4px_14px_rgba(5, 150, 105, 0.25)] hover:shadow-[0_10px_26px_rgba(5, 150, 105, 0.45)] hover:scale-[1.01] active:scale-[0.99]",
        primary:
          "bg-emerald-600 text-white font-bold border border-[#c2ea30] dark:border-transparent hover:bg-emerald-700 shadow-[0_4px_14px_rgba(200,240,40,0.35)] dark:shadow-[0_4px_14px_rgba(5, 150, 105, 0.25)] hover:shadow-[0_10px_26px_rgba(5, 150, 105, 0.45)] hover:scale-[1.01] active:scale-[0.99]",
        accent:
          "bg-[#7A4CFF] text-white font-medium hover:bg-[#6A3CEF] shadow-[0_4px_14px_rgba(122,76,255,0.25)] hover:shadow-[0_10px_26px_rgba(122,76,255,0.45)] hover:scale-[1.01] active:scale-[0.99]",
        secondary:
          "border border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 dark:border-white/10 dark:bg-white/[0.05] dark:text-[#EDEDF0] dark:hover:bg-white/[0.09] dark:hover:border-white/20 active:bg-zinc-200 dark:active:bg-white/[0.12]",
        ghost:
          "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/[0.06] active:bg-zinc-200 dark:active:bg-white/[0.1]",
        outline:
          "border border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/12 dark:bg-transparent dark:text-[#EDEDF0] dark:hover:border-white/25 dark:hover:bg-white/[0.05] dark:hover:text-white",
        destructive:
          "border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 active:bg-rose-500/30",
        link: "text-zinc-600 dark:text-white/70 underline-offset-4 hover:underline hover:text-zinc-900 dark:hover:text-emerald-600 dark:text-emerald-400",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-full",
        sm: "h-8 px-3.5 text-xs rounded-full",
        lg: "h-12 px-7 text-sm font-semibold rounded-full",
        xl: "h-14 px-8 text-base font-semibold rounded-full",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
