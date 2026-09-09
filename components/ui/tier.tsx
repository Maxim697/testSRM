import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TierVariant = "gold" | "silver" | "bronze";

const VARIANT_CLASSES: Record<TierVariant, string> = {
  gold: "bg-tier-gold-bg text-tier-gold",
  silver: "bg-tier-silver-bg text-tier-silver",
  bronze: "bg-tier-bronze-bg text-tier-bronze",
};

const VARIANT_LABELS: Record<TierVariant, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

/** Compact tier pill — same visual language as Badge, its own color set. */
export function Tier({
  variant,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant: TierVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control px-1.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children ?? VARIANT_LABELS[variant]}
    </span>
  );
}
