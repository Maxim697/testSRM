import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "amber" | "red" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: "bg-positive-bg text-positive border-positive-border",
  amber: "bg-warning-bg text-warning border-warning-border",
  red: "bg-negative-bg text-negative border-negative-border",
  neutral: "bg-surface-3 text-text-secondary border-transparent",
};

/** Compact status pill: alpha background in the status color, a matching
 * border at low opacity, text in the full color. */
export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-control border px-1.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
