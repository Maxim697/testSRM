import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "amber" | "red" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: "term-pulse text-positive [--pulse-color:var(--positive)] [--pulse-duration:3s]",
  amber: "term-pulse text-warning [--pulse-color:var(--warning)] [--pulse-duration:2.4s]",
  red: "term-pulse text-negative [--pulse-color:var(--negative)] [--pulse-duration:1.6s]",
  neutral: "text-text-secondary",
};

/** Status text in brackets, uppercase, in the status color — no chip, no
 * background, no rounding: [ACTIVE], [PENDING], [OVERDUE]. */
export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap text-xs font-medium uppercase tracking-wide",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      [{children}]
    </span>
  );
}
