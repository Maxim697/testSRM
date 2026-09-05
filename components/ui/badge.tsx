import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "amber" | "red" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: "bg-positive-bg text-positive",
  amber: "bg-warning-bg text-warning",
  red: "bg-negative-bg text-negative",
  neutral: "bg-surface-3 text-text-secondary",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center whitespace-nowrap rounded-control px-2 text-xs font-medium leading-none",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
