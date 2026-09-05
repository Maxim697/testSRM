import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiStatus = "positive" | "negative" | "warning" | "neutral";

const STATUS_BAR_CLASSES: Record<KpiStatus, string> = {
  positive: "bg-positive",
  negative: "bg-negative",
  warning: "bg-warning",
  neutral: "bg-border-strong",
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
  status,
  className,
}: {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  status?: KpiStatus;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden pl-4", className)}>
      {status && (
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-1",
            STATUS_BAR_CLASSES[status],
          )}
        />
      )}
      <div className="text-xs text-text-secondary">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums text-text-primary">
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
