import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-40 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 border border-white/20 shadow-xs font-medium",
        accent:
          "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 border border-blue-500/40 shadow-xs font-medium",
        secondary:
          "border border-zinc-800 bg-[#0a0a0a] text-zinc-200 hover:bg-[#171717] hover:text-white hover:border-zinc-700 active:bg-[#222222]",
        ghost:
          "text-zinc-400 hover:text-zinc-100 hover:bg-[#171717] active:bg-[#222222]",
        outline:
          "border border-zinc-800 bg-transparent text-zinc-200 hover:border-zinc-700 hover:bg-[#171717] hover:text-white",
        destructive:
          "border border-red-900/50 bg-red-950/30 text-red-300 hover:bg-red-900/40 active:bg-red-900/60",
        link: "text-zinc-300 underline-offset-4 hover:underline hover:text-white",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5 text-sm font-medium",
        icon: "size-9",
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
