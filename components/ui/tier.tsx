import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TierVariant = "gold" | "silver" | "bronze";

const VARIANT_CLASSES: Record<TierVariant, string> = {
  gold: "text-tier-gold",
  silver: "text-tier-silver",
  bronze: "text-tier-bronze",
};

const VARIANT_LABELS: Record<TierVariant, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

/** Tier text in brackets, uppercase, in its own tier color — no chip. */
export function Tier({
  variant,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant: TierVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-semibold uppercase tracking-wide",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      [{children ?? VARIANT_LABELS[variant]}]
    </span>
  );
}
