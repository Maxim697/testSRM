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

export function Tier({
  variant,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant: TierVariant }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-control px-2 text-xs font-medium leading-none",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {props.children ?? VARIANT_LABELS[variant]}
    </span>
  );
}
