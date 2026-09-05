import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiStatus = "positive" | "negative" | "warning" | "info" | "neutral";

const STATUS_COLOR_VAR: Record<KpiStatus, string> = {
  positive: "var(--color-positive)",
  negative: "var(--color-negative)",
  warning: "var(--color-warning)",
  info: "var(--info)",
  neutral: "var(--color-border-strong)",
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
  status = "info",
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
        background: `linear-gradient(135deg, color-mix(in srgb, ${colorVar} 10%, var(--color-surface-2)), var(--color-surface-2) 65%)`,
      }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: colorVar }} />
      <div className="text-xs text-text-secondary">{label}</div>
      <div
        className={cn(
          "mt-1.5 font-semibold tabular-nums text-text-primary",
          size === "lg" ? "text-2xl" : "text-xl",
        )}
      >
        {value}
      </div>
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
