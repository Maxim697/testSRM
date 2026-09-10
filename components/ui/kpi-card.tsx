import { Card } from "@/components/ui/card";
import { Typewriter } from "@/components/ui/typewriter";
import { cn } from "@/lib/utils";

type KpiStatus = "positive" | "negative" | "warning" | "info" | "neutral";

const STATUS_COLOR_VAR: Record<KpiStatus, string> = {
  positive: "var(--color-positive)",
  negative: "var(--color-negative)",
  warning: "var(--color-warning)",
  info: "var(--info)",
  // A KPI with no inherent good/bad direction (a plain count) — a muted
  // blue-gray bar (#5d6d84 in dark), never the section accent. Blue on a
  // KPI bar would read as "this means something" when it doesn't.
  neutral: "var(--color-text-muted)",
};

const DELTA_CLASSES: Record<"up" | "down" | "flat", string> = {
  up: "text-positive",
  down: "text-negative",
  flat: "text-text-muted",
};

export function KpiCard({
  label,
  value,
  delta,
  status = "neutral",
  size = "md",
  className,
}: {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  status?: KpiStatus;
  size?: "md" | "lg";
  className?: string;
}) {
  const colorVar = STATUS_COLOR_VAR[status];

  return (
    <Card
      className={cn("relative overflow-hidden pl-4", className)}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${colorVar} 6%, var(--color-surface-2)), var(--color-surface-2) 65%)`,
      }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full" style={{ background: colorVar }} />
      <div className="field-label">{label}</div>
      <Typewriter
        key={value}
        text={value}
        className={cn(
          "mt-1.5 block font-semibold tabular-nums",
          // The two headline KPIs (size="lg") are the most important values
          // on the page — white, not phosphor green, per the palette spec.
          size === "lg" ? "text-2xl text-emphasis" : "text-xl text-text-primary",
        )}
      />
      {delta && (
        <div className={cn("mt-1.5 text-sm tabular-nums", DELTA_CLASSES[delta.direction])}>
          {delta.direction === "up" && "▲ "}
          {delta.direction === "down" && "▼ "}
          {delta.value}
        </div>
      )}
    </Card>
  );
}
