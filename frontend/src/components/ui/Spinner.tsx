import { cn } from "@/lib/utils";

export interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Basic loading indicator. `label` is visually shown and doubles as the accessible status text. */
export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-2 text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
