import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "amber" | "red" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: "bg-positive-bg text-positive",
  amber: "bg-warning-bg text-warning",
  red: "bg-negative-bg text-negative",
  neutral: "bg-surface-3 text-text-secondary",
};

/** Compact status pill: 15%-alpha background in the status color, text in
 * the full color, 6px radius. */
export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-control px-1.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
