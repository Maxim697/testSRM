import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TierVariant = "gold" | "silver" | "bronze";

const VARIANT_CLASSES: Record<TierVariant, string> = {
  gold: "text-tier-gold border-tier-gold/40",
  silver: "text-tier-silver border-tier-silver/40",
  bronze: "text-tier-bronze border-tier-bronze/40",
};

const VARIANT_GRADIENT: Record<TierVariant, string> = {
  gold: "linear-gradient(135deg, color-mix(in srgb, var(--color-tier-gold) 30%, transparent), color-mix(in srgb, var(--color-tier-gold) 8%, transparent))",
  silver:
    "linear-gradient(135deg, color-mix(in srgb, var(--color-tier-silver) 32%, transparent), color-mix(in srgb, var(--color-tier-silver) 8%, transparent))",
  bronze:
    "linear-gradient(135deg, color-mix(in srgb, var(--color-tier-bronze) 30%, transparent), color-mix(in srgb, var(--color-tier-bronze) 8%, transparent))",
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
        "inline-flex h-5 items-center rounded-control border px-2 text-xs font-semibold leading-none",
        VARIANT_CLASSES[variant],
        className,
      )}
      style={{ background: VARIANT_GRADIENT[variant] }}
      {...props}
    >
      {props.children ?? VARIANT_LABELS[variant]}
    </span>
  );
}
