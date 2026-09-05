import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "amber" | "red" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: "bg-positive-bg text-positive border-positive/35",
  amber: "bg-warning-bg text-warning border-warning/35",
  red: "bg-negative-bg text-negative border-negative/35",
  neutral: "bg-surface-3 text-text-secondary border-transparent",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center whitespace-nowrap rounded-control border px-2 text-xs font-medium leading-none",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
